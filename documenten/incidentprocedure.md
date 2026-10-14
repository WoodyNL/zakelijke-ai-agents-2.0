# Incidentprocedure

> **Voor jezelf, niet voor de klant** — al mag een klant hem inzien, en dat
> staat ook in de verwerkersovereenkomst. Het nut zit niet in het bestaan van
> deze procedure maar in het feit dat je hem leest op het moment dat je hoofd
> niet helder is. Hou hem daarom kort.
>
> Laatst bijgewerkt: 14 oktober 2026.

## Wanneer is het een incident?

Alles waarbij gegevens zichtbaar zijn geworden voor wie ze niet mocht zien, of
waarbij je dat niet kunt uitsluiten. Twijfel je of het er een is, behandel het
dan als een incident. Achteraf vaststellen dat het meeviel kost een uur; het
omgekeerde kost een klant.

Vier soorten die hier realistisch zijn:

1. **Toegang bij de verkeerde.** Een fout in de rechten waardoor klant A iets
   van klant B kon zien. Dit is de ernstigste, want het raakt de belofte waarop
   het hele portaal rust.
2. **Een account overgenomen.** Een wachtwoord dat uitlekt, een telefoon die
   kwijtraakt.
3. **Een agent die iets verkeerds doet.** Een antwoord naar de verkeerde
   ontvanger, een campagne naar de verkeerde lijst, een agent die iets prijsgeeft
   wat niet voor de ontvanger bestemd was.
4. **Een leverancier.** Supabase, Cloudflare, Anthropic of Resend meldt een lek.

## Direct (het eerste uur)

1. **Zet het stil.** Pauzeer de betrokken agent in het beheer, of zet de klant
   tijdelijk op pauze. Liever een paar uur geen agent dan nog meer schade.
2. **Verander niets anders.** Geen regels weggooien, geen "even snel opruimen".
   Je hebt de sporen straks nodig en het logboek is niet te wijzigen — dat is
   precies de bedoeling.
3. **Leg vast wat je weet.** Begin een regel in het incidentregister onderaan
   dit document: tijdstip, wat je zag, hoe je het merkte.
4. **Stel de omvang vast.** Welke klanten, welke gegevens, hoeveel betrokkenen,
   over welke periode. Gebruik het beheerlog en de toegangslog; die gaan twee
   jaar terug.

## Binnen 24 uur

5. **Meld het bij de klant.** Dat is een harde afspraak uit de
   verwerkersovereenkomst: binnen 24 uur nadat je het weet, ook als je het nog
   niet helemaal begrijpt. Zeg dan wat je weet, wat je nog uitzoekt en wanneer
   je terugkomt.
6. **Zeg wat de klant zelf moet doen.** Hij is de verwerkingsverantwoordelijke;
   hij beslist over de melding bij de Autoriteit Persoonsgegevens en over het
   informeren van zijn eigen klanten. Lever hem alles aan wat hij daarvoor nodig
   heeft, zodat hij de 72 uur haalt.
7. **Dicht het gat.** Pas de code of de instelling aan, test het lokaal met de
   migratiesuite, en laat het publiceren. Schrijf een test die precies dit
   geval afdekt — zonder die test is het niet gedicht maar verplaatst.

## Binnen 72 uur

8. **De melding bij de AP** doet de klant. Gaat het om gegevens waarvoor wij
   zelf verantwoordelijk zijn (bezoekers van onze eigen site, onze eigen
   aanvragen), dan melden wij zelf, via het meldloket van de Autoriteit
   Persoonsgegevens.
9. **Betrokkenen informeren** is nodig als het waarschijnlijk een hoog risico
   oplevert voor hun rechten en vrijheden. Dat oordeel is aan de klant, maar
   adviseer eerlijk: bij uitgelekte gespreksinhoud of e-mail is het antwoord
   meestal ja.

## Daarna (binnen twee weken)

10. **Schrijf het op** voor de klant: wat er is gebeurd, hoe het kon, wat je
    hebt gedaan en wat je verandert. Eén A4 is genoeg. Dit is wat een klant
    onthoudt — niet het incident zelf, maar of je het netjes afhandelde.
11. **Vul het register in** (onderaan). Ook als er geen melding nodig was: de
    AVG verlangt dat je elk datalek registreert, ook de niet-gemelde.
12. **Eén verbetering, geen tien.** Kies de maatregel die dit geval echt had
    voorkomen en voer hem uit. Een lijst van tien voornemens na een incident is
    een lijst die niemand afmaakt.

## Wie wat doet

Zolang het bedrijf uit één persoon bestaat, doet Wouter alles hierboven. Dat is
geen probleem zolang het opgeschreven staat — maar het betekent wel: **meld het
bij de klant voordat je begint met repareren.** Anders zit je om drie uur 's
nachts te debuggen terwijl de klant nog van niets weet.

Komt er een tweede persoon bij, verdeel dan zo: één iemand praat met de klant,
één iemand repareert. Niet dezelfde.

## Contact

- Autoriteit Persoonsgegevens, meldloket datalekken: autoriteitpersoonsgegevens.nl
- Supabase, Cloudflare, Anthropic, Resend: via hun eigen statuspagina en support.

## Incidentregister

Elk incident krijgt hier een regel, ook als er niets gemeld hoefde te worden.

| Datum | Wat er gebeurde | Welke gegevens | Hoeveel betrokkenen | Gemeld bij klant | Gemeld bij AP | Wat we veranderd hebben |
|---|---|---|---|---|---|---|
| | | | | | | |
