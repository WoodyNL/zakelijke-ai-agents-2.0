/**
 * Van berichten naar uren naar euro's.
 *
 * Dit is de rekenkamer van het portaal, apart gehouden zodat de aannames op één
 * plek staan en te controleren zijn. Twee dingen zijn hier belangrijker dan de
 * code zelf:
 *
 * Berichten tellen we. Bespaarde tijd en bespaard geld niet: daar zitten twee
 * afspraken tussen, de minuten per bericht en het uurtarief. Ontbreekt er een,
 * dan tonen we dat cijfer niet. Een bedrag dat gemeten lijkt maar geschat is,
 * is voor een bureau dat klanten waarschuwt voor AI-beloftes het verkeerde
 * soort cijfer.
 *
 * En bespaard is niet hetzelfde als opgeleverd. Wat hier uitkomt zijn vermeden
 * kosten: tijd die iemand anders aan dit werk had besteed. Omzet uit gewonnen
 * leads is een andere som, met conversie en ordergrootte erin, en die cijfers
 * hebben we niet.
 */

export type Aannames = {
  minutenPerActie?: number | null;
  minutenGrondslag?: string | null;
  uurtarief?: number | null;
  uurtariefGrondslag?: string | null;
};

export type Opbrengst = {
  berichten: number;
  minuten: number | null;
  uren: number | null;
  bedrag: number | null;
  /** Losse zinnen die uitleggen waar elk cijfer vandaan komt. */
  verantwoording: string[];
  /** Wat er nog afgesproken moet worden voordat een cijfer getoond kan worden. */
  ontbreekt: string[];
};

export function berekenOpbrengst(berichten: number, aannames: Aannames): Opbrengst {
  const { minutenPerActie, minutenGrondslag, uurtarief, uurtariefGrondslag } = aannames;

  const minuten = minutenPerActie ? berichten * minutenPerActie : null;
  const uren = minuten != null ? minuten / 60 : null;
  const bedrag = uren != null && uurtarief ? uren * uurtarief : null;

  const verantwoording: string[] = [];
  const ontbreekt: string[] = [];

  if (minuten != null) {
    verantwoording.push(
      `${berichten.toLocaleString("nl-NL")} berichten × ${getal(minutenPerActie!)} minuten` +
        (minutenGrondslag ? `, gebaseerd op ${minutenGrondslag}` : ""),
    );
  } else {
    ontbreekt.push("hoeveel minuten één afgehandeld bericht scheelt");
  }

  if (bedrag != null) {
    verantwoording.push(
      `${getal(uren!)} uur × ${euro(uurtarief!)} per uur` +
        (uurtariefGrondslag ? `, gebaseerd op ${uurtariefGrondslag}` : ""),
    );
  } else if (minuten != null) {
    ontbreekt.push("welk uurtarief we hiervoor rekenen");
  }

  return { berichten, minuten, uren, bedrag, verantwoording, ontbreekt };
}

/** Nederlandse notatie, zonder nullen die niets toevoegen. */
export function getal(n: number, decimalen = 1) {
  return n.toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalen,
  });
}

export function euro(n: number) {
  return n.toLocaleString("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** "12 uur 30 min", of "45 min" als het onder het uur blijft. */
export function urenNotatie(minuten: number) {
  const u = Math.floor(minuten / 60);
  const m = Math.round(minuten % 60);
  if (u === 0) return `${m} min`;
  if (m === 0) return `${u} uur`;
  return `${u} uur ${m} min`;
}

export type FairUse = {
  berichten: number;
  grens?: number | null;
  bovenGrens: number;
  prijsPerStuk?: number | null;
  bedrag: number;
};

/**
 * Hoeveel er boven de fair-use-grens zit, en wat dat kost. Zonder grens is er
 * niets na te factureren: dan is het gewoon inbegrepen.
 */
export function berekenFairUse(
  berichten: number,
  grens: number | null | undefined,
  prijsPerStuk: number | null | undefined,
): FairUse {
  const boven = grens != null ? Math.max(berichten - grens, 0) : 0;
  return {
    berichten,
    grens: grens ?? null,
    bovenGrens: boven,
    prijsPerStuk: prijsPerStuk ?? null,
    bedrag: prijsPerStuk ? boven * prijsPerStuk : 0,
  };
}
