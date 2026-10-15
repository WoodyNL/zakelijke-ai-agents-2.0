# Een migratie echt draaien voordat je hem opgeeft

Deze map bestaat omdat er twee keer SQL naar Lovable ging die niet werkte. De
tweede keer was `min(id)` op een `uuid`: PostgreSQL heeft daar geen aggregaat
voor, want er is geen ordening waarin de "kleinste" uuid iets betekent. Dat is
niet te zien door naar de code te kijken en kostte een hele ronde.

Op deze Mac staat geen Postgres en geen Docker, en Lovable Cloud heeft geen
eigen dashboard. Maar met PGlite draait er wel echt een PostgreSQL.

## Opzetten

PGlite hoort **niet** in het project: een afhankelijkheid die wij toevoegen
komt niet bij Lovable terecht, en de migratietool daar heeft zijn eigen
pakketten. Dus in een aparte map:

```bash
mkdir -p /tmp/migratieproef && cd /tmp/migratieproef
npm init -y && npm install @electric-sql/pglite
cp <dit-pad>/*.mjs .
node test-migratie.mjs
```

`opzet.mjs` bouwt het kleinste stukje schema dat de migratie nodig heeft —
niet alle 35 migraties, alleen de tabellen en typen waar deze aan raakt. Dat
is genoeg om de SQL te laten falen als hij fout is, en het draait in een
seconde.

## Wat je altijd test bij een migratie die rijen toevoegt

- dat hij slaagt, en wat er daarna in de tabel staat
- **dat hij twee keer kan draaien**, want de migratietool van Lovable kan een
  bestand opnieuw aanbieden
- de randgevallen van zijn eigen aannames. Deze migratie zoekt de agent op en
  gaat ervan uit dat er precies één is; dus hoort er een proef bij met nul en
  met twee.
