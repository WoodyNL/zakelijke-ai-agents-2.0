/**
 * Wanneer een bericht mag vertrekken.
 *
 * De klant stelt een venster in ("09:00–17:00") en verwacht dat er buiten die
 * uren niets weggaat. Daar zit een valkuil in die je maar één keer wilt maken:
 * deze code draait op Cloudflare, en daar staat de klok op UTC. `setHours(9)`
 * betekent daar negen uur 's ochtends in Londen — in de zomer elf uur bij ons.
 * Een klant die "tot vijf uur" instelt, zou dan tot zeven uur 's avonds post
 * versturen.
 *
 * Daarom rekent alles hier met de Nederlandse wandklok via Intl, en niet met de
 * klok van de machine. Zomertijd gaat vanzelf goed: de offset wordt per moment
 * opgevraagd, niet één keer aangenomen.
 *
 * Werkdagen zitten erin omdat dit om zakelijke post gaat. Een mail die
 * zaterdagochtend binnenkomt, is maandag ondergesneeuwd.
 */

const TZ = "Europe/Amsterdam";

export type Venster = {
  /** Minuten na middernacht, Nederlandse tijd. */
  begin: number;
  eind: number;
};

/** Wat er geldt als er niets is ingesteld; gelijk aan wat het hiervoor deed. */
export const STANDAARD_VENSTER: Venster = { begin: 9 * 60, eind: 17 * 60 };

/**
 * Leest "09:00-17:00" (of "9:00 – 17:30") uit de instelling.
 *
 * Bij onzin het standaardvenster, niet een lege waarde: een vertypte instelling
 * mag een campagne niet midden in de nacht laten vertrekken.
 */
export function leesVenster(ruw: unknown): Venster {
  if (typeof ruw !== "string") return STANDAARD_VENSTER;
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*[-–—tot]+\s*(\d{1,2})[:.](\d{2})\s*$/.exec(ruw);
  if (!m) return STANDAARD_VENSTER;
  const begin = Number(m[1]) * 60 + Number(m[2]);
  const eind = Number(m[3]) * 60 + Number(m[4]);
  if (begin < 0 || eind > 24 * 60 || eind - begin < 30) return STANDAARD_VENSTER;
  return { begin, eind };
}

/** Hoeveel minuten Nederland op dit moment voorloopt op UTC. */
function offsetMinuten(d: Date): number {
  const naam =
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, timeZoneName: "longOffset" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(naam);
  if (!m) return 60;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

const WEEKDAGEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** De Nederlandse wandklok van een moment. */
export function delen(d: Date): {
  jaar: number;
  maand: number;
  dag: number;
  /** 0 = zondag, 6 = zaterdag. */
  weekdag: number;
  minuten: number;
} {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  // Middernacht komt er als "24" uit; dat is dezelfde dag, minuut 0.
  const uur = Number(v("hour")) % 24;
  return {
    jaar: Number(v("year")),
    maand: Number(v("month")),
    dag: Number(v("day")),
    weekdag: Math.max(WEEKDAGEN.indexOf(v("weekday")), 0),
    minuten: uur * 60 + Number(v("minute")),
  };
}

/** Het moment waarop het in Nederland die dag, dat tijdstip is. */
function instantVoor(jaar: number, maand: number, dag: number, minuten: number): Date {
  const wand = Date.UTC(jaar, maand - 1, dag, 0, minuten);
  // Twee rondes: de offset hangt af van het moment zelf, en rond de
  // zomertijdwissel geeft de eerste schatting net de verkeerde.
  let uit = new Date(wand - offsetMinuten(new Date(wand)) * 60_000);
  uit = new Date(wand - offsetMinuten(uit) * 60_000);
  return uit;
}

/** Dezelfde dag, maar dan op dit tijdstip; eventueel doorgeschoven naar morgen. */
function opDag(d: Date, minuten: number, dagenVerder = 0): Date {
  const { jaar, maand, dag } = delen(d);
  return instantVoor(jaar, maand, dag + dagenVerder, minuten);
}

/** De eerstvolgende keer dat het venster opengaat op een werkdag. */
function volgendeOpening(vanaf: Date, venster: Venster): Date {
  let kandidaat = opDag(vanaf, venster.begin);
  if (kandidaat.getTime() <= vanaf.getTime()) kandidaat = opDag(vanaf, venster.begin, 1);
  for (let i = 0; i < 9; i++) {
    const w = delen(kandidaat).weekdag;
    if (w !== 0 && w !== 6) return kandidaat;
    kandidaat = opDag(kandidaat, venster.begin, 1);
  }
  return kandidaat;
}

/**
 * Schuift een moment naar binnen het venster, op een werkdag.
 *
 * Valt het er al in, dan blijft het staan. Ligt het ervoor, dan schuift het
 * naar de opening van diezelfde dag; ligt het erna of in het weekend, dan naar
 * de volgende werkdag.
 */
export function binnenVenster(moment: Date, venster: Venster, nu = new Date()): Date {
  let m = moment.getTime() < nu.getTime() ? new Date(nu.getTime() + 60_000) : moment;
  for (let i = 0; i < 9; i++) {
    const { weekdag, minuten } = delen(m);
    if (weekdag === 0 || weekdag === 6) {
      m = opDag(m, venster.begin, 1);
      continue;
    }
    if (minuten < venster.begin) {
      m = opDag(m, venster.begin);
      continue;
    }
    if (minuten >= venster.eind) {
      m = opDag(m, venster.begin, 1);
      continue;
    }
    return m;
  }
  return m;
}

/**
 * Verdeelt berichten over werkdagen, binnen het venster.
 *
 * Honderd mails in één klap is het patroon waaraan een spamfilter een campagne
 * herkent. Daarom hoogstens `perDag` per dag, met minuten ertussen, en nooit
 * twee op precies hetzelfde tijdstip.
 */
export function verdeelInVenster(
  aantal: number,
  perDag: number,
  vanaf: Date,
  venster: Venster = STANDAARD_VENSTER,
  nu = new Date(),
): Date[] {
  const uit: Date[] = [];
  const max = Math.max(perDag, 1);
  const lengte = Math.max(venster.eind - venster.begin, 30);
  const stap = Math.max(Math.floor(lengte / max), 3);

  // Begin binnen het venster: nu als dat kan, anders bij de eerstvolgende
  // opening. Een campagne die om acht uur 's avonds wordt gestart, vertrekt
  // morgenochtend — dat is precies wat de instelling belooft.
  let dagStart = binnenVenster(vanaf, venster, nu);
  let opDezeDag = 0;

  for (let i = 0; i < aantal; i++) {
    if (opDezeDag === max) {
      dagStart = volgendeOpening(dagStart, venster);
      opDezeDag = 0;
    }
    const moment = new Date(dagStart.getTime() + opDezeDag * stap * 60_000);
    opDezeDag++;
    // Door het uitlopen kan een bericht over het einde van het venster heen
    // schuiven; dan gaat het naar de volgende werkdag.
    const binnen = binnenVenster(moment, venster, nu);
    if (binnen.getTime() !== moment.getTime()) {
      dagStart = volgendeOpening(moment, venster);
      opDezeDag = 1;
      uit.push(dagStart);
      continue;
    }
    uit.push(moment);
  }
  return uit;
}

/**
 * Verdeelt berichten over dagen volgens het dagmaximum.
 *
 * Een vers verzenddomein dat op dag één honderd mails wegstuurt, valt op bij
 * spamfilters en krijgt dat nauwelijks meer terug. Deze functie is dus geen
 * netheid maar de rem die dat voorkomt.
 *
 * De verzendtijden liggen binnen kantooruren en lopen per bericht een paar
 * minuten uit elkaar. Honderd mails op precies hetzelfde tijdstip is een
 * patroon dat een mens nooit maakt.
 */
export function verdeelOverDagen(
  aantal: number,
  perDag: number,
  vanaf: Date,
  venster: Venster = STANDAARD_VENSTER,
): Date[] {
  return verdeelInVenster(aantal, perDag, vanaf, venster);
}

/**
 * Het moment waarop een opvolging mag vertrekken.
 *
 * Niet verdeeld over dagen zoals het eerste bericht, maar per contact geteld
 * vanaf zijn eigen eerste mail. Dat regelt het tempo vanzelf: zijn de eerste
 * berichten over veertien werkdagen verdeeld, dan zijn de opvolgingen dat ook.
 *
 * Wel naar een werkdag en naar de ochtend. Een herinnering die zaterdagnacht
 * binnenkomt is maandag ondergesneeuwd, en dat is precies het bericht dat je
 * niet wilt verspillen.
 */
export function opvolgmoment(
  verzondenOp: Date,
  naDagen: number,
  venster: Venster = STANDAARD_VENSTER,
): Date {
  // Een half uur na de opening: niet als eerste in een inbox die 's ochtends
  // toch wordt leeggeveegd, maar wel ruim binnen de ochtend.
  const doel = new Date(verzondenOp.getTime() + naDagen * 24 * 60 * 60_000);
  const halfNaOpening = new Date(doel.getTime());
  const { minuten } = delen(halfNaOpening);
  halfNaOpening.setTime(halfNaOpening.getTime() + (venster.begin + 30 - minuten) * 60_000);
  // binnenVenster regelt de rest: weekend, buiten de uren, en nooit in het
  // verleden — dat laatste zou bij een campagne die al langer loopt betekenen
  // dat Resend het weigert en de opvolging stilletjes uitvalt.
  return binnenVenster(halfNaOpening, venster);
}
