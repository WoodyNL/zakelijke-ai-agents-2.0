import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Mail, AlertTriangle, Check, Clock, Send } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import {
  bereidCampagneVoor,
  bereidOpvolgingVoor,
  haalBerichten,
  haalCampagnes,
  verstuurCampagne,
  verstuurOpvolging,
} from "@/lib/campagne.functions";

export const Route = createFileRoute("/_authenticated/berichten")({
  head: () => ({
    meta: [
      { title: "Berichten — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Wat er klaarstaat, ingepland is en verstuurd." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BerichtenPagina,
});

type Bericht = {
  id: string;
  stap: number;
  status: string;
  onderwerp: string;
  tekst: string;
  gepland_voor: string | null;
  verzonden_op: string | null;
  fout: string | null;
  outbound_contacts: { naam: string | null; bedrijf: string | null; email: string } | null;
};

type Campagne = { id: string; naam: string; actief: boolean; verzendwijze: string };

const STATUS: Record<string, { label: string; cls: string }> = {
  concept: { label: "klaargezet", cls: "bg-white/8 text-ink/60" },
  gepland: { label: "ingepland", cls: "bg-violet/15 text-violet" },
  verzonden: { label: "verzonden", cls: "bg-emerald-400/15 text-emerald-300" },
  beantwoord: { label: "beantwoord", cls: "bg-sky-400/15 text-sky-300" },
  mislukt: { label: "niet verstuurd", cls: "bg-amber-400/15 text-amber-300" },
};

const moment = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function BerichtenPagina() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const campagnesFn = useServerFn(haalCampagnes);
  const berichtenFn = useServerFn(haalBerichten);
  const bereidFn = useServerFn(bereidCampagneVoor);
  const verstuurFn = useServerFn(verstuurCampagne);
  const opvolgBereidFn = useServerFn(bereidOpvolgingVoor);
  const opvolgVerstuurFn = useServerFn(verstuurOpvolging);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const agentId = ((agentsQuery.data ?? []) as Array<{ id: string }>)[0]?.id ?? null;

  const campagnesQuery = useQuery({
    queryKey: ["campagnes", agentId],
    queryFn: () => campagnesFn({ data: { agentId: agentId! } }) as Promise<Campagne[]>,
    enabled: agentId !== null,
  });
  const berichtenQuery = useQuery({
    queryKey: ["berichten", agentId],
    queryFn: () => berichtenFn({ data: { agentId: agentId! } }) as Promise<Bericht[]>,
    enabled: agentId !== null,
  });

  const campagnes = campagnesQuery.data ?? [];
  const [gekozen, zetGekozen] = useState<string | null>(null);
  const campagneId = gekozen ?? campagnes[0]?.id ?? null;
  const campagne = campagnes.find((c) => c.id === campagneId) ?? null;

  const [bezig, zetBezig] = useState<null | "bereid" | "verstuur" | "opvolg" | "opvolgVerstuur">(
    null,
  );
  const [melding, zetMelding] = useState<{ ok: boolean; tekst: string } | null>(null);

  const berichten = berichtenQuery.data ?? [];
  const concepten = berichten.filter((b) => b.status === "concept" && b.stap === 1);
  const opvolgConcepten = berichten.filter((b) => b.status === "concept" && b.stap === 2);
  // Wie een verstuurd eerste bericht heeft en niet heeft geantwoord, komt in
  // aanmerking voor opvolging. 'beantwoord' valt er dus vanzelf buiten.
  const opTeVolgen = berichten.filter((b) => b.stap === 1 && b.status === "verzonden").length;

  async function bereid() {
    if (!campagneId) return;
    zetBezig("bereid");
    zetMelding(null);
    try {
      const r = await bereidFn({ data: { campagneId, portie: 10 } });
      const delen = [`${r.klaargezet} berichten klaargezet`];
      if (r.resterend > 0) delen.push(`nog ${r.resterend} te gaan`);
      if (r.overgeslagen.length > 0) delen.push(`${r.overgeslagen.length} overgeslagen`);
      zetMelding({ ok: true, tekst: delen.join(", ") + "." });
      await qc.invalidateQueries({ queryKey: ["berichten", agentId] });
    } catch (e) {
      zetMelding({ ok: false, tekst: e instanceof Error ? e.message : "Klaarzetten mislukt." });
    } finally {
      zetBezig(null);
    }
  }

  async function opvolgBereid() {
    if (!campagneId) return;
    zetBezig("opvolg");
    zetMelding(null);
    try {
      const r = await opvolgBereidFn({ data: { campagneId, portie: 10 } });
      const delen = [`${r.klaargezet} opvolgingen klaargezet`];
      if (r.resterend > 0) delen.push(`nog ${r.resterend} te gaan`);
      if (r.overgeslagen.length > 0) delen.push(`${r.overgeslagen.length} overgeslagen`);
      zetMelding({ ok: true, tekst: delen.join(", ") + "." });
      await qc.invalidateQueries({ queryKey: ["berichten", agentId] });
    } catch (e) {
      zetMelding({ ok: false, tekst: e instanceof Error ? e.message : "Klaarzetten mislukt." });
    } finally {
      zetBezig(null);
    }
  }

  async function opvolgVerstuur() {
    if (!campagneId) return;
    const zeker = window.confirm(
      `${opvolgConcepten.length} opvolgingen inplannen?\n\n` +
        "Elk vertrekt een week na de eerste mail aan dat contact. " +
        "Antwoordt iemand alsnog, dan wordt zijn opvolging automatisch ingetrokken.",
    );
    if (!zeker) return;

    zetBezig("opvolgVerstuur");
    zetMelding(null);
    try {
      const r = await opvolgVerstuurFn({ data: { campagneId } });
      const delen = [`${r.ingepland} opvolgingen ingepland`];
      if (r.eerste) delen.push(`eerste op ${moment(r.eerste)}`);
      if (r.mislukt.length > 0) delen.push(`${r.mislukt.length} mislukt`);
      zetMelding({ ok: r.mislukt.length === 0, tekst: delen.join(", ") + "." });
      await qc.invalidateQueries({ queryKey: ["berichten", agentId] });
    } catch (e) {
      zetMelding({ ok: false, tekst: e instanceof Error ? e.message : "Inplannen mislukt." });
    } finally {
      zetBezig(null);
    }
  }

  async function verstuur() {
    if (!campagneId || !campagne) return;
    const zeker = window.confirm(
      `${concepten.length} berichten inplannen voor verzending?\n\n` +
        "Die gaan dan echt naar echte mensen, verspreid over de komende werkdagen. " +
        "Een ingepland bericht kan nog worden ingetrokken, een verzonden bericht niet.",
    );
    if (!zeker) return;

    zetBezig("verstuur");
    zetMelding(null);
    try {
      const r = await verstuurFn({ data: { campagneId } });
      const delen = [`${r.ingepland} berichten ingepland`];
      if (r.eerste) delen.push(`eerste op ${moment(r.eerste)}`);
      if (r.laatste) delen.push(`laatste op ${moment(r.laatste)}`);
      if (r.mislukt.length > 0) delen.push(`${r.mislukt.length} mislukt`);
      zetMelding({ ok: r.mislukt.length === 0, tekst: delen.join(", ") + "." });
      await qc.invalidateQueries({ queryKey: ["berichten", agentId] });
    } catch (e) {
      zetMelding({ ok: false, tekst: e instanceof Error ? e.message : "Inplannen mislukt." });
    } finally {
      zetBezig(null);
    }
  }

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header>
          <h1 className="font-display text-[22px] font-bold text-brand">Berichten</h1>
          <p className="mt-1.5 max-w-[68ch] text-[13px]/[1.7] text-ink/60">
            Eerst klaarzetten, dan lezen, dan pas versturen. Daartussen kun je alles nog
            tegenhouden — daarna niet meer.
          </p>
        </header>

        {campagnes.length === 0 ? (
          <div className="card-glass-lg rounded-3xl p-6">
            <p className="text-[13px]/[1.7] text-ink/60">
              Er is nog geen campagne. Maak er eerst een aan bij Campagnes.
            </p>
          </div>
        ) : (
          <section className="card-glass-lg rounded-3xl p-5 sm:p-6">
            {campagnes.length > 1 && (
              <select
                value={campagneId ?? ""}
                onChange={(e) => zetGekozen(e.target.value)}
                className="mb-4 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-ink outline-none focus:border-violet/55"
              >
                {campagnes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#12121a]">
                    {c.naam}
                  </option>
                ))}
              </select>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={bereid}
                disabled={bezig !== null}
                className="inline-flex items-center gap-2 rounded-xl border border-violet/35 bg-violet/[0.10] px-4 py-2 text-[13px] font-semibold text-violet transition hover:bg-violet/20 disabled:opacity-40"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {bezig === "bereid" ? "Bezig met opstellen…" : "Tien berichten klaarzetten"}
              </button>

              <button
                type="button"
                onClick={verstuur}
                disabled={bezig !== null || concepten.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-violet px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-violet/90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {bezig === "verstuur"
                  ? "Bezig met inplannen…"
                  : `${concepten.length} klaarstaande inplannen`}
              </button>

              {melding && (
                <p
                  className={`inline-flex items-start gap-2 text-[12.5px]/[1.6] ${melding.ok ? "text-ink/80" : "text-rose-300"}`}
                >
                  {melding.ok ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  {melding.tekst}
                </p>
              )}
            </div>

            <p className="mt-3 text-[11.5px]/[1.6] text-ink/45">
              Klaarzetten stuurt niets. Het stelt tien berichten op die je hieronder kunt lezen —
              na de eerste tien weet je of de toon klopt.
            </p>

            {/* De opvolging staat apart, want hij werkt anders: hij geldt alleen
                voor wie al post heeft gehad en niet heeft geantwoord. Wie wél
                antwoordde valt er vanzelf buiten — dat regelt de trigger bij een
                binnengekomen antwoord. */}
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-[11px] font-semibold tracking-wide text-ink/50 uppercase">
                Opvolging
              </p>
              <p className="mt-1.5 max-w-[62ch] text-[12px]/[1.6] text-ink/55">
                {opTeVolgen === 0
                  ? "Zodra er berichten zijn verstuurd, kun je hier de opvolging klaarzetten voor wie niet heeft geantwoord."
                  : `${opTeVolgen} ${opTeVolgen === 1 ? "contact heeft" : "contacten hebben"} een verstuurd bericht zonder antwoord. Elk krijgt zijn opvolging een week na zijn eigen eerste mail.`}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={opvolgBereid}
                  disabled={bezig !== null || opTeVolgen === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3.5 py-2 text-[12.5px] font-semibold text-ink/80 transition hover:bg-white/10 disabled:opacity-40"
                >
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {bezig === "opvolg" ? "Bezig…" : "Tien opvolgingen klaarzetten"}
                </button>

                <button
                  type="button"
                  onClick={opvolgVerstuur}
                  disabled={bezig !== null || opvolgConcepten.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet/35 bg-violet/[0.10] px-3.5 py-2 text-[12.5px] font-semibold text-violet transition hover:bg-violet/20 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {bezig === "opvolgVerstuur"
                    ? "Bezig…"
                    : `${opvolgConcepten.length} opvolgingen inplannen`}
                </button>
              </div>
            </div>
          </section>
        )}

        {berichten.length > 0 && (
          <div className="grid gap-3">
            {berichten.map((b) => {
              const st = STATUS[b.status] ?? { label: b.status, cls: "bg-white/8 text-ink/60" };
              const c = b.outbound_contacts;
              return (
                <article key={b.id} className="card-glass rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-brand">
                        {c?.naam ?? c?.email ?? "onbekend"}
                        {c?.bedrijf && <span className="ml-2 text-ink/50">{c.bedrijf}</span>}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-ink/45">
                        {b.stap === 1 ? "eerste bericht" : `opvolging ${b.stap - 1}`}
                        {b.gepland_voor && (
                          <span className="ml-2 inline-flex items-center gap-1 text-violet">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {moment(b.gepland_voor)}
                          </span>
                        )}
                        {b.verzonden_op && ` · verstuurd ${moment(b.verzonden_op)}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-medium ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  <p className="mt-3 text-[13px] font-medium text-ink/80">{b.onderwerp}</p>
                  <p className="mt-1.5 max-w-[76ch] text-[12.5px]/[1.7] whitespace-pre-wrap text-ink/65">
                    {b.tekst}
                  </p>

                  {b.fout && (
                    <p className="mt-2.5 text-[11.5px] text-amber-300/80">{b.fout}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
