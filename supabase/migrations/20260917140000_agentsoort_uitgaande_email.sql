-- Een agentsoort voor uitgaande e-mail.
--
-- De vijf bestaande soorten gaan er allemaal van uit dat iemand zich meldt en
-- de agent antwoordt. De proefpakket-agent van FJ Snacks doet het omgekeerde:
-- hij neemt zelf contact op. Bij gebrek aan iets beters stond hij op
-- 'Maatwerk', en dat heeft een gevolg dat verder gaat dan een etiket.
--
-- Aan de soort hangt namelijk of het portaal zegt dat er een kennisbank bij
-- hoort. Bij 'Maatwerk' staat die uit, en dan krijgt de klant op het
-- kennisbankscherm te lezen dat zijn prijzen en voorwaarden bewaard worden
-- voor een chat-assistent die ooit komt. Frank krijgt geen chat-assistent en
-- heeft geen websitebezoekers; hij heeft die kennis nodig om zijn eigen
-- klanten te kunnen antwoorden op hun mail.
--
-- Een aparte waarde is hier dus geen netheid maar het verschil tussen een
-- scherm dat klopt en een scherm dat iets belooft wat niet komt.

ALTER TYPE public.agent_kind ADD VALUE IF NOT EXISTS 'uitgaande_email';
