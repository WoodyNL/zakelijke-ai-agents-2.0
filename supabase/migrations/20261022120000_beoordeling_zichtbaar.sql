-- Waarom de agent niet antwoordde, bewaren in plaats van weggooien.
--
-- De agent beoordeelt elk binnengekomen bericht en besluit te antwoorden, het
-- te negeren, of het aan een mens te laten. Dat oordeel ging naar de
-- logregels van de server en verder nergens heen. Op het antwoordenscherm
-- stond dan "De agent heeft hier niet op geantwoord" — waar en volstrekt
-- nutteloos, want de enige vraag die je dan hebt is waarom niet.
--
-- Zonder dit is het verschil tussen "hij heeft al drie keer geantwoord",
-- "dit lijkt een automatisch bericht" en "het opstellen ging stuk" van buiten
-- niet te zien. Drie heel verschillende dingen, met drie heel verschillende
-- vervolgstappen.
--
-- Herhaalbaar: twee kolommen die er al kunnen zijn.

ALTER TABLE public.outbound_replies
  ADD COLUMN IF NOT EXISTS beoordeling text,
  ADD COLUMN IF NOT EXISTS beoordeeld_op timestamptz;

COMMENT ON COLUMN public.outbound_replies.beoordeling IS
  'Wat de agent met dit bericht deed en waarom. Vrije tekst, bedoeld om op het scherm te lezen — niet om op te zoeken of op te sturen.';

COMMENT ON COLUMN public.outbound_replies.beoordeeld_op IS
  'Wanneer de agent dit bericht beoordeelde. Leeg betekent: de agent is er nooit aan toegekomen, en dat is zelf ook een antwoord.';
