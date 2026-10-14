/**
 * Google en Microsoft, naast elkaar.
 *
 * Beide doen hetzelfde in andere woorden: inloggen, toestemming vragen, een
 * token teruggeven dat na een uur verloopt, en een vernieuwtoken waarmee je
 * een nieuw uurtoken haalt. Door dat verschil hier één keer glad te strijken,
 * hoeft de rest van de code niet te weten bij wie de mailbox staat.
 *
 * Over de rechten die we vragen, want dat is de vraag die een klant stelt:
 *
 *   Google: gmail.modify. Dat is lezen, labelen, concepten maken en versturen
 *   — alles in één recht, want Google kent geen smaller recht dat concepten
 *   kan maken. We vragen níét mail.google.com (volledige toegang, inclusief
 *   permanent verwijderen).
 *
 *   Microsoft: Mail.ReadWrite en Mail.Send, apart aan te vinken. Daarbij
 *   offline_access, anders is de koppeling na een uur dood.
 *
 * Let op bij Google: gmail.modify geldt als "restricted scope". Voor gebruik
 * door willekeurige klanten vraagt Google een verificatietraject met een
 * jaarlijkse externe beveiligingsaudit. In testmodus mag het tot honderd
 * gebruikers, die dan een waarschuwingsscherm zien. Zolang dat traject niet
 * rond is, blijft doorsturen de weg die het altijd doet.
 */

export type Aanbieder = "google" | "microsoft";

export type Tokens = {
  toegang: string;
  vernieuwen: string | null;
  verlooptOp: Date;
  /** Het adres van de mailbox die werd gekoppeld. */
  email: string;
  naam: string | null;
};

type Config = {
  autoriseer: string;
  token: string;
  scopes: string;
  /** Extra parameters die deze aanbieder nodig heeft bij het inloggen. */
  extra: Record<string, string>;
};

const CONFIG: Record<Aanbieder, Config> = {
  google: {
    autoriseer: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scopes: "https://www.googleapis.com/auth/gmail.modify openid email profile",
    extra: {
      // Zonder deze twee geeft Google alleen de eerste keer een vernieuwtoken,
      // en staat de koppeling na een uur stil zodra iemand opnieuw koppelt.
      access_type: "offline",
      prompt: "consent",
    },
  },
  microsoft: {
    autoriseer: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: "offline_access openid email profile Mail.ReadWrite Mail.Send",
    extra: {},
  },
};

function geheimen(a: Aanbieder): { id: string; geheim: string } | null {
  const id = process.env[a === "google" ? "GOOGLE_CLIENT_ID" : "MICROSOFT_CLIENT_ID"];
  const geheim = process.env[a === "google" ? "GOOGLE_CLIENT_SECRET" : "MICROSOFT_CLIENT_SECRET"];
  return id && geheim ? { id, geheim } : null;
}

/** Kan er met deze aanbieder gekoppeld worden, of ontbreken de gegevens nog? */
export function beschikbaar(a: Aanbieder): boolean {
  return geheimen(a) !== null;
}

export function terugkomstadres(): string {
  const basis = process.env["SITE_URL"] ?? "https://zakelijkeaiagents.nl";
  return `${basis.replace(/\/+$/, "")}/api/postvak/terug`;
}

export function inlogadres(a: Aanbieder, state: string): string {
  const g = geheimen(a);
  if (!g) throw new Error(`Koppelen met ${a} is nog niet ingesteld op de server.`);
  const c = CONFIG[a];
  const p = new URLSearchParams({
    client_id: g.id,
    redirect_uri: terugkomstadres(),
    response_type: "code",
    scope: c.scopes,
    state,
    ...c.extra,
  });
  return `${c.autoriseer}?${p.toString()}`;
}

type TokenAntwoord = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
};

async function vraagToken(a: Aanbieder, body: URLSearchParams): Promise<TokenAntwoord> {
  const g = geheimen(a);
  if (!g) throw new Error(`Koppelen met ${a} is nog niet ingesteld op de server.`);
  body.set("client_id", g.id);
  body.set("client_secret", g.geheim);

  const res = await fetch(CONFIG[a].token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const uit = (await res.json()) as TokenAntwoord;
  if (!res.ok || !uit.access_token) {
    throw new Error(
      `Token ophalen mislukt [${res.status}]: ${uit.error_description ?? uit.error ?? ""}`,
    );
  }
  return uit;
}

/** Het e-mailadres uit het id-token; dat is de mailbox die gekoppeld wordt. */
function adresUitIdToken(idToken?: string): { email: string; naam: string | null } | null {
  if (!idToken) return null;
  const deel = idToken.split(".")[1];
  if (!deel) return null;
  try {
    const json = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(deel.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
      ),
    ) as { email?: string; preferred_username?: string; name?: string };
    const email = json.email ?? json.preferred_username;
    return email ? { email, naam: json.name ?? null } : null;
  } catch {
    return null;
  }
}

export async function wisselCodeIn(a: Aanbieder, code: string): Promise<Tokens> {
  const uit = await vraagToken(
    a,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: terugkomstadres(),
    }),
  );

  const wie = adresUitIdToken(uit.id_token) ?? (await vraagAdres(a, uit.access_token!));
  return {
    toegang: uit.access_token!,
    vernieuwen: uit.refresh_token ?? null,
    verlooptOp: new Date(Date.now() + (uit.expires_in ?? 3600) * 1000),
    email: wie.email,
    naam: wie.naam,
  };
}

/** Terugval als er geen id-token meekwam: vragen wie dit is. */
async function vraagAdres(
  a: Aanbieder,
  toegang: string,
): Promise<{ email: string; naam: string | null }> {
  const url =
    a === "google"
      ? "https://gmail.googleapis.com/gmail/v1/users/me/profile"
      : "https://graph.microsoft.com/v1.0/me";
  const res = await fetch(url, { headers: { Authorization: `Bearer ${toegang}` } });
  if (!res.ok) throw new Error(`Adres opvragen mislukt [${res.status}]`);
  const j = (await res.json()) as {
    emailAddress?: string;
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
  };
  const email = j.emailAddress ?? j.mail ?? j.userPrincipalName;
  if (!email) throw new Error("Geen e-mailadres gevonden bij deze mailbox.");
  return { email, naam: j.displayName ?? null };
}

export async function vernieuwToken(
  a: Aanbieder,
  vernieuwen: string,
): Promise<{ toegang: string; verlooptOp: Date }> {
  const uit = await vraagToken(
    a,
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: vernieuwen }),
  );
  return {
    toegang: uit.access_token!,
    verlooptOp: new Date(Date.now() + (uit.expires_in ?? 3600) * 1000),
  };
}
