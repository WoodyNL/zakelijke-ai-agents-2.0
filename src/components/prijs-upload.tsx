import * as React from "react";
import { FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import {
  alsKennis,
  euroTekst,
  leesPrijzen,
  raadPrijskolommen,
  type Prijsindeling,
  type Prijsregel,
} from "@/lib/prijsimport";

/**
 * Een prijslijst inladen.
 *
 * Apart van de gewone kennisupload, en dat is een bewuste keuze. Die laat een
 * model het document lezen; dat werkt goed voor voorwaarden en uitleg, maar
 * niet voor getallen. Hier wordt elke rij zelf uitgelezen, met vaste regels.
 *
 * Wat het scherm toont is daarom niet het bestand maar de uitkomst: wat er van
 * "€ 8,95" is gemaakt. Dat is het enige wat je kunt controleren, en het is
 * precies wat straks in een verstuurde mail belandt.
 */

const veldCls =
  "rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-violet/55";

const KOLOMNAAM: Record<keyof Prijsindeling, string> = {
  omschrijving: "Omschrijving",
  bedrag: "Prijs",
  eenheid: "Eenheid",
  nummer: "Artikelnummer",
};

async function leesBestand(bestand: File): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const boek = XLSX.read(await bestand.arrayBuffer(), { type: "array", raw: false });
  const naam = boek.SheetNames[0];
  if (!naam) throw new Error("Dit bestand bevat geen werkblad.");
  const blad = boek.Sheets[naam];
  if (!blad) throw new Error("Het eerste werkblad is leeg.");
  return XLSX.utils
    .sheet_to_json<string[]>(blad, { header: 1, defval: "", raw: false })
    .map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "")) : []));
}

export function PrijsUpload({
  onOpslaan,
}: {
  onOpslaan: (
    regels: Array<{ title: string; content: string }>,
  ) => Promise<{ toegevoegd: number; verwijderd: number }>;
}) {
  const [rijen, zetRijen] = React.useState<string[][]>([]);
  const [indeling, zetIndeling] = React.useState<Prijsindeling | null>(null);
  const [kopregel, zetKopregel] = React.useState(true);
  const [bestandsnaam, zetBestandsnaam] = React.useState("");
  const [fout, zetFout] = React.useState<string | null>(null);
  const [bezig, zetBezig] = React.useState(false);
  const [uitkomst, zetUitkomst] = React.useState<{ toegevoegd: number; verwijderd: number } | null>(
    null,
  );
  const invoer = React.useRef<HTMLInputElement>(null);

  const gelezen = React.useMemo(
    () =>
      rijen.length > 0 && indeling
        ? leesPrijzen(rijen, indeling, kopregel)
        : { regels: [] as Prijsregel[], overgeslagen: [] },
    [rijen, indeling, kopregel],
  );

  async function kies(bestand: File) {
    zetFout(null);
    zetUitkomst(null);
    try {
      const nieuwe = await leesBestand(bestand);
      if (nieuwe.length === 0) {
        zetFout("Dit bestand bevat geen rijen.");
        return;
      }
      // Een kopregel bevat zelf geen bedrag. Dat is betrouwbaarder dan bekende
      // woorden herkennen, want koppen kunnen van alles heten.
      const heeftKop = !(nieuwe[0] ?? []).some((c) => /\d/.test(c) && /[.,]\d{2}\b/.test(c));
      zetKopregel(heeftKop);
      zetRijen(nieuwe);
      zetIndeling(raadPrijskolommen(nieuwe, heeftKop));
      zetBestandsnaam(bestand.name);
    } catch (e) {
      zetFout(e instanceof Error ? e.message : "Dit bestand kon ik niet lezen.");
    }
  }

  async function opslaan() {
    zetBezig(true);
    zetFout(null);
    try {
      zetUitkomst(await onOpslaan(gelezen.regels.map(alsKennis)));
      zetRijen([]);
      zetIndeling(null);
      zetBestandsnaam("");
    } catch (e) {
      zetFout(e instanceof Error ? e.message : "Opslaan is niet gelukt.");
    } finally {
      zetBezig(false);
    }
  }

  const zetKolom = (soort: keyof Prijsindeling, kolom: number) => {
    if (!indeling) return;
    const nieuw = { ...indeling };
    // Eén kolom kan maar één ding zijn; kiest iemand hem opnieuw, dan laat het
    // vorige veld los.
    for (const k of Object.keys(nieuw) as Array<keyof Prijsindeling>) {
      if (nieuw[k] === kolom) nieuw[k] = -1;
    }
    nieuw[soort] = kolom;
    zetIndeling(nieuw);
    zetUitkomst(null);
  };

  const kolomkeuzes = Math.max(...rijen.map((r) => r.length), 0);

  return (
    <div className="card-glass-lg rounded-3xl p-5 sm:p-6">
      <h2 className="font-display text-[16px] font-semibold text-brand">Prijslijst inladen</h2>
      <p className="mt-1.5 max-w-[64ch] text-[12.5px]/[1.65] text-ink/60">
        Excel of CSV. De bedragen worden letterlijk overgenomen — hier komt geen model aan te pas,
        zodat de prijzen die je agent noemt altijd kloppen met je lijst.
      </p>

      {rijen.length === 0 ? (
        <>
          <div
            className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const b = e.dataTransfer.files[0];
              if (b) void kies(b);
            }}
          >
            <FileSpreadsheet className="mx-auto h-6 w-6 text-ink/40" aria-hidden="true" />
            <p className="mt-2.5 text-[13px] text-ink/70">
              Sleep je prijslijst hierheen, of{" "}
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
              onChange={(e) => {
                const b = e.target.files?.[0];
                if (b) void kies(b);
                e.target.value = "";
              }}
            />
          </div>

          {uitkomst && (
            <p className="mt-4 inline-flex items-start gap-2 text-[12.5px]/[1.6] text-ink/80">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <span>
                {uitkomst.toegevoegd} prijzen opgeslagen
                {uitkomst.verwijderd > 0 && `, ${uitkomst.verwijderd} oude vervangen`}.
              </span>
            </p>
          )}
        </>
      ) : (
        indeling && (
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] text-ink/70">
                <span className="text-ink/90">{bestandsnaam}</span> — {rijen.length} regels
              </p>
              <button
                type="button"
                onClick={() => {
                  zetRijen([]);
                  zetIndeling(null);
                }}
                className="text-[12px] text-ink/50 underline underline-offset-2 hover:text-ink/80"
              >
                ander bestand
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

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(KOLOMNAAM) as Array<keyof Prijsindeling>).map((soort) => (
                <label key={soort} className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink/60">
                    {KOLOMNAAM[soort]}
                  </span>
                  <select
                    className={`${veldCls} w-full`}
                    value={indeling[soort]}
                    onChange={(e) => zetKolom(soort, Number(e.target.value))}
                  >
                    <option value={-1} className="bg-[#12121a]">
                      — niet gebruiken —
                    </option>
                    {Array.from({ length: kolomkeuzes }, (_, i) => (
                      <option key={i} value={i} className="bg-[#12121a]">
                        {kopregel ? (rijen[0]?.[i] || `kolom ${i + 1}`) : `kolom ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {/* Hier draait het om: niet wat er in het bestand stond, maar wat
                eruit is gelezen. Staat er "€ 8,95" en toont hij € 895,00, dan
                zie je dat hier en niet pas in een verstuurde mail. */}
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
              <table className="w-full min-w-[420px] text-left text-[12.5px]">
                <thead>
                  <tr className="text-[10.5px] tracking-wide text-ink/45 uppercase">
                    <th className="px-4 pt-3 pb-2 font-medium">Zo leest de agent het</th>
                    <th className="px-4 pt-3 pb-2 text-right font-medium">Bedrag</th>
                  </tr>
                </thead>
                <tbody>
                  {gelezen.regels.slice(0, 6).map((r, i) => (
                    <tr key={i} className="border-t border-white/8">
                      <td className="px-4 py-2 text-ink/75">
                        {r.omschrijving}
                        {r.eenheid && <span className="text-ink/45"> · {r.eenheid}</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-brand tabular-nums">
                        {euroTekst(r.bedrag)}
                      </td>
                    </tr>
                  ))}
                  {gelezen.regels.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-ink/45">
                        Nog niets uit te lezen. Wijs hierboven de prijskolom aan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {gelezen.regels.length > 6 && (
                <p className="px-4 pb-3 text-[11px] text-ink/40">
                  en nog {gelezen.regels.length - 6} regels
                </p>
              )}
            </div>

            {gelezen.overgeslagen.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[11.5px] text-amber-300/80 hover:text-amber-300">
                  {gelezen.overgeslagen.length} regels overgeslagen — laat zien waarom
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

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={opslaan}
                disabled={bezig || gelezen.regels.length === 0}
                className="rounded-xl bg-violet px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-violet/90 disabled:opacity-40"
              >
                {bezig ? "Bezig…" : `${gelezen.regels.length} prijzen opslaan`}
              </button>

              <p className="text-[11.5px]/[1.6] text-ink/45">
                Dit vervangt de vorige prijslijst. Twee prijzen voor hetzelfde product zou de agent
                laten kiezen, en dat wil je niet.
              </p>

              {fout && (
                <p className="inline-flex items-start gap-2 text-[12.5px]/[1.6] text-rose-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {fout}
                </p>
              )}
            </div>
          </div>
        )
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
