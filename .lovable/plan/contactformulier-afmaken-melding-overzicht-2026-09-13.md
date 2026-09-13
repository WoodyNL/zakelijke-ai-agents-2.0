# Contactformulier afmaken: melding + overzicht

## Wat er nu gebeurt

Het formulier werkt technisch al: je testaanvraag van vanavond (20:03) is netjes opgeslagen, samen met een eerdere test van vanmiddag. Wat ontbreekt is alles wat je zou laten *merken* dat er een aanvraag is:

- er gaat geen e-mail naar jou bij een nieuwe aanvraag
- er is geen plek in het beheerpaneel waar je de aanvragen kunt teruglezen
- er is nog geen eigen verzenddomein ingesteld

Daardoor voelt het alsof het formulier niets doet, terwijl de aanvragen wél binnenkomen.

## Wat ik ga doen

1. **Melding per e-mail** — bij elke nieuwe aanvraag krijg je direct een bericht met naam, bedrijf, e-mail, telefoon, de gekozen fase en het bericht. De Resend-sleutel die je net hebt opgeslagen wordt hiervoor gebruikt. Zolang er geen eigen verzenddomein is, gaat de melding via het testadres van Resend en kan die alleen naar jouw eigen e-mailadres (wouterransijn@gmail.com). Zodra je een eigen domein koppelt, zet ik de afzender om naar jouw adres.
2. **Overzicht in het beheerpaneel** — een blok "Aanvragen" op de beheerpagina met alle binnengekomen aanvragen, nieuwste bovenaan, met datum en tijd, en een klikbaar e-mailadres en telefoonnummer.
3. **Bevestiging aan de aanvrager** — optioneel; standaard doe ik dit nog niet omdat het pas kan zodra jouw eigen domein actief is. Zeg het als je dit wel meteen wilt voorbereiden.
4. **Storingsvast** — mislukt het versturen van de melding, dan blijft de aanvraag gewoon opgeslagen en krijgt de bezoeker alsnog een bevestiging in beeld. Je verliest dus nooit een lead door een e-mailprobleem.

## Technische aanpak

- `submitLeadRequest` in `src/lib/leads.functions.ts`: na de insert een `fetch` naar de Resend API (`process.env['RESEND_API_KEY']`, gelezen binnen de handler), afzender `onboarding@resend.dev`, ontvanger het beheerdersadres; verzending in try/catch zodat een fout de insert niet ongedaan maakt.
- Nieuwe serverfunctie `listLeadRequests` met `.middleware([requireSupabaseAuth])` die via `context.supabase` leest; RLS op `lead_requests` blijft admin-only, geen admin-client voor gewone reads.
- `src/routes/_authenticated/admin.tsx` krijgt een tabel/kaartlijst die die functie via `useServerFn` + `useQuery` aanroept (geen loader, route zit al achter de auth-gate).
- Geen wijziging aan het formulier zelf in `src/components/sections/contact.tsx`.
