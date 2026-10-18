# Rapport: de WhatsApp-opvolger gebouwd

> 19 oktober 2026. De vraag: bouw de WhatsApp-opvolger voor de sales-assistent,
> zodat je "ja" kunt zeggen als een klant ernaar vraagt. Dit is wat er staat,
> wat het doet, hoe het gecontroleerd is, en wat alleen jij nog kunt doen.

## In één alinea

Een klant appt het zakelijke nummer; de agent antwoordt uit de kennisbank,
kort, zoals mensen appen. Bij een klacht, annuleren, een woord van de
overdrachtlijst, een foto of spraakbericht, of iets wat hij niet weet, zwijgt
hij, krijgt de ondernemer een mail, en antwoordt die zelf vanuit het portaal.
Leads van de sales-assistent met een telefoonnummer die na het eerste antwoord
stil bleven, krijgen een opvolgbericht met een door Meta goedgekeurd sjabloon:
met een klik, of vanzelf als de klant dat aanzet. De code is af en getest; wat
ontbreekt zijn drie geheimen van Meta en een goedgekeurd sjabloon — stappen
die aan een account en een nummer vastzitten en in
`documenten/whatsapp-instellen.md` staan.

## De regels van WhatsApp, ingebouwd

| Regel van Meta | Hoe de code ermee omgaat |
|---|---|
| Vrij antwoorden alleen binnen 24 uur na het laatste bericht van de klant | `vensterOpen()` op elk gesprek; de agent én de ondernemer kunnen daarbuiten niets sturen, het scherm zegt waarom |
| Zelf beginnen alleen met een goedgekeurd sjabloon | opvolgen is één vast sjabloon met voornaam en bedrijfsnaam; zonder sjabloonnaam in de opties is de knop uit |
| Dezelfde melding kan meer dan eens worden aangeboden | het bericht-id van Meta is uniek in de database; de tweede keer wordt genegeerd en er komt geen tweede antwoord |
| Een webhook die een fout geeft wordt eindeloos herhaald | altijd 200 terug, het werk loopt daarna door (`waitUntil`); onzin wordt genegeerd |
| Echtheid van de webhook | HMAC-SHA256 over de ruwe tekst met het app-secret, vergeleken in constante tijd |

Daarbovenop de eigen regels van het platform: hij zegt niets wat niet in de
kennisbank staat, voert geen instructies uit het bericht van de klant uit, en
een lege kennisbank betekent dat hij vrijwel alles overdraagt. Zelf beginnen
doet hij alleen op werkdagen binnen het venster van de klant (standaard
09:00–18:00, Nederlandse tijd); op een vraag antwoordt hij altijd meteen.

## Wat er is gebouwd

- **Migratie** `20261019120000_whatsapp.sql`: `whatsapp_gesprekken` (één per
  nummer per agent, met het begin van het 24-uursvenster, de status open /
  overgedragen / gesloten, en de lead die ermee wordt opgevolgd) en
  `whatsapp_berichten` (richting, wie het schreef: agent, mens of sjabloon,
  bezorgstatus). RLS: eigenaar en team lezen en nemen over, meekijker leest,
  wij zien alleen aantallen via `whatsapp_kerncijfers`. Berichten invoegen kan
  alleen de server.
- **Regels zonder netwerk** (`src/lib/whatsapp.ts`): het venster, nummers
  normaliseren naar wat Meta wil (06… → 316…), overdrachtwoorden als heel
  woord ("jurist" wel, "juristerij" niet), de webhook van Meta lezen (tekst,
  knoppen, media, statussen, onzin), welke leads aan opvolging toe zijn.
- **Server** (`src/lib/whatsapp.server.ts`): webhook (GET-verificatie en
  POST), antwoord van de agent via Claude met de gesprekshistorie, overdracht
  met mail aan de ondernemer, opvolgen met sjabloon, de ronde voor automatisch
  opvolgen (hoogstens eens per tien minuten, hoogstens vijf per ronde), en
  zelf antwoorden vanuit het portaal. Zonder de drie geheimen doet alles
  netjes niets.
- **Scherm `/whatsapp`**: vier tabs — jij bent aan zet, agent antwoordt, leads
  om op te volgen, gesloten. Per gesprek de berichten als chat, zelf
  antwoorden zolang het venster open is, overnemen / teruggeven / sluiten.
  Vier kerncijfers; dezelfde tegels op de agentpagina; regels in het
  dagoverzicht.
- **Catalogus**: de vier bestaande knoppen staan op gebouwd (behalve
  "berichtkosten doorbelasten": er is geen facturatie om het op te zetten),
  plus nieuw: nummer-id bij Meta, sjabloon, leads vanzelf opvolgen, opvolgen
  na zoveel dagen.
- **Documenten**: `whatsapp-instellen.md` (de stappen bij Meta, het sjabloon
  dat je aanmeldt, de geheimen) en het klantdocument `onze-ai-agents.pdf`
  (de opvolger staat nu op "beschikbaar", met wat erbij nodig is).

## Hoe het is gecontroleerd

- `scripts/test-whatsapp.ts`: 26 controles op de regels, in Europe/Amsterdam
  én UTC, groen.
- PGlite-suite `test-whatsapp.mjs` tegen de hele migratieketen: één gesprek
  per nummer, dubbele melding is één bericht, klant kan geen berichten
  invoegen maar wel overnemen, Frank leest, een andere klant en wij niet,
  kerncijfers voor Frank en voor ons gelijk, een andere klant niets, agent
  weg = alles weg. Alle twaalf suites groen.
- `test-catalogus.ts` zakte één keer (het scherm stond nog niet in de lijst
  van alle schermen) en is daarna groen; `bash scripts/test-alles.sh` groen;
  typecheck, eslint en prettier schoon op alle nieuwe en gewijzigde bestanden.
- Wat níét getest is: het echte verkeer met Meta. Dat kan pas met een nummer.
  De eerste test is simpel: zelf appen naar het nummer en kijken of het
  gesprek op `/whatsapp` verschijnt (stap 3 in `whatsapp-instellen.md`).

## Wat alleen jij kunt doen

1. Bij Meta: bedrijfsportfolio, app, nummer, systeemgebruiker-token, app-secret
   (`whatsapp-instellen.md`, stap 1–2).
2. Bij Lovable: `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`.
3. Webhook registreren op `https://zakelijkeaiagents.nl/api/whatsapp` en het
   sjabloon `opvolging_lead` indienen (stap 3–4).
4. Per klant: een agent van het soort WhatsApp-opvolger met nummer, nummer-id
   en sjabloonnaam; de klant vult zijn kennisbank.

Tot die tijd zegt het scherm van de klant eerlijk dat de koppeling nog wordt
ingesteld.
