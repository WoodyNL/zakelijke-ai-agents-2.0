/**
 * Staat het verzenddomein goed? SPF, DKIM en DMARC, beoordeeld uit de
 * DNS-antwoorden. Pure logica; het opvragen gebeurt in domein.functions.ts.
 *
 * Waarom dit op het campagnescherm staat en niet ergens in het beheer: dit is
 * de reden dat cold e-mail wel of niet aankomt. Een domein zonder SPF of DKIM
 * belandt in spam, en een DMARC op "none" laat iedereen namens het domein
 * mailen. De klant hoort dat te zien voordat hij op "versturen" drukt, niet
 * achteraf uit de bounces.
 */

export type Dns = {
  /** TXT-records op het domein zelf. */
  txt: string[];
  /** TXT-records op _dmarc.<domein>. */
  dmarc: string[];
  /** Het CNAME-doel van resend._domainkey.<domein>, of null. */
  dkim: string | null;
};

export type Oordeel = "goed" | "let_op" | "fout";

export type Gezondheid = {
  domein: string;
  spf: { oordeel: Oordeel; tekst: string };
  dkim: { oordeel: Oordeel; tekst: string };
  dmarc: { oordeel: Oordeel; tekst: string };
  /** Het slechtste van de drie. */
  totaal: Oordeel;
};

export function domeinVan(email: string): string | null {
  // Ook "Frank <verkoop@fjsnacks.nl>": het domein eindigt dan op een haakje.
  const m = /@([a-z0-9.-]+\.[a-z]{2,})>?\s*$/i.exec(email.trim());
  return m ? m[1]!.toLowerCase() : null;
}

/** Haalt de aanhalingstekens weg die DNS-over-HTTPS om TXT-records zet. */
export function schoonTxt(ruw: string): string {
  return ruw.replace(/^"|"$/g, "").replace(/"\s+"/g, "").trim();
}

export function beoordeel(domein: string, dns: Dns): Gezondheid {
  const spfRecords = dns.txt.map(schoonTxt).filter((t) => /^v=spf1\b/i.test(t));
  let spf: Gezondheid["spf"];
  if (spfRecords.length === 0)
    spf = {
      oordeel: "fout",
      tekst:
        "Geen SPF-record. Ontvangers kunnen niet zien dat Resend namens dit domein mag versturen.",
    };
  else if (spfRecords.length > 1)
    spf = {
      oordeel: "fout",
      tekst: `Er staan ${spfRecords.length} SPF-records; dat mag er maar één zijn, anders geldt geen van beide.`,
    };
  else {
    const r = spfRecords[0]!;
    const resend =
      /include:(amazonses\.com|_spf\.resend\.com|send\.[a-z0-9.-]+)/i.test(r) ||
      /include:.*resend/i.test(r);
    spf = resend
      ? { oordeel: "goed", tekst: "SPF staat en noemt de verzender." }
      : {
          oordeel: "let_op",
          tekst:
            "SPF staat, maar noemt de verzender van de agent niet. Controleer of het include van Resend erin staat.",
        };
  }

  const dkim: Gezondheid["dkim"] = dns.dkim
    ? /resend|amazonses|rmta/i.test(dns.dkim)
      ? { oordeel: "goed", tekst: "DKIM staat (resend._domainkey)." }
      : {
          oordeel: "let_op",
          tekst: `resend._domainkey wijst naar ${dns.dkim}; dat is niet het adres van Resend.`,
        }
    : {
        oordeel: "fout",
        tekst:
          "Geen DKIM voor Resend gevonden (resend._domainkey). Zonder handtekening wantrouwen Gmail en Outlook de mail.",
      };

  const dmarcRecords = dns.dmarc.map(schoonTxt).filter((t) => /^v=DMARC1\b/i.test(t));
  let dmarc: Gezondheid["dmarc"];
  if (dmarcRecords.length === 0)
    dmarc = {
      oordeel: "fout",
      tekst: "Geen DMARC-record. Sinds 2024 eisen Gmail en Yahoo dit voor wie in bulk verstuurt.",
    };
  else {
    const p = /\bp=(none|quarantine|reject)/i.exec(dmarcRecords[0]!)?.[1]?.toLowerCase();
    dmarc =
      p === "reject" || p === "quarantine"
        ? { oordeel: "goed", tekst: `DMARC staat op ${p}.` }
        : {
            oordeel: "let_op",
            tekst:
              "DMARC staat op none: het record is er, maar het beschermt nog niet. Zet het op quarantine zodra SPF en DKIM goed staan.",
          };
  }

  const rang: Record<Oordeel, number> = { goed: 0, let_op: 1, fout: 2 };
  const totaal = ([spf.oordeel, dkim.oordeel, dmarc.oordeel] as Oordeel[]).sort(
    (a, b) => rang[b] - rang[a],
  )[0]!;
  return { domein, spf, dkim, dmarc, totaal };
}
