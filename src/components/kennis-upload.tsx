import { useServerFn } from "@tanstack/react-start";
import { Check, FileUp, Loader2, X } from "lucide-react";
import * as React from "react";
import { importeerKennis, type KennisVoorstel } from "@/lib/kennisimport.functions";

/**
 * Een bestand omzetten naar kennisitems.
 *
 * Het resultaat komt eerst als voorstel in beeld. Niets wordt opgeslagen zonder
 * dat iemand het heeft gezien: een kennisbank die zichzelf vult met wat een
 * model uit een pdf meende te lezen, gaat vroeg of laat een verkeerde prijs
 * vertellen aan een klant.
 */

const MAX_MB = 8;

const LEESBAAR: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "afbeelding",
  "image/png": "afbeelding",
  "image/webp": "afbeelding",
  "image/gif": "afbeelding",
  "text/plain": "tekst",
  "text/markdown": "tekst",
  "text/csv": "csv",
  "application/json": "json",
};

const EXCEL = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

function alsBase64(bestand: File): Promise<string> {
  return new Promise((klaar, mis) => {
    const lezer = new FileReader();
    lezer.onload = () => {
      const resultaat = String(lezer.result);
      // data:<type>;base64,<inhoud> — alleen de inhoud doorsturen.
      klaar(resultaat.slice(resultaat.indexOf(",") + 1));
    };
    lezer.onerror = () => mis(new Error("Bestand kon niet worden gelezen"));
    lezer.readAsDataURL(bestand);
  });
}

/**
 * Excel wordt in de browser naar tekst omgezet. Een binair zipformaat ontleden
 * hoort niet op de server voor iets wat hier net zo goed kan, en het scheelt de
 * bibliotheek in de serverbundle.
 */
async function excelAlsTekst(bestand: File): Promise<string> {
  const XLSX = await import("xlsx");
  const boek = XLSX.read(await bestand.arrayBuffer(), { type: "array" });
  return boek.SheetNames.map((naam) => {
    const blad = XLSX.utils.sheet_to_csv(boek.Sheets[naam]!);
    return `Tabblad: ${naam}\n${blad}`;
  }).join("\n\n");
}

export function KennisUpload({
  agentSlug,
  onOvernemen,
}: {
  agentSlug: string;
  onOvernemen: (items: KennisVoorstel[]) => void;
}) {
  const importeer = useServerFn(importeerKennis);
  const [bezig, setBezig] = React.useState(false);
  const [fout, setFout] = React.useState<string | null>(null);
  const [voorstel, setVoorstel] = React.useState<KennisVoorstel[] | null>(null);
  const [bron, setBron] = React.useState<string>("");
  const [sleep, setSleep] = React.useState(false);
  const invoer = React.useRef<HTMLInputElement>(null);

  async function verwerk(bestand: File) {
    setFout(null);
    setVoorstel(null);

    if (bestand.size > MAX_MB * 1024 * 1024) {
      setFout(
        `Dit bestand is ${(bestand.size / 1024 / 1024).toFixed(1)} MB. Houd het onder ${MAX_MB} MB.`,
      );
      return;
    }

    const isExcel = EXCEL.includes(bestand.type) || /\.xlsx?$/i.test(bestand.name);
    if (!isExcel && !LEESBAAR[bestand.type]) {
      setFout(
        "Dit bestandstype kan ik niet lezen. Gebruik pdf, afbeelding, tekst, csv, json of Excel.",
      );
      return;
    }

    setBezig(true);
    setBron(bestand.name);
    try {
      const payload = isExcel
        ? { mediatype: "text/csv", inhoud: await excelAlsTekst(bestand) }
        : LEESBAAR[bestand.type] === "pdf" || bestand.type.startsWith("image/")
          ? { mediatype: bestand.type, inhoud: await alsBase64(bestand) }
          : { mediatype: "text/plain", inhoud: await bestand.text() };

      const uitkomst = await importeer({
        data: { agentSlug, bestandsnaam: bestand.name, ...payload },
      });

      if (uitkomst.items.length === 0) {
        setFout("Uit dit bestand kwam geen bruikbare kennis. Klopt het dat er tekst in staat?");
      } else {
        setVoorstel(uitkomst.items);
      }
    } catch (err) {
      console.error("kennisimport mislukt", err);
      setFout(
        err instanceof Error ? err.message : "Er ging iets mis bij het lezen van het bestand.",
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="card-glass-lg rounded-3xl p-5 sm:p-6">
      <h2 className="font-display text-[16px] font-semibold text-brand">
        Kennis toevoegen uit een bestand
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-[12.5px]/[1.65] text-ink/60">
        Upload een prijslijst, offerte, folder of veelgestelde vragen. We halen de kennis eruit en
        laten je die eerst nakijken voordat er iets wordt opgeslagen.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSleep(true);
        }}
        onDragLeave={() => setSleep(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSleep(false);
          const bestand = e.dataTransfer.files?.[0];
          if (bestand) void verwerk(bestand);
        }}
        className={`mt-5 rounded-2xl border border-dashed p-6 text-center transition-colors ${
          sleep ? "border-violet/60 bg-violet/10" : "border-white/15 bg-white/[0.03]"
        }`}
      >
        <input
          ref={invoer}
          id="kennis-bestand"
          type="file"
          className="sr-only"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,.json,.xlsx,.xls"
          onChange={(e) => {
            const bestand = e.target.files?.[0];
            if (bestand) void verwerk(bestand);
            e.target.value = "";
          }}
        />

        {bezig ? (
          <p className="inline-flex items-center gap-2 text-[13px] text-ink/70">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {bron} wordt gelezen…
          </p>
        ) : (
          <>
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
            <p className="mt-1.5 text-[11.5px] text-ink/40">
              pdf, afbeelding, tekst, csv, json of Excel · maximaal {MAX_MB} MB
            </p>
          </>
        )}
      </div>

      {fout && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-[12.5px] text-ink/85"
        >
          {fout}
        </p>
      )}

      {voorstel && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-ink/85">
              {voorstel.length} {voorstel.length === 1 ? "item gevonden" : "items gevonden"} in{" "}
              {bron}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVoorstel(null)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 px-3.5 text-[12.5px] font-medium text-ink/70 hover:bg-white/5 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Verwerpen
              </button>
              <button
                type="button"
                onClick={() => {
                  onOvernemen(voorstel);
                  setVoorstel(null);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-violet px-4 text-[12.5px] font-semibold text-white hover:bg-violet/85"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Allemaal toevoegen
              </button>
            </div>
          </div>

          <p className="mt-2 text-[11.5px] text-ink/45">
            Lees ze na voordat je ze toevoegt. Vooral prijzen en termijnen, want die vertelt je
            agent straks letterlijk door.
          </p>

          <ul className="mt-3 grid gap-2">
            {voorstel.map((item, i) => (
              <li key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="rounded-full border border-violet/25 bg-violet/10 px-2 py-0.5 font-mono text-[10px] tracking-wide text-violet uppercase">
                    {item.category}
                  </span>
                  <span className="text-[13px] font-semibold text-ink/90">{item.title}</span>
                </div>
                {item.question && (
                  <p className="mt-1.5 text-[12px] text-ink/50">Vraag: {item.question}</p>
                )}
                <p className="mt-1.5 text-[12.5px]/[1.6] text-ink/70">{item.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
