import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Truck,
  Check,
  AlertTriangle,
  PackageCheck,
  Printer,
  Send,
  MapPin,
  Undo2,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import {
  herstelAdres,
  vraagBevestiging,
  haalBezorgingen,
  haalKandidaten,
  planBezorging,
  zetBezorgingStatus,
  zetOpvolging,
} from "@/lib/bezorging.functions";

export const Route = createFileRoute("/_authenticated/bezorgen")({
  head: () => ({
    meta: [
      { title: "Bezorgen — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Welke proefpakketten er op welke vrijdag mee moeten." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BezorgenPagina,
});

type Contactje = { naam: string | null; bedrijf: string | null; plaats: string | null; email: string } | null;
type Bezorging = {
  id: string;
  bezorgdag: string;
  bevestiging?: string;
  adres_eerder?: string | null;
  adres_bron?: string | null;
  adres: string | null;
  status: string;
  notitie: string | null;
  opvolging?: string;
  outbound_contacts: Contactje;
};
type Kandidaat = { contactId: string; contact: Contactje };

/** De eerstvolgende acht vrijdagen. */
function vrijdagen(aantal = 8): string[] {
  const uit: string[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  for (let i = 0; i < aantal; i++) {
    uit.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return uit;
}

const dagTekst = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

function BezorgenPagina() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const lijstFn = useServerFn(haalBezorgingen);
  const kandFn = useServerFn(haalKandidaten);
  const planFn = useServerFn(planBezorging);
  const statusFn = useServerFn(zetBezorgingStatus);
  const opvolgFn = useServerFn(zetOpvolging);
  const bevestigFn = useServerFn(vraagBevestiging);
  const herstelFn = useServerFn(herstelAdres);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const agentId = ((agentsQuery.data ?? []) as Array<{ id: string }>)[0]?.id ?? null;

  const bezorgQuery = useQuery({
    queryKey: ["bezorgingen", agentId],
    queryFn: () => lijstFn({ data: { agentId: agentId! } }) as Promise<Bezorging[]>,
    enabled: agentId !== null,
  });
  const kandQuery = useQuery({
    queryKey: ["kandidaten", agentId],
    queryFn: () => kandFn({ data: { agentId: agentId! } }) as Promise<Kandidaat[]>,
    enabled: agentId !== null,
  });

  const [dag, zetDag] = useState(vrijdagen()[0]!);
  const [bezig, zetBezig] = useState<string | null>(null);
  const [fout, zetFout] = useState<string | null>(null);
  const [gevraagd, zetGevraagd] = useState<{
    dag: string;
    verstuurd: number;
    overgeslagen: Array<{ email: string; reden: string }>;
  } | null>(null);

  const bezorgingen = bezorgQuery.data ?? [];
  const kandidaten = kandQuery.data ?? [];

  const perDag = new Map<string, Bezorging[]>();
  for (const b of bezorgingen) {
    if (b.status === "afgezegd") continue;
    perDag.set(b.bezorgdag, [...(perDag.get(b.bezorgdag) ?? []), b]);
  }

  async function plan(k: Kandidaat) {
    if (!agentId) return;
    zetBezig(k.contactId);
    zetFout(null);
    try {
      await planFn({ data: { agentId, contactId: k.contactId, bezorgdag: dag } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["bezorgingen", agentId] }),
        qc.invalidateQueries({ queryKey: ["kandidaten", agentId] }),
        qc.invalidateQueries({ queryKey: ["trechter", agentId] }),
      ]);
    } catch (e) {
      zetFout(e instanceof Error ? e.message : "Inplannen mislukt.");
    } finally {
      zetBezig(null);
    }
  }

  async function zetStatus(b: Bezorging, status: "bezorgd" | "afgezegd") {
    zetBezig(b.id);
    zetFout(null);
    try {
      await statusFn({ data: { id: b.id, status } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["bezorgingen", agentId] }),
        qc.invalidateQueries({ queryKey: ["trechter", agentId] }),
      ]);
    } catch (e) {
      zetFout(e instanceof Error ? e.message : "Bijwerken mislukt.");
    } finally {
      zetBezig(null);
    }
  }

  const naam = (c: Contactje) => c?.naam ?? c?.bedrijf ?? c?.email ?? "onbekend";

  /**
   * Wat er ná de bezorging met een mens is gebeurd.
   *
   * Dit is het enige stuk van de trechter dat geen software doet, en juist
   * daarom hoort het hier te staan. Een warme klant die niet is gebeld
   * verdwijnt tussen de honderd andere, en dat is de klant die het meeste
   * waard was.
   */
  /**
   * Eén knop per dag, niet per pakket.
   *
   * Acht keer dezelfde vraag stellen is werk dat de software hoort te doen, en
   * het is precies de handeling waarbij je er eentje overslaat.
   */
  async function vraagNa(d: string) {
    if (!agentId) return;
    zetFout(null);
    zetBezig(`bevestig-${d}`);
    try {
      const uit = (await bevestigFn({ data: { agentId, bezorgdag: d } })) as {
        verstuurd: number;
        overgeslagen: Array<{ email: string; reden: string }>;
      };
      zetGevraagd({ dag: d, ...uit });
      await qc.invalidateQueries({ queryKey: ["bezorgingen", agentId] });
    } catch (e) {
      zetFout(e instanceof Error ? e.message : "Versturen mislukt.");
    } finally {
      zetBezig(null);
    }
  }

  async function herstel(b: Bezorging) {
    zetFout(null);
    zetBezig(b.id);
    try {
      await herstelFn({ data: { id: b.id } });
      await qc.invalidateQueries({ queryKey: ["bezorgingen", agentId] });
    } catch (e) {
      zetFout(e instanceof Error ? e.message : "Terugzetten mislukt.");
    } finally {
      zetBezig(null);
    }
  }

  async function zetOpvolgStand(b: Bezorging, stand: string) {
    zetBezig(b.id);
    zetFout(null);
    try {
      await opvolgFn({ data: { id: b.id, opvolging: stand as never } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["bezorgingen", agentId] }),
        qc.invalidateQueries({ queryKey: ["trechter", agentId] }),
      ]);
    } catch (e) {
      zetFout(e instanceof Error ? e.message : "Bijwerken mislukt.");
    } finally {
      zetBezig(null);
    }
  }

  const OPVOLGKNOPPEN: Array<{ stand: string; label: string; cls: string }> = [
    { stand: "gebeld", label: "gebeld", cls: "border-sky-400/30 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20" },
    { stand: "bezocht", label: "bezocht", cls: "border-sky-400/30 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20" },
    { stand: "klant", label: "klant geworden", cls: "border-emerald-400/35 bg-emerald-400/12 text-emerald-300 hover:bg-emerald-400/22" },
    { stand: "geen_interesse", label: "geen interesse", cls: "border-white/12 text-ink/55 hover:bg-white/10" },
  ];

  /**
   * De bevestiging is de sluis, niet een aantekening.
   *
   * Zonder bevestiging gaat het pakket niet mee, dus moet dat hier staan zoals
   * het is — "wacht op antwoord" leest als iets waar je niets mee hoeft, en
   * "gaat niet mee" is wat er werkelijk gebeurt.
   */
  const BEVESTIGINGSTEKST: Record<string, string> = {
    niet_gevraagd: "nog niets gevraagd — gaat niet mee",
    gevraagd: "wacht op antwoord — gaat zo niet mee",
    bevestigd: "bevestigd",
    ander_adres: "bevestigd, ander adres",
    verzet: "wil een andere dag — gaat niet mee",
    afgezegd: "afgezegd",
  };

  const OPVOLGTEKST: Record<string, string> = {
    open: "nog niets mee gedaan",
    navraag_uit: "navraag verstuurd, wacht op antwoord",
    wil_gesprek: "wil een gesprek",
    gebeld: "gebeld",
    bezocht: "bezocht",
    klant: "klant geworden",
    geen_interesse: "geen interesse",
  };

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header>
          <h1 className="font-display text-[22px] font-bold text-brand">Bezorgen</h1>
          <p className="mt-1.5 max-w-[68ch] text-[13px]/[1.7] text-ink/60">
            Welke proefpakketten er op welke vrijdag mee moeten. Alleen vrijdagen — dat is de dag
            dat de chauffeur rijdt, en de agent kan geen andere dag toezeggen.
          </p>
        </header>

        {fout && (
          <p className="flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-[12.5px]/[1.65] text-ink/85">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
            {fout}
          </p>
        )}

        {/* Wie heeft geantwoord maar nog geen bezorging staan. Dat is de lijst
            waar het om draait: een antwoord dat niet op de bus komt, is een
            gesprek dat doodloopt. */}
        <section className="card-glass-lg rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[16px] font-semibold text-brand">
              Wachten op een pakket
            </h2>
            <label className="text-[12px] text-ink/60">
              inplannen op{" "}
              <select
                value={dag}
                onChange={(e) => zetDag(e.target.value)}
                className="ml-1 rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-violet/55"
              >
                {vrijdagen().map((v) => (
                  <option key={v} value={v} className="bg-[#12121a]">
                    {dagTekst(v)} ({(perDag.get(v) ?? []).length})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {kandidaten.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-ink/50">
              Niemand wacht op een pakket. Zodra iemand terugschrijft, verschijnt hij hier.
            </p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {kandidaten.map((k) => (
                <li
                  key={k.contactId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="text-[12.5px]">
                    <span className="font-semibold text-brand">{naam(k.contact)}</span>
                    {k.contact?.bedrijf && k.contact.naam && (
                      <span className="ml-2 text-ink/50">{k.contact.bedrijf}</span>
                    )}
                    {k.contact?.plaats && <span className="ml-2 text-ink/40">{k.contact.plaats}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => plan(k)}
                    disabled={bezig !== null}
                    className="rounded-xl border border-violet/35 bg-violet/[0.10] px-3 py-1.5 text-[12px] font-semibold text-violet transition hover:bg-violet/20 disabled:opacity-40"
                  >
                    {bezig === k.contactId ? "Bezig…" : "Zet op deze vrijdag"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {[...perDag.entries()].map(([d, lijst]) => (
          <section key={d} className="card-glass-lg rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-[16px] font-semibold text-brand">{dagTekst(d)}</h2>
              <span className="flex items-center gap-3">
                {/* Niet hoeveel er gepland staan, maar hoeveel er werkelijk in
                    de bus gaan. Zonder bevestiging gaat een pakket niet mee, en
                    dan is het aantal geplande pakketten een getal dat niets
                    zegt over vrijdag. */}
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink/45">
                  <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                  {(() => {
                    const mee = lijst.filter(
                      (b) => b.bevestiging === "bevestigd" || b.bevestiging === "ander_adres",
                    ).length;
                    return mee === lijst.length
                      ? `${mee} ${mee === 1 ? "pakket" : "pakketten"}`
                      : `${mee} van ${lijst.length} ${lijst.length === 1 ? "pakket" : "pakketten"} gaat mee`;
                  })()}
                </span>
                {/* De chauffeur staat in een bus, niet achter dit scherm. */}
                <Link
                  to="/bezorglijst"
                  search={{ dag: d }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11.5px] font-medium text-ink/75 transition hover:bg-white/10"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  lijst voor de chauffeur
                </Link>
                {/* Woensdag vragen of het vrijdag schikt. Het adres staat
                    voluit in die mail, dus wie verhuisd is corrigeert het
                    vanzelf — je hoeft er niet naar te vragen. */}
                {lijst.some((b) => (b.bevestiging ?? "niet_gevraagd") === "niet_gevraagd") && (
                  <button
                    type="button"
                    onClick={() => vraagNa(d)}
                    disabled={bezig !== null}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet/35 bg-violet/[0.10] px-3 py-1.5 text-[11.5px] font-semibold text-violet transition hover:bg-violet/20 disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    {bezig === `bevestig-${d}`
                      ? "Bezig…"
                      : `vraag of het schikt (${lijst.filter((b) => (b.bevestiging ?? "niet_gevraagd") === "niet_gevraagd").length})`}
                  </button>
                )}
              </span>
            </div>

            {gevraagd?.dag === d && (
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[12.5px]/[1.65] text-ink/70">
                {gevraagd.verstuurd === 0
                  ? "Er ging niets weg."
                  : `${gevraagd.verstuurd} ${gevraagd.verstuurd === 1 ? "vraag" : "vragen"} verstuurd. Antwoorden komen vanzelf binnen en worden hieronder verwerkt.`}
                {gevraagd.overgeslagen.length > 0 && (
                  <span className="mt-1.5 block text-ink/45">
                    Overgeslagen:{" "}
                    {gevraagd.overgeslagen.map((o) => `${o.email} (${o.reden})`).join(", ")}
                  </span>
                )}
              </p>
            )}

            <ul className="mt-4 grid gap-2">
              {lijst.map((b) => {
                const af = b.status === "bezorgd";
                return (
                  <li
                    key={b.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 ${
                      af ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <span className="text-[12.5px]">
                      <span className="font-semibold text-brand">{naam(b.outbound_contacts)}</span>
                      {b.outbound_contacts?.plaats && (
                        <span className="ml-2 text-ink/45">{b.outbound_contacts.plaats}</span>
                      )}
                      {af && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-emerald-300">
                          <PackageCheck className="h-3 w-3" aria-hidden="true" />
                          bezorgd
                        </span>
                      )}
                      {!af &&
                        (() => {
                          const stand = b.bevestiging ?? "niet_gevraagd";
                          const gaatMee = stand === "bevestigd" || stand === "ander_adres";
                          return (
                            <span
                              className={`ml-2 text-[11px] ${
                                gaatMee ? "text-emerald-300" : "text-amber-300/80"
                              }`}
                            >
                              {BEVESTIGINGSTEKST[stand] ?? stand}
                            </span>
                          );
                        })()}

                      {/* Het adres is al bijgewerkt — de chauffeur leest de
                          lijst, niet dit scherm. Maar wát er is veranderd en
                          waarop, staat erbij: een wijziging die je niet kunt
                          terugzien is er een die je niet durft te vertrouwen. */}
                      {b.adres_eerder && (
                        <span className="mt-1.5 block rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-[11.5px]/[1.6] text-ink/70">
                          <span className="flex items-center gap-1.5 font-semibold text-amber-200">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            adres aangepast
                          </span>
                          <span className="mt-1 block text-ink/45 line-through">{b.adres_eerder}</span>
                          <span className="block text-ink/85">{b.adres}</span>
                          {b.adres_bron && (
                            <span className="mt-1 block italic text-ink/50">“{b.adres_bron}”</span>
                          )}
                          <button
                            type="button"
                            onClick={() => herstel(b)}
                            disabled={bezig !== null}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-ink/60 underline decoration-white/25 underline-offset-2 transition hover:text-ink disabled:opacity-40"
                          >
                            <Undo2 className="h-3 w-3" aria-hidden="true" />
                            oude adres terugzetten
                          </button>
                        </span>
                      )}
                    </span>

                    {af ? (
                      /* Bezorgd. Nu komt het stuk dat geen software doet: bellen
                         of langsgaan. Zolang dat niet is vastgelegd, staat er
                         hier dat er niets mee gedaan is — en dat hoort te
                         schuren. */
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-ink/45">
                          {OPVOLGTEKST[b.opvolging ?? "open"] ?? b.opvolging}
                        </span>
                        {b.opvolging !== "klant" &&
                          OPVOLGKNOPPEN.map((k) => (
                            <button
                              key={k.stand}
                              type="button"
                              onClick={() => zetOpvolgStand(b, k.stand)}
                              disabled={bezig !== null || b.opvolging === k.stand}
                              className={`rounded-xl border px-2.5 py-1 text-[11.5px] font-medium transition disabled:opacity-40 ${k.cls}`}
                            >
                              {k.label}
                            </button>
                          ))}
                      </span>
                    ) : (
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => zetStatus(b, "bezorgd")}
                          disabled={bezig !== null}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-40"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          bezorgd
                        </button>
                        <button
                          type="button"
                          onClick={() => zetStatus(b, "afgezegd")}
                          disabled={bezig !== null}
                          className="rounded-xl border border-white/12 px-3 py-1.5 text-[12px] text-ink/60 transition hover:bg-white/10 disabled:opacity-40"
                        >
                          afzeggen
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </DashboardShell>
  );
}
