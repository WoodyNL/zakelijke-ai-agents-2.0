-- De website-assistent leest de kennisbank om bezoekersvragen te beantwoorden.
-- Actieve items zijn per definitie openbaar: de assistent vertelt ze hardop aan
-- iedereen die het vraagt. Daarom mogen anonieme bezoekers ze lezen, en hoeft de
-- assistent geen service-role-sleutel te gebruiken.
--
-- Concepten (is_active = false) blijven afgeschermd, zodat je aan een item kunt
-- werken zonder dat de assistent half werk voorleest. Schrijven blijft
-- voorbehouden aan beheerders; het bestaande beleid "Admins manage knowledge"
-- blijft ongewijzigd.

GRANT SELECT ON public.knowledge_items TO anon;

CREATE POLICY "Anyone can read active knowledge"
ON public.knowledge_items
FOR SELECT
TO anon, authenticated
USING (is_active = true);
