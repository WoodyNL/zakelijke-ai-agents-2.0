import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getMe } from "@/lib/dashboard.functions";
import { haalToegangslog, type Toegang } from "@/lib/meekijken.functions";
import { haalTeam, nodigTeamlidUit, verwijderTeamlid } from "@/lib/team.functions";
import { supabase } from "@/lib/supabase-browser";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Beheer je account en wijzig je wachtwoord." },
      { property: "og:title", content: "Account — Zakelijke AI Agents klantportaal" },
      { property: "og:description", content: "Beheer je account en wijzig je wachtwoord." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

const inputClass =
  "mt-1.5 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-violet/55/50";

function AccountPage() {
  const me = useServerFn(getMe);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => me() });

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (next.length < 8) {
      setError("Kies een nieuw wachtwoord van minimaal 8 tekens.");
      return;
    }
    if (next !== repeat) {
      setError("De twee nieuwe wachtwoorden zijn niet gelijk.");
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
        current_password: current,
      } as Parameters<typeof supabase.auth.updateUser>[0]);
      if (updateError) throw updateError;
      setInfo("Je wachtwoord is gewijzigd. Gebruik het vanaf nu bij het inloggen.");
      setCurrent("");
      setNext("");
      setRepeat("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      isAdmin={meQuery.data?.isAdmin}
      userName={meQuery.data?.name || meQuery.data?.email}
    >
      <div className="animate-rise">
        <h1 className="font-display text-[24px] font-bold tracking-tight text-brand">Account</h1>
        <p className="mt-1.5 text-[13px] text-ink/55">
          {meQuery.data?.email ? `Ingelogd als ${meQuery.data.email}.` : "Je accountinstellingen."}
        </p>
      </div>

      <div className="card-glass-lg mt-6 max-w-md rounded-3xl p-6">
        <h2 className="font-display text-[16px] font-semibold text-brand">Wachtwoord wijzigen</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-3.5">
          <label className="block text-[12px] font-medium text-ink/70">
            Huidig wachtwoord
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </label>
          <label className="block text-[12px] font-medium text-ink/70">
            Nieuw wachtwoord
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          <label className="block text-[12px] font-medium text-ink/70">
            Herhaal nieuw wachtwoord
            <input
              type="password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </label>

          {error && <p className="text-[12px] text-destructive">{error}</p>}
          {info && <p className="text-[12px] text-brand">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
            style={{ boxShadow: "0 12px 26px -12px oklch(0.2 0.04 285 / 0.8)" }}
          >
            {busy ? "Bezig…" : "Wachtwoord opslaan"}
          </button>
        </form>
      </div>

      <Team />
      <Toegangslog />
    </DashboardShell>
  );
}

/**
 * Wie er bij jou heeft meegekeken. De portaalpagina belooft "geen black box";
 * dat geldt ook voor ons. Moeten we bij een storing kijken, dan staat hier wie,
 * wanneer, waarom en welke schermen.
 */
function Toegangslog() {
  const fn = useServerFn(haalToegangslog);
  const query = useQuery({ queryKey: ["toegangslog"], queryFn: () => fn() });
  const rijen = (query.data ?? []) as Toegang[];

  const tijd = (iso: string) =>
    new Date(iso).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className="card-glass-lg mt-6 max-w-2xl rounded-3xl p-6">
      <h2 className="font-display text-[16px] font-semibold text-brand">Toegangslog</h2>
      <p className="mt-1.5 text-[12.5px]/[1.6] text-ink/55">
        Je gegevens zijn van jou. Kijken wij mee, bijvoorbeeld bij een storing, dan zie je hier wie
        dat deed, wanneer en waarom. We kunnen daarbij alleen lezen, en je kennisbank blijft altijd
        dicht.
      </p>

      {query.isLoading && <p className="mt-4 text-[13px] text-ink/55">Laden…</p>}
      {!query.isLoading && rijen.length === 0 && (
        <p className="mt-4 text-[13px] text-ink/55">Er heeft nog niemand meegekeken.</p>
      )}

      <ul className="mt-4 space-y-2.5">
        {rijen.map((r) => (
          <li key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-ink/90">{r.beheerder}</p>
              <p className="text-[11.5px] text-ink/50">
                {tijd(r.gestart_op)} tot{" "}
                {new Date(r.geeindigd_op).toLocaleTimeString("nl-NL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <p className="mt-1 text-[12.5px] text-ink/70">{r.reden}</p>
            {r.paginas.length > 0 && (
              <p className="mt-1.5 text-[11.5px] text-ink/45">Bekeken: {r.paginas.join(", ")}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Wie er in dit account mag (fase 5). De eigenaar nodigt collega's uit; die
 * zien hetzelfde portaal met dezelfde agents. Een teamlid ziet wie er in het
 * team zit, maar beheert het niet.
 */
function Team() {
  const qc = useQueryClient();
  const fn = useServerFn(haalTeam);
  const uitnodigFn = useServerFn(nodigTeamlidUit);
  const verwijderFn = useServerFn(verwijderTeamlid);
  const query = useQuery({ queryKey: ["team"], queryFn: () => fn() });
  const [nieuw, setNieuw] = useState({ naam: "", email: "" });
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  if (!query.data?.beschikbaar) return null;
  const { leden, isEigenaar } = query.data;

  async function uitnodigen() {
    setBezig(true);
    setMelding(null);
    try {
      await uitnodigFn({ data: nieuw });
      setMelding(`Uitnodiging verstuurd naar ${nieuw.email}.`);
      setNieuw({ naam: "", email: "" });
      await qc.invalidateQueries({ queryKey: ["team"] });
    } catch (err) {
      setMelding(err instanceof Error ? err.message : "Uitnodigen lukte niet");
    } finally {
      setBezig(false);
    }
  }

  async function verwijderen(userId: string, naam: string) {
    if (!window.confirm(`${naam} uit het team halen? Het account verdwijnt daarmee.`)) return;
    setBezig(true);
    setMelding(null);
    try {
      await verwijderFn({ data: { userId } });
      await qc.invalidateQueries({ queryKey: ["team"] });
    } catch (err) {
      setMelding(err instanceof Error ? err.message : "Verwijderen lukte niet");
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="card-glass-lg mt-6 max-w-2xl rounded-3xl p-6">
      <h2 className="font-display text-[16px] font-semibold text-brand">Team</h2>
      <p className="mt-1.5 text-[12.5px]/[1.6] text-ink/55">
        Iedereen hier ziet hetzelfde portaal, met dezelfde agents, kennisbank en resultaten.
      </p>

      <ul className="mt-4 divide-y divide-white/[0.06]">
        {leden.map((l) => (
          <li key={l.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <p className="text-[13px] text-ink/90">{l.naam || l.email}</p>
              <p className="text-[11.5px] text-ink/50">
                {l.email} · {l.eigenaar ? "eigenaar" : "teamlid"}
              </p>
            </div>
            {isEigenaar && !l.eigenaar && (
              <button
                type="button"
                disabled={bezig}
                onClick={() => verwijderen(l.user_id, l.naam || l.email)}
                className="rounded-full border border-destructive/35 px-3 py-1 text-[12px] font-semibold text-destructive disabled:opacity-50"
              >
                Verwijderen
              </button>
            )}
          </li>
        ))}
      </ul>

      {isEigenaar && (
        <div className="mt-4">
          <p className="text-[12px] font-medium text-ink/70">Collega uitnodigen</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className={inputClass.replace("mt-1.5 ", "")}
              placeholder="Naam"
              value={nieuw.naam}
              onChange={(e) => setNieuw({ ...nieuw, naam: e.target.value })}
            />
            <input
              className={inputClass.replace("mt-1.5 ", "")}
              placeholder="E-mail"
              type="email"
              value={nieuw.email}
              onChange={(e) => setNieuw({ ...nieuw, email: e.target.value })}
            />
            <button
              type="button"
              disabled={bezig || !nieuw.naam.trim() || !nieuw.email.includes("@")}
              onClick={uitnodigen}
              className="rounded-full bg-brand px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
            >
              {bezig ? "Bezig\u2026" : "Uitnodigen"}
            </button>
          </div>
          <p className="mt-2 text-[11.5px] text-ink/45">
            Je collega krijgt een mail met een link om een wachtwoord te kiezen.
          </p>
        </div>
      )}
      {melding && <p className="mt-3 text-[12px] text-ink/70">{melding}</p>}
    </section>
  );
}
