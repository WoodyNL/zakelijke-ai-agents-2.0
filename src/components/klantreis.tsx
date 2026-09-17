import * as React from "react";
import {
  Mail,
  Clock,
  MessageSquare,
  CalendarCheck,
  PackageCheck,
  HelpCircle,
  Phone,
  Handshake,
  Check,
  Ban,
} from "lucide-react";

/**
 * De reis van één contact, van eerste bericht tot klant.
 *
 * Een tabel met honderdzevenendertig regels vertelt je hoeveel er zijn, niet
 * hoe het met iemand staat. Dit scherm doet het omgekeerde: alles over één
 * persoon, op volgorde, met de werkelijke berichten erbij.
 *
 * Twee keuzes bepalen hoe het leest. Stappen die nog niet zijn gebeurd blijven
 * staan in plaats van te verdwijnen, zodat je ziet wat er nog komt en niet
 * alleen wat er is geweest. En de laatste twee stappen zijn mensenwerk: die
 * blijven grijs tot iemand ze aanvinkt, en dat hoort te schuren.
 */

export type Reisgegevens = {
  contact: {
    naam: string | null;
    bedrijf: string | null;
    plaats: string | null;
    email: string;
    telefoon: string | null;
    herkomst: string;
    notitie: string | null;
    in_bezorggebied: boolean | null;
    afgemeld_op: string | null;
    bounce_op: string | null;
  };
  berichten: Array<{
    id: string;
    stap: number;
    status: string;
    onderwerp: string;
    tekst: string;
    gepland_voor: string | null;
    verzonden_op: string | null;
    fout: string | null;
  }>;
  antwoorden: Array<{
    id: string;
    onderwerp: string | null;
    tekst: string;
    ontvangen_op: string;
  }>;
  bezorgingen: Array<{
    id: string;
    bezorgdag: string;
    status: string;
    opvolging: string | null;
    opvolging_notitie: string | null;
    opvolging_op: string | null;
  }>;
};

type Stap = {
  sleutel: string;
  label: string;
  icoon: React.ReactNode;
  /** Gebeurd, onderweg, of nog niet aan toe. */
  stand: "gedaan" | "onderweg" | "open";
  wanneer?: string | null | undefined;
  detail?: React.ReactNode | undefined;
  mens?: boolean | undefined;
};

const datum = (iso: string | null | undefined, metTijd = false) =>
  iso
    ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(metTijd ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : null;

function Bericht({ b }: { b: Reisgegevens["berichten"][number] }) {
  const [open, zetOpen] = React.useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => zetOpen((v) => !v)}
        className="text-left text-[12.5px] text-ink/70 underline decoration-ink/20 underline-offset-2 hover:text-ink/90"
      >
        {b.onderwerp}
      </button>
      {open && (
        <p className="mt-1.5 max-w-[66ch] rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[12px]/[1.7] whitespace-pre-wrap text-ink/60">
          {b.tekst}
        </p>
      )}
    </div>
  );
}

export function Klantreis({ g }: { g: Reisgegevens }) {
  const bericht = (stap: number) => g.berichten.find((b) => b.stap === stap);
  const verstuurd = (stap: number) => {
    const b = bericht(stap);
    return b && (b.status === "verzonden" || b.status === "beantwoord");
  };
  const gepland = (stap: number) => bericht(stap)?.status === "gepland";
  const klaargezet = (stap: number) => bericht(stap)?.status === "concept";

  const bezorging = g.bezorgingen[g.bezorgingen.length - 1];
  const opvolging = bezorging?.opvolging ?? "open";
  const eersteAntwoord = g.antwoorden[0];

  const standVan = (stap: number): Stap["stand"] =>
    verstuurd(stap) ? "gedaan" : gepland(stap) || klaargezet(stap) ? "onderweg" : "open";

  const stappen: Stap[] = [
    {
      sleutel: "eerste",
      label: "Eerste bericht",
      icoon: <Mail className="h-4 w-4" aria-hidden="true" />,
      stand: standVan(1),
      wanneer: bericht(1)?.verzonden_op ?? bericht(1)?.gepland_voor,
      detail: bericht(1) ? <Bericht b={bericht(1)!} /> : undefined,
    },
    {
      sleutel: "opvolging",
      label: "Herinnering",
      icoon: <Clock className="h-4 w-4" aria-hidden="true" />,
      stand: standVan(2),
      wanneer: bericht(2)?.verzonden_op ?? bericht(2)?.gepland_voor,
      detail: bericht(2) ? <Bericht b={bericht(2)!} /> : undefined,
    },
    {
      sleutel: "antwoord",
      label: "Heeft geantwoord",
      icoon: <MessageSquare className="h-4 w-4" aria-hidden="true" />,
      stand: eersteAntwoord ? "gedaan" : "open",
      wanneer: eersteAntwoord?.ontvangen_op,
      detail: eersteAntwoord ? (
        <p className="mt-2 max-w-[66ch] rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-3.5 py-2.5 text-[12px]/[1.7] whitespace-pre-wrap text-ink/70">
          {eersteAntwoord.tekst.slice(0, 500) || "(geen tekst opgehaald)"}
        </p>
      ) : undefined,
    },
    {
      sleutel: "afspraak",
      label: "Proefpakket ingepland",
      icoon: <CalendarCheck className="h-4 w-4" aria-hidden="true" />,
      stand: bezorging ? "gedaan" : "open",
      wanneer: bezorging?.bezorgdag,
    },
    {
      sleutel: "bezorgd",
      label: "Proefpakket bezorgd",
      icoon: <PackageCheck className="h-4 w-4" aria-hidden="true" />,
      stand: bezorging?.status === "bezorgd" ? "gedaan" : bezorging ? "onderweg" : "open",
      wanneer: bezorging?.status === "bezorgd" ? bezorging.bezorgdag : null,
    },
    {
      sleutel: "navraag",
      label: "Navraag gestuurd",
      icoon: <HelpCircle className="h-4 w-4" aria-hidden="true" />,
      stand: standVan(3),
      wanneer: bericht(3)?.verzonden_op ?? bericht(3)?.gepland_voor,
      detail: bericht(3) ? <Bericht b={bericht(3)!} /> : undefined,
    },
    {
      sleutel: "gesproken",
      label: "Gebeld of bezocht",
      icoon: <Phone className="h-4 w-4" aria-hidden="true" />,
      stand: ["gebeld", "bezocht", "klant"].includes(opvolging) ? "gedaan" : "open",
      wanneer: ["gebeld", "bezocht", "klant"].includes(opvolging)
        ? (bezorging?.opvolging_op ?? null)
        : null,
      mens: true,
      detail: bezorging?.opvolging_notitie ? (
        <p className="mt-2 text-[12px]/[1.6] text-ink/55">{bezorging.opvolging_notitie}</p>
      ) : undefined,
    },
    {
      sleutel: "klant",
      label: "Klant geworden",
      icoon: <Handshake className="h-4 w-4" aria-hidden="true" />,
      stand: opvolging === "klant" ? "gedaan" : "open",
      wanneer: opvolging === "klant" ? (bezorging?.opvolging_op ?? null) : null,
      mens: true,
    },
  ];

  const gestopt = g.contact.afgemeld_op || g.contact.bounce_op;
  const c = g.contact;

  return (
    /* Naast elkaar zodra er ruimte is. De reis is een smalle kolom tekst; die
       over de volle breedte uitrekken maakt hem niet leesbaarder, alleen leger.
       De gegevens blijven meelopen terwijl je door de tijdlijn scrolt, want dat
       is precies wat je erbij wilt zien: over wie gaat dit ook alweer. */
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section className="card-glass-lg rounded-3xl p-5 sm:p-6 lg:sticky lg:top-24">
        <div className="flex flex-wrap items-start justify-between gap-3 lg:block">
          <div>
            <h2 className="font-display text-[19px] font-bold text-brand">
              {c.naam ?? c.bedrijf ?? c.email}
            </h2>
            <p className="mt-1 text-[12.5px] text-ink/55">
              {[c.bedrijf, c.plaats].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-0.5 text-[12px] text-ink/40">
              {c.email}
              {c.telefoon && ` · ${c.telefoon}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:mt-3.5">
            <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10.5px] text-ink/60">
              {c.herkomst === "oud_klant" ? "oud-klant" : "koud"}
            </span>
            {c.in_bezorggebied === true && (
              <span className="rounded-full bg-emerald-400/12 px-2.5 py-1 text-[10.5px] text-emerald-300">
                op de route
              </span>
            )}
            {c.in_bezorggebied === false && (
              <span className="rounded-full bg-amber-400/12 px-2.5 py-1 text-[10.5px] text-amber-300">
                buiten gebied
              </span>
            )}
          </div>
        </div>

        {c.notitie && (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[12.5px]/[1.65] text-ink/60">
            {c.notitie}
          </p>
        )}

        {/* Een afmelding of bounce hoort bovenaan en niet ergens in de tijdlijn:
            het is geen stap maar een streep door alles wat nog zou komen. */}
        {gestopt && (
          <p className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[12.5px]/[1.65] text-ink/85">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            <span>
              {c.afgemeld_op
                ? `Afgemeld op ${datum(c.afgemeld_op)}. Er gaat hier niets meer heen, ook niet bij een nieuwe lijst.`
                : `Dit adres bestaat niet (${datum(c.bounce_op)}). Blijven proberen beschadigt het verzenddomein.`}
            </span>
          </p>
        )}
      </section>

      <section className="card-glass-lg rounded-3xl p-5 sm:p-6">
        <h3 className="font-display text-[15px] font-semibold text-brand">De reis</h3>

        <ol className="mt-5 grid gap-0">
          {stappen.map((s, i) => {
            const laatste = i === stappen.length - 1;
            const kleur =
              s.stand === "gedaan"
                ? s.sleutel === "klant"
                  ? "border-emerald-400 bg-emerald-400/15 text-emerald-300"
                  : "border-violet bg-violet/15 text-violet"
                : s.stand === "onderweg"
                  ? "border-violet/40 bg-violet/[0.06] text-violet/70"
                  : "border-white/12 bg-white/[0.03] text-ink/25";

            return (
              <li key={s.sleutel} className="relative grid grid-cols-[34px_1fr] gap-4 pb-5">
                {/* De lijn loopt door tot de laatste stap, ook langs stappen die
                    nog niet zijn gebeurd — die horen zichtbaar te blijven. */}
                {!laatste && (
                  <span
                    className="absolute top-8 bottom-0 left-[16px] w-px bg-white/10"
                    aria-hidden="true"
                  />
                )}

                <span
                  className={`z-10 grid h-8 w-8 place-items-center rounded-full border ${kleur}`}
                >
                  {s.stand === "gedaan" ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    s.icoon
                  )}
                </span>

                <div className="min-w-0 pt-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span
                      className={`text-[13.5px] font-semibold ${
                        s.stand === "open" ? "text-ink/35" : "text-brand"
                      }`}
                    >
                      {s.label}
                    </span>
                    {s.wanneer && (
                      <span className="text-[11.5px] text-ink/45">
                        {datum(s.wanneer, s.sleutel === "antwoord")}
                      </span>
                    )}
                    {s.stand === "onderweg" && (
                      <span className="rounded-full bg-violet/12 px-2 py-0.5 text-[10.5px] text-violet">
                        staat klaar
                      </span>
                    )}
                    {s.stand === "open" && s.mens && (
                      <span className="text-[10.5px] text-ink/30">mensenwerk</span>
                    )}
                  </div>
                  {s.detail}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
