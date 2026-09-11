# Kennisbank: Cadence hernoemen naar Zakelijke AI Agents

In de kennisbank staan 13 kennisstukken waarin nog de oude bedrijfsnaam "Cadence" voorkomt (titels, vragen en inhoud — bijv. "Wat is Cadence?", "Hoe communiceert Cadence?", vergelijkingen met concurrenten en ROI-cijfers). De landingspagina en het portaal gebruiken al de nieuwe naam; alleen de database-inhoud is nog niet bijgewerkt.

## Wat ik doe

1. **Database-update op `knowledge_items`**: in alle rijen "Cadence" vervangen door "Zakelijke AI Agents" in de velden titel, vraag en inhoud — ook kleine letters ("cadence-website" wordt "de website van Zakelijke AI Agents", zodat er geen vreemde naam in de tekst blijft hangen).
2. **Controle achteraf**: opnieuw tellen dat er 0 rijen meer met "Cadence" zijn en steekproefsgewijs een paar stukken tonen zodat de zinnen natuurlijk lezen.

## Wat je daarna ziet

- Op de Kennis-pagina staat overal de nieuwe naam.
- Het trainingsbestand (JSON en tekst) dat je downloadt bevat geen "Cadence" meer — de agent die je ermee traint gebruikt alleen "Zakelijke AI Agents".

## Technisch

- Eén SQL-update op `public.knowledge_items` met `replace()` op `title`, `question` en `content`; daarna handmatige nabewerking waar een letterlijke vervanging taalkundig onlogisch zou zijn (bijv. "Waarom Cadence goedkoper is" → "Waarom Zakelijke AI Agents goedkoper is").
- Geen codewijzigingen nodig: de export-kop in `src/lib/knowledge.functions.ts` gebruikt al de nieuwe naam.
