import * as React from "react";
import { FileUp, AlertTriangle, Check } from "lucide-react";
import {
  heeftKopregel,
  leesContacten,
  raadKolommen,
  type GelezenContact,
  type Kolomsoort,
  type Overgeslagen,
} from "@/lib/contactimport";

/**
 * Een aangeleverde contactlijst inlezen.
 *
 * Het scherm dwingt één ding af: je ziet wat er gaat gebeuren voordat het
 * gebeurt. De kolommen worden geraden maar staan als keuzelijst op het scherm,
 * de eerste rijen staan eronder zoals ze straks worden opgeslagen, en de
 * overgeslagen regels staan erbij mét reden.
 *
 * Dat is hier geen luxe. Aan het eind van deze lijst gaan er echte mails uit
 * naar echte mensen. Een verkeerd geraden kolom is dan geen schoonheidsfout
 * maar tweehonderd berichten die een slagerij aanspreken alsof het een persoon
 * is.
 */

const KOLOMNAMEN: Record<Kolomsoort, string> = {
  email: "E-mailadres",
  naam: "Naam (volledig)",
  voornaam: "Voornaam",
  achternaam: "Achternaam",
  bedrijf: "Bedrijf",
  plaats: "Plaats",
  adres: "Straat en huisnummer",
  postcode: "Postcode",
  telefoon: "Telefoon",
  herkomst: "Klant of prospect",
  notitie: "Notitie over de zaak",
  prioriteit: "Prioriteit",
  negeren: "— niet gebruiken —",
};

const veldCls =
  "rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-ink outline-none transition focus:border-violet/55 focus:ring-2 focus:ring-violet/25";

async function leesBestand(bestand: File): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const boek = XLSX.read(await bestand.arrayBuffer(), { type: "array", raw: false });
  const naam = boek.SheetNames[0];
  if (!naam) throw new Error("Dit bestand bevat geen werkblad.");
  const blad = boek.Sheets[naam];
  if (!blad) throw new Error("Het eerste werkblad is leeg.");
  const rijen = XLSX.utils.sheet_to_json<string[]>(blad, {
    header: 1,
    defval: "",
    raw: false,
  });
  return rijen.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "")) : []));
}

/** Geplakte tekst: tabs of puntkomma's als scheiding, want dat komt uit Excel. */
function leesTekst(tekst: string): string[][] {
  const regels = tekst.split(/\r?\n/).filter((r) => r.trim() !== "");
  const scheiding = regels[0]?.includes("\t") ? "\t" : regels[0]?.includes(";") ? ";" : ",";
  return regels.map((r) => r.split(scheiding).map((c) => c.trim().replace(/^"|"$/g, "")));
}

export type Importuitkomst = {
  toegevoegd: number;
  bestond_al: number;
  afgemeld_overgeslagen: number;
  totaal_in_lijst: number;
};

export type Aanvuluitkomst = {
  aangevuld: number;
  ongewijzigd: number;
  herkomstGewijzigd: number;
  nietGevonden: number;
  inLijst: number;
};

export function ContactImport({
  onOpslaan,
  onAanvullen,
}: {
  onOpslaan: (
    contacten: GelezenContact[],
    herkomst: "oud_klant" | "koud",
  ) => Promise<Importuitkomst>;
  /** Bestaande contacten bijwerken met wat er nog ontbreekt. */
  onAanvullen: (
    contacten: GelezenContact[],
    herkomst?: "oud_klant" | "koud",
  ) => Promise<Aanvuluitkomst>;
}) {
  const [rijen, zetRijen] = React.useState<string[][]>([]);
  const [kolommen, zetKolommen] = React.useState<Kolomsoort[]>([]);
  const [kopregel, zetKopregel] = React.useState(true);
  const [herkomst, zetHerkomst] = React.useState<"oud_klant" | "koud">("oud_klant");
  const [bestandsnaam, zetBestandsnaam] = React.useState("");
  const [plakken, zetPlakken] = React.useState("");
  const [fout, zetFout] = React.useState<string | null>(null);
  const [bezig, zetBezig] = React.useState(false);
  const [uitkomst, zetUitkomst] = React.useState<Importuitkomst | null>(null);
  const [aanvul, zetAanvul] = React.useState<Aanvuluitkomst | null>(null);
  const [herkomstMee, zetHerkomstMee] = React.useState(false);
  // Een eigen keuze, los van "Wat voor lijst is dit?" hierboven. Die lijst
  // bepaalt wat nieuwe contacten worden; dit bepaalt wat bestaande worden, en
  // dat is niet vanzelfsprekend hetzelfde — je corrigeert juist omdat er eerder
  // iets anders is gekozen.
  const [herkomstNaar, zetHerkomstNaar] = React.useState<"oud_klant" | "koud">("koud");

  const invoer = React.useRef<HTMLInputElement>(null);

  const verwerk = React.useCallback((nieuweRijen: string[][], naam: string) => {
    zetFout(null);
    zetUitkomst(null);
    if (nieuweRijen.length === 0) {
      zetFout("Dit bestand bevat geen rijen.");
      return;
    }
    zetRijen(nieuweRijen);
    zetKolommen(raadKolommen(nieuweRijen));
    zetKopregel(heeftKopregel(nieuweRijen));
    zetBestandsnaam(naam);
  }, []);

  const gelezen = React.useMemo(
    () =>
      rijen.length > 0
        ? leesContacten(rijen, kolommen, kopregel)
        : { contacten: [] as GelezenContact[], overgeslagen: [] as Overgeslagen[] },
    [rijen, kolommen, kopregel],
  );

  const heeftEmail = kolommen.includes("email");

  // Zegt het bestand per rij of iemand klant of prospect was, dan is de
  // keuzelijst hieronder alleen nog een terugval. Dat moet je zien: anders stel
  // je "oud-klanten" in en krijgt de helft toch de koude tekst.
  const perRij = gelezen.contacten.reduce(
    (t, c) => {
      if (c.herkomst === "oud_klant") t.klant++;
      else if (c.herkomst === "koud") t.prospect++;
      return t;
    },
    { klant: 0, prospect: 0 },
  );
  const bestandWeetHet = perRij.klant + perRij.prospect > 0;

  /**
   * Bestaande contacten bijwerken in plaats van nieuwe toevoegen.
   *
   * Nodig omdat een lijst eerder kan zijn ingelezen dan dat er velden voor
   * bestonden. Er wordt alleen ingevuld wat leeg is: een naam die met de hand
   * is verbeterd of een adres dat na een verhuizing is aangepast, mag niet
   * teruggedraaid worden naar wat er in een oud bestand stond.
   */
  async function aanvullen() {
    zetBezig(true);
    zetFout(null);
    zetUitkomst(null);
    zetAanvul(null);
    try {
      zetAanvul(await onAanvullen(gelezen.contacten, herkomstMee ? herkomstNaar : undefined));
      zetRijen([]);
      zetKolommen([]);
      zetBestandsnaam("");
    } catch (e) {
      zetFout(e instanceof Error ? e.message : "Aanvullen is niet gelukt.");
    } finally {
      zetBezig(false);
    }
  }

  async function opslaan() {
    zetBezig(true);
    zetFout(null);
    zetUitkomst(null);
    zetAanvul(null);
    try {
      zetUitkomst(await onOpslaan(gelezen.contacten, herkomst));
      zetRijen([]);
      zetKolommen([]);
      zetBestandsnaam("");
      zetPlakken("");
    } catch (e) {
      zetFout(e instanceof Error ? e.message : "Opslaan is niet gelukt.");
    } finally {
      zetBezig(false);
    }
  }

  return (
    <div className="card-glass-lg rounded-3xl p-5 sm:p-6">
      <h2 className="font-display text-[16px] font-semibold text-brand">Contacten toevoegen</h2>
      <p className="mt-1.5 max-w-[62ch] text-[12.5px]/[1.65] text-ink/60">
        Excel, CSV of geplakt uit een spreadsheet. De kolommen worden geraden; controleer ze
        hieronder voordat je opslaat.
      </p>

      {rijen.length === 0 ? (
        <>
          <div
            className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              const b = e.dataTransfer.files[0];
              if (!b) return;
              try {
                verwerk(await leesBestand(b), b.name);
              } catch (err) {
                zetFout(err instanceof Error ? err.message : "Dit bestand kon ik niet lezen.");
              }
            }}
          >
            <FileUp className="mx-auto h-6 w-6 text-ink/40" aria-hidden="true" />
            <p className="mt-2.5 text-[13px] text-ink/70">
              Sleep een bestand hierheen, of{" "}
              <button
                type="button"
                onClick={() => invoer.current?.click()}
                className="font-semibold text-violet underline underline-offset-2 hover:text-violet/80"
              >
                kies een bestand
              </button>
            </p>
            <p className="mt-1 text-[11px] text-ink/40">.xlsx, .xls of .csv</p>
            <input
              ref={invoer}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={async (e) => {
                const b = e.target.files?.[0];
                if (!b) return;
                try {
                  verwerk(await leesBestand(b), b.name);
                } catch (err) {
                  zetFout(err instanceof Error ? err.message : "Dit bestand kon ik niet lezen.");
                }
                e.target.value = "";
              }}
            />
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-[12px] text-ink/50 hover:text-ink/70">
              Of plak de rijen rechtstreeks
            </summary>
            <textarea
              value={plakken}
              onChange={(e) => zetPlakken(e.target.value)}
              rows={5}
              placeholder={"Bedrijf\tNaam\tE-mail\nSlagerij Van Dam\tPiet\tpiet@vandam.nl"}
              className="mt-2 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 font-mono text-[12px] text-ink outline-none focus:border-violet/55"
            />
            <button
              type="button"
              disabled={!plakken.trim()}
              onClick={() => verwerk(leesTekst(plakken), "geplakte tekst")}
              className="mt-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[12px] text-ink/80 transition hover:bg-white/10 disabled:opacity-40"
            >
              Inlezen
            </button>
          </details>
        </>
      ) : (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12.5px] text-ink/70">
              <span className="text-ink/90">{bestandsnaam}</span> — {rijen.length} regels
            </p>
            <button
              type="button"
              onClick={() => {
                zetRijen([]);
                zetKolommen([]);
                zetBestandsnaam("");
              }}
              className="text-[12px] text-ink/50 underline underline-offset-2 hover:text-ink/80"
            >
              ander bestand kiezen
            </button>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-[12px] text-ink/70">
            <input
              type="checkbox"
              checked={kopregel}
              onChange={(e) => zetKopregel(e.target.checked)}
              className="accent-violet"
            />
            eerste regel is een kopregel
          </label>

          {/* De kolomindeling met een paar echte waarden eronder, zodat je ziet
              waar je naar kijkt in plaats van alleen een kolomnummer. */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-x-1.5 text-left">
              <thead>
                <tr>
                  {kolommen.map((k, i) => (
                    <th key={i} className="pb-1.5">
                      <select
                        value={k}
                        onChange={(e) => {
                          const nieuw = [...kolommen];
                          const gekozen = e.target.value as Kolomsoort;
                          // Een soort kan maar één keer voorkomen; kiest iemand
                          // 'e-mail' voor een tweede kolom, dan laat de eerste los.
                          if (gekozen !== "negeren") {
                            const eerder = nieuw.indexOf(gekozen);
                            if (eerder >= 0 && eerder !== i) nieuw[eerder] = "negeren";
                          }
                          nieuw[i] = gekozen;
                          zetKolommen(nieuw);
                          zetUitkomst(null);
                        }}
                        className={`${veldCls} w-full`}
                      >
                        {(Object.keys(KOLOMNAMEN) as Kolomsoort[]).map((s) => (
                          <option key={s} value={s} className="bg-[#12121a]">
                            {KOLOMNAMEN[s]}
                          </option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rijen.slice(kopregel ? 1 : 0, kopregel ? 4 : 3).map((rij, r) => (
                  <tr key={r}>
                    {kolommen.map((_, i) => (
                      <td
                        key={i}
                        className="max-w-[160px] truncate px-2 py-1 text-[11.5px] text-ink/45"
                      >
                        {rij[i] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!heeftEmail && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[12.5px]/[1.6] text-ink/85">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              Wijs eerst aan welke kolom het e-mailadres bevat. Zonder adres kan er niets worden
              opgeslagen.
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-medium text-ink/70">
                Wat voor lijst is dit?
              </span>
              <select
                value={herkomst}
                onChange={(e) => zetHerkomst(e.target.value as "oud_klant" | "koud")}
                className={`${veldCls} w-full`}
              >
                <option value="oud_klant" className="bg-[#12121a]">
                  Oud-klanten — ze kenden het bedrijf al
                </option>
                <option value="koud" className="bg-[#12121a]">
                  Koud — nog nooit contact gehad
                </option>
              </select>
              <span className="mt-1 block text-[10.5px] text-ink/40">
                {bestandWeetHet
                  ? "Alleen voor rijen die het zelf niet aangeven"
                  : "Bepaalt de toon van het eerste bericht"}
              </span>
            </label>
          </div>

          {bestandWeetHet && (
            <p className="mt-3 rounded-2xl border border-violet/25 bg-violet/[0.06] px-4 py-3 text-[12.5px]/[1.65] text-ink/80">
              Dit bestand geeft per rij aan wat voor relatie het is:{" "}
              <strong className="font-semibold text-brand">{perRij.klant}</strong> oud-klanten en{" "}
              <strong className="font-semibold text-brand">{perRij.prospect}</strong> prospects. Die
              indeling wordt aangehouden — ze krijgen straks een ander eerste bericht.
            </p>
          )}

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[12.5px] text-ink/75">
              <strong className="font-semibold text-brand">{gelezen.contacten.length}</strong>{" "}
              contacten klaar om op te slaan
              {gelezen.overgeslagen.length > 0 && (
                <>
                  {" · "}
                  <span className="text-amber-300">
                    {gelezen.overgeslagen.length} overgeslagen
                  </span>
                </>
              )}
            </p>

            {gelezen.overgeslagen.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11.5px] text-ink/50 hover:text-ink/70">
                  laat zien welke, en waarom
                </summary>
                <ul className="mt-2 grid max-h-44 gap-1 overflow-y-auto">
                  {gelezen.overgeslagen.slice(0, 100).map((o, i) => (
                    <li key={i} className="text-[11.5px]/[1.6] text-ink/50">
                      <span className="text-ink/70">regel {o.rij}</span> — {o.reden}
                      {o.inhoud && <span className="text-ink/35"> · {o.inhoud}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* De knop en de uitkomst staan bij elkaar. Eerder in dit project
              verscheen een bevestiging elders op de pagina, waarna het twee keer
              leek alsof opslaan niet werkte terwijl het wel werkte. */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={opslaan}
              disabled={bezig || gelezen.contacten.length === 0 || !heeftEmail}
              className="rounded-xl bg-violet px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-violet/90 disabled:opacity-40"
            >
              {bezig ? "Bezig met opslaan…" : `${gelezen.contacten.length} contacten opslaan`}
            </button>

            {/* Naast opslaan, niet in plaats van. Dezelfde lijst kan een tweede
                keer nuttig zijn: niet om contacten toe te voegen maar om aan te
                vullen wat er destijds nog niet in paste. */}
            <button
              type="button"
              onClick={aanvullen}
              disabled={bezig || gelezen.contacten.length === 0 || !heeftEmail}
              className="rounded-xl border border-white/12 bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-ink/75 transition hover:bg-white/10 disabled:opacity-40"
            >
              Bestaande aanvullen
            </button>

            {/* Het enige veld dat overschreven mag worden, en alleen op verzoek.
                Het bestaat omdat een lijst met één verkeerde keuze kan worden
                ingelezen — en dan krijgen honderd strandtenten het verhaal over
                een overleden eigenaar die ze nooit hebben gekend. */}
            <label className="inline-flex items-start gap-2 text-[11.5px]/[1.5] text-ink/60">
              <input
                type="checkbox"
                checked={herkomstMee}
                onChange={(e) => zetHerkomstMee(e.target.checked)}
                className="mt-0.5 accent-violet"
              />
              <span>
                bij aanvullen ook de soort relatie zetten op{" "}
                <select
                  value={herkomstNaar}
                  onChange={(e) => zetHerkomstNaar(e.target.value as "oud_klant" | "koud")}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg border border-white/12 bg-white/[0.06] px-1.5 py-0.5 text-[11.5px] font-semibold text-ink/85 outline-none focus:border-violet/55"
                >
                  <option value="koud" className="bg-[#12121a]">
                    koud
                  </option>
                  <option value="oud_klant" className="bg-[#12121a]">
                    oud-klant
                  </option>
                </select>
                <span className="block text-ink/40">
                  overschrijft wat er nu staat, alleen voor de contacten uit dit bestand
                </span>
              </span>
            </label>


            {fout && (
              <p className="inline-flex items-start gap-2 text-[12.5px]/[1.6] text-rose-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {fout}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Buiten het blok hierboven, want dat verdwijnt zodra het gelukt is. Stond
          de melding erbinnen, dan zie je nooit wat er is gebeurd en lijkt het
          alsof er niets gebeurde. Dat is in dit project nu drie keer misgegaan;
          een uitkomst hoort te overleven wat hem heeft veroorzaakt. */}
      {rijen.length === 0 && aanvul && (
        <p className="mt-4 inline-flex items-start gap-2 text-[12.5px]/[1.6] text-ink/80">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          <span>
            {aanvul.aangevuld} contacten aangevuld
            {aanvul.herkomstGewijzigd > 0
              ? `, waarvan ${aanvul.herkomstGewijzigd} op een andere soort relatie gezet`
              : ""}
            {aanvul.ongewijzigd > 0 && `, ${aanvul.ongewijzigd} hadden al alles`}
            {aanvul.nietGevonden > 0 && `, ${aanvul.nietGevonden} stonden er nog niet in`}.
            {aanvul.aangevuld === 0 && aanvul.herkomstGewijzigd === 0 && (
              <span className="block text-ink/50">
                Er viel niets bij te werken. Stond de soort relatie hierboven wel goed?
              </span>
            )}
          </span>
        </p>
      )}

      {rijen.length === 0 && uitkomst && (
        <p className="mt-4 inline-flex items-start gap-2 text-[12.5px]/[1.6] text-ink/80">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          <span>
            {uitkomst.toegevoegd} contacten toegevoegd
            {uitkomst.bestond_al > 0 && `, ${uitkomst.bestond_al} stonden er al`}
            {uitkomst.afgemeld_overgeslagen > 0 &&
              `, ${uitkomst.afgemeld_overgeslagen} afgemeld en overgeslagen`}
            .
          </span>
        </p>
      )}

      {rijen.length === 0 && fout && (
        <p className="mt-4 inline-flex items-start gap-2 text-[12.5px]/[1.6] text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
