# Herpositionering naar AI-agency

De landingspagina wordt volledig herschreven naar het agency-verhaal: "AI werkt. AI-projecten meestal niet. Wij zijn het verschil." Alle teksten en cijfers uit de briefing worden letterlijk overgenomen, inclusief bronvermelding onder elk cijfer. De huidige huisstijl (donker, paars/violet, glaskaarten) blijft — het groene accent uit de briefing wordt niet gebruikt; faalcijfers krijgen wel een afwijkende waarschuwingskleur (koraalrood) zodat de probleemsectie apart oogt.

## Wat er op de pagina komt

In deze volgorde, met de netwerk-animatie behouden in de hero:

1. Sticky header — woordmerk + "AI-agency voor het MKB", nav (Diensten · Werkwijze · Branches · Tarieven · Veelgestelde vragen), knop "Plan een gratis AI-verkenning", mobiel menu
2. Hero — nieuwe kop en subkop, twee knoppen, drie kerncijfers in een kaart, netwerk-animatie ernaast
3. Vertrouwensbalk — "Werkt met": HubSpot, Pipedrive, Gmail & Outlook, WhatsApp Business, Slack, Exact, Make, Zapier, Microsoft 365
4. Het probleem in cijfers — zes statistiekkaarten + het 67%/33%-cijfer uitgelicht
5. Waarom het stuklopt / onze aanpak — vijf rijen probleem ↔ aanpak, op mobiel inklapbaar
6. Drie diensten — consultancy, projectondersteuning, maatwerk
7. Werkwijze — vier fasen met doorlooptijd
8. De AI-scan — hoofdblok met prijskaart
9. Branches — zes kaarten
10. Kant-en-klare AI-agents — de bestaande drie, kort
11. Tarieven — AI-scan, Start, Groei (meest gekozen), Compleet
12. Governance & AI Act — tekst + tijdlijn
13. Bewijs — drie resultaatcijfers, quote Lotte van Dijk, plaatshouder voor extra cases
14. Wie je krijgt — Wouter Ransijn, plaatshouder voor foto en bio
15. Veelgestelde vragen — de negen vragen uit de briefing
16. Slot-CTA met contactformulier
17. Footer — met telefoon +31 6 14486257 en KvK 64493423

De Pickaxe-chatbot verdwijnt van de pagina (hij veroorzaakt ook de huidige laadfout). De vier SEO-pagina's blijven staan; hun knoppen gaan naar het nieuwe contactformulier in plaats van de demo-popup. De oude demo-boekingspopup vervalt.

## Contactformulier

Velden: naam, bedrijf, e-mail, telefoon (optioneel), "Waar zit je nu?" en "Waar loop je tegenaan?". Aanvragen worden opgeslagen in je eigen systeem en je krijgt er een melding van per e-mail. Ze zijn terug te zien in het beheerpaneel. Na verzenden verschijnt een bevestiging in beeld.

## Nog nodig van jou

- **Scanprijs** — voorstel €1.450 ex. btw; zeg het als je een ander bedrag wilt, anders zet ik €1.450 erin.
- **E-mailadres** — zowel voor in de footer als voor de meldingen van nieuwe aanvragen.
- **Eigen domein voor e-mail** — meldingen versturen kan alleen vanaf een domein dat van jou is. Zodra dat ingesteld is, werken de meldingen; tot die tijd worden aanvragen wel gewoon opgeslagen.
- Foto en korte bio, en eventuele extra klantcases (staan nu als zichtbare plaatshouder).

## Technische aanpak

- Teksten en cijfers komen in `src/content/site.ts` als getypeerde objecten; secties worden losse componenten in `src/components/sections/` die daaruit lezen.
- `src/routes/index.tsx` wordt de samenstelling van die secties plus route-`head()` met titel, description, OG/Twitter-tags en JSON-LD (`ProfessionalService` + `FAQPage` met de negen vragen).
- Bestaande designtokens in `src/styles.css` worden hergebruikt; toevoegen: een `--warn`-token (koraalrood) voor de faalcijfers, en een `count-up`-gedrag voor de grote getallen. `Reveal` uit `src/hooks/use-reveal.tsx` blijft de scroll-animatie; `prefers-reduced-motion` blijft gerespecteerd.
- `HeroNetwork` blijft ongewijzigd en wordt in de nieuwe hero gemonteerd.
- Nieuwe tabel `lead_requests` (naam, bedrijf, e-mail, telefoon, fase, bericht, tijdstip) met RLS: alleen beheerders kunnen aanvragen inzien; inserts lopen via de server, niet rechtstreeks vanuit de browser.
- Verzending via een server-route met Zod-validatie plus eenvoudige snelheidsbegrenzing; daarna een app-e-mailsjabloon (React Email) naar jouw adres. Chatbot-embed en de demo-modal-code worden verwijderd.
- Anker-links scrollen soepel met offset voor de sticky header.
