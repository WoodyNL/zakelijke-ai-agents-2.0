# Weer inloggen als beheerder

Je beheerdersaccount (wouterransijn@gmail.com) bestaat, is bevestigd en heeft eerder ingelogd. De mislukte pogingen komen alleen door een verkeerd wachtwoord. Omdat herstelmail nog niet betrouwbaar aankomt (geen eigen e-maildomein), zetten we het wachtwoord direct.

## Wat ik ga doen

1. **Wachtwoord instellen**
   Ik zet het wachtwoord van wouterransijn@gmail.com op `Test12345!`. Daarna log je in via de inlogpagina en kom je binnen als beheerder.

2. **Wachtwoord zelf kunnen wijzigen**
   Een nieuwe pagina "Account" in het portaal (bereikbaar vanuit de navigatie, alleen als je bent ingelogd) met:
   - huidig wachtwoord
   - nieuw wachtwoord + herhalen
   - duidelijke bevestiging of foutmelding

3. **Kleine hersteltaak**
   De inlogpagina geeft nu een technische waarschuwing bij het laden. Die los ik meteen op zodat de pagina schoon en snel opent.

## Technische details

- Wachtwoord zetten via de Auth Admin API (service role) in een eenmalige server-side actie; niet als permanente route in de app.
- Nieuwe route `src/routes/_authenticated/account.tsx` die `supabase.auth.updateUser({ password, current_password })` gebruikt, plus een link in `src/components/dashboard-shell.tsx`.
- Auth-pagina: hydration-mismatch oplossen door de sessiecheck/redirect pas na hydratatie te laten renderen.

## Later (niet nu)

Zodra je een eigen domein hebt, richt ik de afzender "Cadence" in zodat bevestigings- en herstelmails wel betrouwbaar aankomen.
