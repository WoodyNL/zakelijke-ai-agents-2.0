import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Eye, AlertTriangle, Check, Megaphone } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import {
  bewaarCampagne,
  haalCampagnes,
  maakVoorbeeld,
  telDoelgroep,
  verwijderCampagne,
} from "@/lib/campagne.functions";

export const Route = createFileRoute("/_authenticated/campagnes")({
  head: () => ({
    meta: [
      { title: "Campagnes — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Stel in wat er verstuurd wordt, en in welk tempo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CampagnesPagina,
});

type Campagne = {
  id: string;
  naam: string;
  herkomst: "oud_klant" | "koud";
  verzendwijze: "concept" | "direct";
  doelgroep?: "alles" | "binnen_gebied" | "buiten_gebied";
  afzender_naam: string | null;
  afzender_email: string | null;
  antwoord_naar: string | null;
  aanbod: string | null;
  ondertekening: string | null;
  dagmaximum: number;
  actief: boolean;
};

type Voorbeeld = {
  onderwerp: string;
  tekst: string;
  voor: { naam: string | null; bedrijf: string | null; plaats: string | null; herkomst: string };
  kennisItems: number;
};

const veld =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-ink outline-none transition placeholder:text-ink/30 focus:border-violet/55 focus:ring-2 focus:ring-violet/25";

type Formulier = {
  naam: string;
  herkomst: "oud_klant" | "koud";
  verzendwijze: "concept" | "direct";
  doelgroep: "alles" | "binnen_gebied" | "buiten_gebied";
  afzenderNaam: string;
  afzenderEmail: string;
  antwoordNaar: string;
  aanbod: string;
  ondertekening: string;
  dagmaximum: string;
  actief: boolean;
};

const leeg: Formulier = {
  naam: "",
  herkomst: "oud_klant",
  verzendwijze: "concept",
  doelgroep: "alles",
  afzenderNaam: "",
  afzenderEmail: "",
  antwoordNaar: "",
  aanbod: "",
  ondertekening: "",
  dagmaximum: "10",
  actief: false,
};

function CampagnesPagina() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const lijstFn = useServerFn(haalCampagnes);
  const bewaarFn = useServerFn(bewaarCampagne);
  const voorbeeldFn = useServerFn(maakVoorbeeld);
  const telFn = useServerFn(telDoelgroep);
  const verwijderFn = useServerFn(verwijderCampagne);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const agents = (agentsQuery.data ?? []) as Array<{ id: string; name: string }>;
  const agentId = agents[0]?.id ?? null;

  const campagnesQuery = useQuery({
    queryKey: ["campagnes", agentId],
    queryFn: () => lijstFn({ data: { agentId: agentId! } }) as Promise<Campagne[]>,
    enabled: agentId !== null,
  });

  const [v, zetV] = useState(leeg);

  /**
   * Het getal dat de twee keuzelijsten hierboven concreet maakt.
   *
   * Het telt op de server, met precies dezelfde filters als het klaarzetten,
   * zodat hier nooit een ander aantal staat dan er daadwerkelijk weggaat.
   */
  const bereikQuery = useQuery({
    queryKey: ["doelgroep", agentId, v.herkomst, v.doelgroep],
    queryFn: () =>
      telFn({
        data: { agentId: agentId!, herkomst: v.herkomst, doelgroep: v.doelgroep },
      }) as Promise<{ aantal: number }>,
    enabled: agentId !== null,
  });
  const bereik = bereikQuery.data?.aantal ?? null;

  const [bewerktId, zetBewerktId] = useState<string | null>(null);
  const [bezig, zetBezig] = useState(false);
  const [melding, zetMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [voorbeeld, zetVoorbeeld] = useState<Voorbeeld | null>(null);
  const [voorbeeldFout, zetVoorbeeldFout] = useState<string | null>(null);
  const [voorbeeldBezig, zetVoorbeeldBezig] = useState(false);

  const zet = (k: keyof Formulier) => (w: string | boolean) => zetV({ ...v, [k]: w });

  function bewerk(c: Campagne) {
    zetBewerktId(c.id);
    zetVoorbeeld(null);
    zetMelding(null);
    zetV({
      naam: c.naam,
      herkomst: c.herkomst,
      verzendwijze: c.verzendwijze,
      doelgroep: c.doelgroep ?? "alles",
      afzenderNaam: c.afzender_naam ?? "",
      afzenderEmail: c.afzender_email ?? "",
      antwoordNaar: c.antwoord_naar ?? "",
      aanbod: c.aanbod ?? "",
      ondertekening: c.ondertekening ?? "",
      dagmaximum: String(c.dagmaximum),
      actief: c.actief,
    });
  }

  async function opslaan() {
    if (!agentId) return;
    zetBezig(true);
    zetMelding(null);
    try {
      const r = await bewaarFn({
        data: {
          ...(bewerktId ? { id: bewerktId } : {}),
          agentId,
          naam: v.naam.trim(),
          herkomst: v.herkomst,
          verzendwijze: v.verzendwijze,
          doelgroep: v.doelgroep,
          afzenderNaam: v.afzenderNaam.trim() || null,
          afzenderEmail: v.afzenderEmail.trim() || null,
          antwoordNaar: v.antwoordNaar.trim() || null,
          aanbod: v.aanbod.trim() || null,
          ondertekening: v.ondertekening.trim() || null,
          dagmaximum: perDag,
          actief: v.actief,
        },
      });
      zetMelding({ ok: true, tekst: r.melding });
      await qc.invalidateQueries({ queryKey: ["campagnes", agentId] });
      if (!bewerktId) {
        zetV(leeg);
        zetVoorbeeld(null);
      }
    } catch (e) {
      zetMelding({ ok: false, tekst: e instanceof Error ? e.message : "Opslaan mislukt." });
    } finally {
      zetBezig(false);
    }
  }

  /**
   * Een campagne weggooien.
   *
   * De knop staat alleen bij een campagne die je hebt opengeklikt, niet in de
   * lijst. Een verwijderknop naast elke regel is één misklik van een campagne
   * verwijderd; hem eerst moeten kiezen is precies genoeg drempel.
   */
  async function verwijder() {
    if (!bewerktId) return;
    const zeker = window.confirm(
      `Campagne "${v.naam}" verwijderen?\n\n` +
        "Klaargezette berichten die nog niet zijn verstuurd gaan mee. " +
        "Dit kan niet ongedaan worden gemaakt.",
    );
    if (!zeker) return;

    zetBezig(true);
    zetMelding(null);
    try {
      const r = await verwijderFn({ data: { campagneId: bewerktId } });
      zetBewerktId(null);
      zetV(leeg);
      zetVoorbeeld(null);
      zetMelding({ ok: true, tekst: `Campagne "${r.naam}" verwijderd.` });
      await qc.invalidateQueries({ queryKey: ["campagnes", agentId] });
    } catch (e) {
      zetMelding({ ok: false, tekst: e instanceof Error ? e.message : "Verwijderen mislukt." });
    } finally {
      zetBezig(false);
    }
  }

  async function toonVoorbeeld() {
    if (!agentId) return;
    zetVoorbeeldBezig(true);
    zetVoorbeeld(null);
    zetVoorbeeldFout(null);
    try {
      zetVoorbeeld(
        (await voorbeeldFn({
          data: {
            agentId,
            herkomst: v.herkomst,
            aanbod: v.aanbod.trim(),
            ondertekening: v.ondertekening.trim(),
          },
        })) as Voorbeeld,
      );
    } catch (e) {
      zetVoorbeeldFout(e instanceof Error ? e.message : "Opstellen mislukt.");
    } finally {
      zetVoorbeeldBezig(false);
    }
  }

  const kanVoorbeeld = v.aanbod.trim().length > 5 && v.ondertekening.trim().length > 1;


  // Een leeg of onmogelijk dagmaximum werd stilzwijgend 10. Dat is precies het
  // soort stille correctie waardoor je denkt dat je iets hebt ingesteld terwijl
  // er iets anders staat — en hier bepaalt dat getal hoeveel post er per dag
  // de deur uit gaat.
  const perDag = Number(v.dagmaximum);
  const dagmaximumFout =
    v.dagmaximum.trim() === "" || !Number.isInteger(perDag) || perDag < 1 || perDag > 500;
  const campagnes = campagnesQuery.data ?? [];

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header>
          <h1 className="font-display text-[22px] font-bold text-brand">Campagnes</h1>
          <p className="mt-1.5 max-w-[68ch] text-[13px]/[1.7] text-ink/60">
            Wat er verstuurd wordt, aan wie en in welk tempo. Bekijk altijd eerst een
            voorbeeldbericht — verstuurde post komt niet terug.
          </p>
        </header>

        {agentId === null ? (
          <div className="card-glass-lg rounded-3xl p-6">
            <p className="text-[13px]/[1.7] text-ink/60">
              Er is nog geen agent aan dit account gekoppeld.
            </p>
          </div>
        ) : (
          <>
            {campagnes.length > 0 && (
              <section className="card-glass-lg rounded-3xl p-5 sm:p-6">
                <h2 className="font-display text-[16px] font-semibold text-brand">
                  Bestaande campagnes
                </h2>
                <ul className="mt-4 grid gap-2">
                  {campagnes.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => bewerk(c)}
                        className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left transition ${
                          bewerktId === c.id
                            ? "border-violet/45 bg-violet/[0.08]"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                        }`}
                      >
                        <span>
                          <span className="text-[13px] font-semibold text-brand">{c.naam}</span>
                          <span className="ml-2 text-[11.5px] text-ink/45">
                            {c.herkomst === "oud_klant" ? "oud-klanten" : "koud"} ·{" "}
                            {c.doelgroep === "binnen_gebied"
                              ? "binnen gebied"
                              : c.doelgroep === "buiten_gebied"
                                ? "buiten gebied"
                                : "iedereen"} ·{" "}
                            {c.dagmaximum} per dag ·{" "}
                            {c.verzendwijze === "direct" ? "verstuurt zelf" : "zet concepten klaar"}
                          </span>
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10.5px] font-medium ${
                            c.actief
                              ? "bg-emerald-400/15 text-emerald-300"
                              : "bg-white/8 text-ink/50"
                          }`}
                        >
                          {c.actief ? "actief" : "uit"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="card-glass-lg rounded-3xl p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-[16px] font-semibold text-brand">
                  {bewerktId ? "Campagne aanpassen" : "Nieuwe campagne"}
                </h2>
                {bewerktId && (
                  <button
                    type="button"
                    onClick={() => {
                      zetBewerktId(null);
                      zetV(leeg);
                      zetVoorbeeld(null);
                      zetMelding(null);
                    }}
                    className="text-[12px] text-ink/50 underline underline-offset-2 hover:text-ink/80"
                  >
                    nieuwe beginnen
                  </button>
                )}
              </div>

              {/* Wat een campagne is, in één zin. Zonder dit lijkt "Naam" een
                  veld waar de naam van de ontvanger in moet, en dat is precies
                  omgekeerd aan wat er gebeurt. */}
              <p className="mt-1.5 max-w-[66ch] text-[12.5px]/[1.65] text-ink/55">
                Eén reeks berichten aan één groep. Elk contact krijgt zijn eigen bericht, met zijn
                eigen naam en zijn eigen zaak erin — je schrijft hier dus geen tekst, maar de
                afspraken waaronder die berichten worden opgesteld.
              </p>

              <div className="mt-4 grid gap-3">
                <Veld
                  label="Naam van deze campagne"
                  hint="Hoe jij hem noemt in dit scherm. De ontvanger ziet deze naam nooit."
                >
                  <input
                    className={veld}
                    placeholder="bijv. Oud-klanten najaar"
                    value={v.naam}
                    onChange={(e) => zet("naam")(e.target.value)}
                  />
                </Veld>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Veld label="Welke groep?" hint="Bepaalt de toon van het eerste bericht">
                    <select
                      className={veld}
                      value={v.herkomst}
                      onChange={(e) => zet("herkomst")(e.target.value)}
                    >
                      <option value="oud_klant" className="bg-[#12121a]">
                        Oud-klanten — hebben eerder besteld
                      </option>
                      <option value="koud" className="bg-[#12121a]">
                        Koud — nog nooit contact gehad
                      </option>
                    </select>
                  </Veld>
                  <Veld
                    label="Per dag"
                    hint={
                      dagmaximumFout
                        ? "Vul een aantal in tussen 1 en 500"
                        : "Rustig beginnen beschermt je verzenddomein"
                    }
                  >
                    <input
                      className={`${veld} ${dagmaximumFout ? "border-amber-400/60" : ""}`}
                      inputMode="numeric"
                      value={v.dagmaximum}
                      onChange={(e) => zet("dagmaximum")(e.target.value)}
                    />
                  </Veld>
                </div>

                {/* Wie op de vrijdagroute ligt kan een bezorging krijgen, wie
                    daarbuiten woont niet. Die twee door elkaar aanschrijven
                    levert beloftes op die niemand kan waarmaken. */}
                <Veld
                  label="Beperken tot het bezorggebied?"
                  hint="De chauffeur rijdt maar één route; daarbuiten kun je geen bezorging toezeggen"
                >
                  <select
                    className={veld}
                    value={v.doelgroep}
                    onChange={(e) => zet("doelgroep")(e.target.value)}
                  >
                    <option value="alles" className="bg-[#12121a]">
                      Iedereen in de lijst
                    </option>
                    <option value="binnen_gebied" className="bg-[#12121a]">
                      Alleen binnen het bezorggebied — de chauffeur kan langskomen
                    </option>
                    <option value="buiten_gebied" className="bg-[#12121a]">
                      Alleen buiten het bezorggebied — voor een ander aanbod
                    </option>
                  </select>
                </Veld>

                {/* Het getal dat de twee keuzelijsten hierboven concreet maakt,
                    en de laatste controle vóór het klaarzetten. */}
                {bereik !== null && (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[12.5px]/[1.65] text-ink/70">
                    Deze instellingen raken{" "}
                    <strong className="font-display font-bold text-brand tabular-nums">
                      {bereik}
                    </strong>{" "}
                    {bereik === 1 ? "contact" : "contacten"}
                    {v.doelgroep === "binnen_gebied" && " waar de chauffeur kan komen"}
                    {v.doelgroep === "buiten_gebied" && " buiten het bezorggebied"}.
                    {bereik === 0 && (
                      <span className="block text-amber-300/80">
                        Met deze selectie gaat er niets weg. Klopt de groep hierboven?
                      </span>
                    )}
                    {bereik > 0 && (
                      <span className="block text-ink/45">
                        Bij {v.dagmaximum || "?"} per dag zijn dat{" "}
                        {Math.ceil(bereik / Math.max(Number(v.dagmaximum) || 1, 1))} werkdagen.
                      </span>
                    )}
                  </p>
                )}


                <Veld
                  label="Wat bied je aan?"
                  hint="Eén zin, in je eigen woorden. Hier draait het hele bericht om."
                >
                  <textarea
                    className={`${veld} min-h-[68px]`}
                    placeholder="bijv. Een proefpakket kip, dat onze eigen chauffeur op een vrijdag langsbrengt."
                    value={v.aanbod}
                    onChange={(e) => zet("aanbod")(e.target.value)}
                  />
                </Veld>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Veld label="Ondertekening" hint="Zoals het onder de mail komt te staan">
                    <input
                      className={veld}
                      placeholder="bijv. Frank Ransijn, FJ Snacks"
                      value={v.ondertekening}
                      onChange={(e) => zet("ondertekening")(e.target.value)}
                    />
                  </Veld>
                  <Veld label="Afzenderadres" hint="Waarvandaan de mail verstuurd wordt">
                    <input
                      className={veld}
                      placeholder="verkoop@fjsnacks.nl"
                      value={v.afzenderEmail}
                      onChange={(e) => zet("afzenderEmail")(e.target.value)}
                    />
                  </Veld>
                </div>

                <Veld
                  label="Antwoorden komen binnen op"
                  hint="Het getagde adres, zodat antwoorden ook bij ons aankomen"
                >
                  <input
                    className={veld}
                    placeholder="verkoop+agent@fjsnacks.nl"
                    value={v.antwoordNaar}
                    onChange={(e) => zet("antwoordNaar")(e.target.value)}
                  />
                </Veld>

                <Veld label="Verzendwijze" hint="Je kunt dit later omzetten">
                  <select
                    className={veld}
                    value={v.verzendwijze}
                    onChange={(e) => zet("verzendwijze")(e.target.value)}
                  >
                    <option value="concept" className="bg-[#12121a]">
                      Concepten klaarzetten — jij drukt op verzenden
                    </option>
                    <option value="direct" className="bg-[#12121a]">
                      Zelf versturen — de agent stuurt door zonder tussenkomst
                    </option>
                  </select>
                </Veld>

                <label className="inline-flex items-center gap-2 text-[12.5px] text-ink/75">
                  <input
                    type="checkbox"
                    checked={v.actief}
                    onChange={(e) => zet("actief")(e.target.checked)}
                    className="accent-violet"
                  />
                  campagne actief
                </label>
              </div>

              {/* Voorbeeld en opslaan staan naast elkaar, met de uitkomst
                  ernaast. Een bevestiging elders op de pagina is hier eerder
                  twee keer misgegaan. */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={toonVoorbeeld}
                  disabled={!kanVoorbeeld || voorbeeldBezig}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet/35 bg-violet/[0.10] px-4 py-2 text-[13px] font-semibold text-violet transition hover:bg-violet/20 disabled:opacity-40"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  {voorbeeldBezig ? "Bezig met opstellen…" : "Voorbeeldbericht"}
                </button>

                <button
                  type="button"
                  onClick={opslaan}
                  disabled={bezig || v.naam.trim() === "" || dagmaximumFout}
                  className="rounded-xl bg-violet px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-violet/90 disabled:opacity-40"
                >
                  {bezig ? "Bezig…" : bewerktId ? "Wijzigingen opslaan" : "Campagne aanmaken"}
                </button>

                {bewerktId && (
                  <button
                    type="button"
                    onClick={verwijder}
                    disabled={bezig}
                    className="rounded-xl border border-destructive/40 px-4 py-2 text-[13px] font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-40"
                  >
                    Verwijderen
                  </button>
                )}

                {melding && (
                  <p
                    className={`inline-flex items-start gap-2 text-[12.5px]/[1.6] ${
                      melding.ok ? "text-ink/80" : "text-rose-300"
                    }`}
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

              {!kanVoorbeeld && (
                <p className="mt-2.5 text-[11.5px] text-ink/40">
                  Vul eerst het aanbod en de ondertekening in; daar wordt het voorbeeld mee
                  opgesteld.
                </p>
              )}

              {voorbeeldFout && (
                <p className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-[12.5px]/[1.65] text-ink/85">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
                  {voorbeeldFout}
                </p>
              )}

              {voorbeeld && (
                <div className="mt-5 rounded-2xl border border-white/12 bg-white/[0.03] p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[11px] font-semibold tracking-wide text-violet uppercase">
                      Voorbeeld
                    </p>
                    <p className="text-[11.5px] text-ink/45">
                      voor {voorbeeld.voor.naam ?? "een contact zonder naam"}
                      {voorbeeld.voor.bedrijf && ` · ${voorbeeld.voor.bedrijf}`}
                      {voorbeeld.voor.plaats && ` · ${voorbeeld.voor.plaats}`}
                    </p>
                  </div>

                  <p className="mt-3 text-[13px] font-semibold text-brand">
                    {voorbeeld.onderwerp}
                  </p>
                  <p className="mt-2 max-w-[74ch] text-[13px]/[1.75] whitespace-pre-wrap text-ink/80">
                    {voorbeeld.tekst}
                  </p>

                  {/* Dit is de zin die ertoe doet. Staat de kennisbank leeg, dan
                      kán het bericht niets concreets zeggen over het bedrijf —
                      en dan hoort dat te blijken vóór er honderd van weggaan. */}
                  <p
                    className={`mt-4 rounded-xl px-3.5 py-2.5 text-[11.5px]/[1.6] ${
                      voorbeeld.kennisItems === 0
                        ? "bg-amber-400/10 text-amber-200"
                        : "bg-white/[0.04] text-ink/50"
                    }`}
                  >
                    {voorbeeld.kennisItems === 0
                      ? "De kennisbank is nog leeg, dus dit bericht kan niets concreets zeggen over je aanbod, prijzen of levering. Vul de kennisbank en bekijk het opnieuw."
                      : `Opgesteld met ${voorbeeld.kennisItems} items uit de kennisbank. Staat er iets in dit bericht wat daar niet in stond, laat het dan weten — dan klopt er iets niet.`}
                  </p>
                </div>
              )}
            </section>

            {campagnes.length === 0 && !bewerktId && (
              <p className="flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[12.5px]/[1.7] text-ink/55">
                <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-ink/35" aria-hidden="true" />
                Er loopt nog geen campagne. Zolang er geen actieve campagne is, verstuurt de agent
                niets.
              </p>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Veld({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-medium text-ink/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10.5px] text-ink/40">{hint}</span>}
    </label>
  );
}
