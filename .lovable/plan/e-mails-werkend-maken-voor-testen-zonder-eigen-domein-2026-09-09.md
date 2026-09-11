# E-mails werkend maken voor testen (zonder eigen domein)

## Doel
De gebruiker wil eerst alles kunnen testen zónder meteen een domein aan te schaffen. Bevestigings-, activatie- en wachtwoord-mails moeten daarvoor niet blokkeren.

## Huidige situatie
- Er is geen e-maildomein gekoppeld aan het project.
- Accountbevestiging staat al uitgeschakeld als blokkade (auto-bevestiging aan), dus nieuwe accounts werken direct zonder mail.
- Alleen "wachtwoord vergeten" is afhankelijk van een echte e-mail.

## Plan

1. **Testen zonder mails**
   - Nieuwe accounts zijn meteen actief na aanmelden — geen bevestigingsmail nodig.
   - Inloggen werkt direct; dit is voldoende om de app volledig te testen.

2. **Wachtwoord-reset testen**
   - Een test-reset versturen naar een bestaand testaccount.
   - Controleren of de standaard Lovable-afzendermail aankomt (inclusief spam-map) en of de reset-link werkt.

3. **Duidelijke tekst in de app**
   - Op de inlogpagina bij "wachtwoord vergeten" een hint toevoegen dat de mail enkele minuten kan duren en in spam kan terechtkomen.

4. **Later: eigen domein (buiten dit plan)**
   - Zodra de gebruiker een domein aanschaft, stellen we merkmails in onder de naam "Cadence" (bijv. noreply@domein.nl) voor betrouwbare bezorging.

## Technische details
- Geen nieuwe infrastructuur nodig; bestaande standaard afzender van het platform wordt gebruikt.
- Alleen een kleine copy-aanpassing in `src/routes/auth.tsx`.
