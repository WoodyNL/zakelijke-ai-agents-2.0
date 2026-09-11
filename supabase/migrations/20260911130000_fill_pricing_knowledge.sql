-- Replace placeholder pricing text in the knowledge base with the real
-- packages shown on the public landing page (src/routes/index.tsx).
UPDATE public.knowledge_items
SET
  title = 'Pakket Start',
  question = 'Wat kost het instappakket?',
  content = '€495/maand + €795 eenmalige setup. "Je eerste agent, deze week live." Bevat: 1 AI agent naar keuze, 1 kanaal (e-mail of WhatsApp), tot 300 leads per maand, koppeling met je formulier of inbox. 3 maanden minimum, daarna maandelijks opzegbaar. Prijzen ex. btw.'
WHERE category = 'prijzen' AND title = 'Pakket 1 — VUL IN';

UPDATE public.knowledge_items
SET
  title = 'Pakket Groei',
  question = 'Wat kost het meest gekozen pakket?',
  content = '€895/maand + €1.295 eenmalige setup. "Meest gekozen — beste prijs per agent." Bevat: 2 AI agents (Sales + WhatsApp Follow-up), CRM- en agendakoppeling inbegrepen, tot 750 leads per maand, persoonlijke opvolging op beide kanalen. 3 maanden minimum, daarna maandelijks opzegbaar. Prijzen ex. btw.'
WHERE category = 'prijzen' AND title = 'Pakket 2 — VUL IN';

UPDATE public.knowledge_items
SET
  title = 'Pakket Compleet',
  question = 'Wat kost het uitgebreidste pakket?',
  content = '€1.395/maand + €1.795 eenmalige setup. "Alle agents, alle kanalen, 24/7." Bevat: alle 3 agents inbegrepen, onbeperkte kanalen, 2.000+ leads per maand, priority support, kwartaalreview van je strategie. 3 maanden minimum, daarna maandelijks opzegbaar. Prijzen ex. btw.'
WHERE category = 'prijzen' AND title = 'Pakket 3 — VUL IN';

UPDATE public.knowledge_items
SET
  title = 'Extra kosten en voorwaarden',
  content = 'Extra leads of gesprekken boven je bundel: €1,00 per stuk. WhatsApp-gesprekskosten van Meta rekenen we kosteloos door. Elke agent staat binnen een dag live. Alle drie pakketten: 3 maanden minimum, daarna maandelijks opzegbaar, geen jaarcontract, prijzen ex. btw.'
WHERE category = 'prijzen' AND title = 'Extra kosten en voorwaarden — VUL IN';
