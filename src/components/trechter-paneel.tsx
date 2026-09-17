import {
  Users,
  Mail,
  Clock,
  MessageSquare,
  CalendarCheck,
  PackageCheck,
  Phone,
  Handshake,
} from "lucide-react";
import type { Trechter } from "@/lib/campagne.functions";

/**
 * Hoeveel mensen er per stap zijn overgebleven.
 *
 * Dit telt contacten en geen berichten, en dat verschil is het hele punt. Twee
 * mails aan dezelfde persoon is één aangeschreven relatie; een trechter die
 * berichten telt loopt vanzelf vol en zegt niets.
 *
 * De balken staan op de eerste stap en niet op de vorige. Dat is minder vleiend
 * — een stap die de helft haalt van een stap die zelf al de helft haalde, ziet
 * er in percentages van de vorige stap prima uit terwijl er van honderd mensen
 * vijfentwintig over zijn. Op de lijst afzetten laat zien wat er werkelijk
 * gebeurt.
 */

type Stap = {
  sleutel: keyof Trechter;
  label: string;
  uitleg: string;
  icoon: React.ReactNode;
};

const STAPPEN: Stap[] = [
  {
    sleutel: "aangeschreven",
    label: "aangeschreven",
    uitleg: "hebben een eerste bericht gekregen",
    icoon: <Mail className="h-4 w-4" aria-hidden="true" />,
  },
  {
    sleutel: "opgevolgd",
    label: "opgevolgd",
    uitleg: "kregen een herinnering omdat ze niet reageerden",
    icoon: <Clock className="h-4 w-4" aria-hidden="true" />,
  },
  {
    sleutel: "in_gesprek",
    label: "in gesprek",
    uitleg: "hebben teruggeschreven",
    icoon: <MessageSquare className="h-4 w-4" aria-hidden="true" />,
  },
  {
    sleutel: "afspraak",
    label: "proefpakket afgesproken",
    uitleg: "staan ingepland voor een vrijdag",
    icoon: <CalendarCheck className="h-4 w-4" aria-hidden="true" />,
  },
  {
    sleutel: "bezorgd",
    label: "proefpakket bezorgd",
    uitleg: "hebben het pakket gehad",
    icoon: <PackageCheck className="h-4 w-4" aria-hidden="true" />,
  },
  // De laatste twee zijn mensenwerk, en staan er juist daarom bij. Wat niemand
  // meet, doet niemand — en dit is de stap waar een proefpakket een klant
  // wordt of blijft liggen.
  {
    sleutel: "gesproken",
    label: "gebeld of bezocht",
    uitleg: "hebben persoonlijk contact gehad",
    icoon: <Phone className="h-4 w-4" aria-hidden="true" />,
  },
  {
    sleutel: "klant",
    label: "klant geworden",
    uitleg: "waar het allemaal om begonnen was",
    icoon: <Handshake className="h-4 w-4" aria-hidden="true" />,
  },
];

export function TrechterPaneel({ t }: { t: Trechter }) {
  const basis = Math.max(t.contacten, 1);
  const deel = (n: number) => Math.round((n / basis) * 100);

  return (
    <section className="card-glass-lg rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[16px] font-semibold text-brand">
          Van lijst tot klant
        </h2>
        <span className="text-[11.5px] text-ink/45">
          {t.contacten.toLocaleString("nl-NL")} contacten
          {t.contacten > t.bereikbaar && `, ${t.bereikbaar.toLocaleString("nl-NL")} bereikbaar`}
        </span>
      </div>

      {t.contacten === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center">
          <Users className="mx-auto h-5 w-5 text-ink/30" aria-hidden="true" />
          <p className="mt-2 text-[12.5px] text-ink/50">
            Nog geen contacten. Laad eerst een lijst in.
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3.5">
          {STAPPEN.map((s) => {
            const n = Number(t[s.sleutel] ?? 0);
            const pct = deel(n);
            return (
              <li key={s.sleutel}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[12.5px] text-ink/75">
                    <span className="text-ink/40">{s.icoon}</span>
                    {s.label}
                  </span>
                  <span className="text-[12.5px] tabular-nums">
                    <strong
                      className={`font-display font-bold ${
                        s.sleutel === "klant" ? "text-emerald-300" : "text-brand"
                      }`}
                    >
                      {n.toLocaleString("nl-NL")}
                    </strong>
                    <span className="ml-1.5 text-ink/40">{pct}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${
                      s.sleutel === "klant" ? "bg-emerald-400" : "bg-violet"
                    }`}
                    style={{ width: `${Math.max(pct, n > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-ink/40">{s.uitleg}</p>
              </li>
            );
          })}
        </ul>
      )}

      {/* Afmeldingen en bounces staan apart en niet als trechterstap: het zijn
          geen mensen die zijn afgehaakt onderweg, maar mensen die er niet meer
          in horen. Ze wegmoffelen zou het verkeerde signaal zijn — een
          oplopend aantal afmeldingen is het eerste teken dat de toon niet
          deugt of dat er te vaak wordt gemaild. */}
      {(t.afgemeld > 0 || t.gebouncet > 0) && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {t.afgemeld > 0 && (
            <span className="rounded-full bg-amber-400/12 px-3 py-1.5 text-[11.5px] text-amber-300">
              {t.afgemeld} afgemeld
            </span>
          )}
          {t.gebouncet > 0 && (
            <span className="rounded-full bg-rose-400/12 px-3 py-1.5 text-[11.5px] text-rose-300">
              {t.gebouncet} adres{t.gebouncet === 1 ? "" : "sen"} bestaat niet
            </span>
          )}
          <span className="self-center text-[11px] text-ink/40">
            Deze krijgen niets meer, ook niet bij een nieuwe lijst.
          </span>
        </div>
      )}
    </section>
  );
}
