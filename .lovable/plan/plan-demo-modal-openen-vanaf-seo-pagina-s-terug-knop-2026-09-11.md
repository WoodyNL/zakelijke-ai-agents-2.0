# Plan: Demo-modal openen vanaf SEO-pagina's + terug-knop

## Probleem
De "Plan een gratis demo" knoppen op de 4 SEO-pagina's (`/ai-agents-amsterdam`, `/ai-lead-opvolging`, `/whatsapp-follow-up-automatiseren`, `/ai-klantenservice-automatiseren`) linken naar `/` (de landingspagina), maar de landingspagina leest de `#demo` hash niet uit. De bezoeker komt dus op de landingspagina aan zonder dat de boekingsmodal opent. Daarnaast ontbreekt een expliciete "terug naar home" knop.

## Wijzigingen

### 1. Landingspagina opent modal op `#demo` — `src/routes/index.tsx`
- Importeer `useRouterState` uit `@tanstack/react-router`.
- Lees de actieve hash: `const hash = useRouterState({ select: (s) => s.location.hash })`.
- Voeg een `useEffect` toe in `Index` die `setBookingOpen(true)` aanroept wanneer `hash` gelijk is aan `"demo"` of `"#demo"`.
- Zo opent de boekingsmodal automatisch zodra iemand vanaf een SEO-pagina (of een gedeelde `/#demo` link) op de landingspagina aankomt.

### 2. SEO-pagina's sturen naar `/#demo` — `src/components/seo-page.tsx`
- Vervang de drie `<Link to="/">` demo-knoppen (header "Plan een demo", hero "Plan een gratis demo", eind-CTA "Plan een gratis demo") door `<Link to="/" hash="demo">`.
- TanStack Router Link ondersteunt de `hash` prop; dit navigeert naar de landingspagina met `#demo`, waarna stap 1 de modal opent.

### 3. Terug-knop naar landingspagina — `src/components/seo-page.tsx`
- Voeg in de header-balk (naast logo / Klantlogin / Plan een demo) een "← Terug naar home" knop toe, of direct onder de kruimelpad-navigatie, als een duidelijke `<Link to="/">` knop in de huisstijl.
- Dit geeft bezoekers op alle 4 SEO-pagina's een eenduidige manier om terug naar de landingspagina te gaan.

## Bestanden die aangepast worden
- `src/routes/index.tsx` — hash-detectie + auto-open modal (alleen `Index` component, ~4 regels toegevoegd).
- `src/components/seo-page.tsx` — 3 demo-links naar `hash="demo"` + 1 terug-knop.

## Niet wijzigen
- Inhoud/copy van de SEO-pagina's of landingspagina.
- Booking-modal zelf (`BookingModal` component).
- Overige routes.

## Verificatie
- Playwright: open elke SEO-pagina, klik "Plan een gratis demo", bevestig dat landingspagina laadt met `#demo` en de boekingsmodal direct opent.
- Bevestig dat de "Terug naar home" knop zichtbaar is en naar `/` navigeert.
- TypeScript-check (`bunx tsgo --noEmit`) doorloopt zonder fouten.
