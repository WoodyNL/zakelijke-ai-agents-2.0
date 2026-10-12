-- Tweestapsverificatie: weten of iemand hem aan heeft, en of hij hem gebruikt.
--
-- Het inloggen met een code doet Supabase zelf. Wat hier bij komt, is wat de
-- app moet weten om er iets mee te kunnen:
--
--   heeft_tweestaps()      staat er een bevestigde app ingesteld?
--   mijn_toegangsniveau()  heeft deze sessie die tweede stap ook echt gezet?
--
-- Dat tweede is het punt. Een beheerder die tweestapsverificatie aanzet maar
-- daarna blijft werken in een sessie van vóór die tijd, is niet beter af. De
-- server weigert beheerhandelingen zodra iemand een tweede stap heeft maar
-- die in deze sessie niet heeft gebruikt.
--
-- Niet afdwingen voor wie het nog niet aan heeft: dan sluit je jezelf buiten op
-- het moment dat het misgaat. Het beheerscherm dringt erop aan; de dwang komt
-- pas als het voor iedereen aanstaat.

CREATE OR REPLACE FUNCTION public.mijn_toegangsniveau()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(nullif(auth.jwt() ->> 'aal', ''), 'aal1')
$$;
REVOKE EXECUTE ON FUNCTION public.mijn_toegangsniveau() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mijn_toegangsniveau() TO authenticated;

-- Leest in het auth-schema, waar een gewone gebruiker niet bij kan. Daarom
-- SECURITY DEFINER, en daarom alleen over jezelf: er is geen parameter.
CREATE OR REPLACE FUNCTION public.heeft_tweestaps()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.mfa_factors f
    WHERE f.user_id = auth.uid() AND f.status = 'verified'
  )
$$;
REVOKE EXECUTE ON FUNCTION public.heeft_tweestaps() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.heeft_tweestaps() TO authenticated;

-- Beide in één aanroep, want de app heeft ze altijd samen nodig: staat hij aan,
-- en is hij in deze sessie gebruikt.
CREATE OR REPLACE FUNCTION public.mijn_tweestaps()
RETURNS TABLE (ingesteld boolean, niveau text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM auth.mfa_factors f
      WHERE f.user_id = auth.uid() AND f.status = 'verified'
    ),
    coalesce(nullif(auth.jwt() ->> 'aal', ''), 'aal1')
$$;
REVOKE EXECUTE ON FUNCTION public.mijn_tweestaps() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mijn_tweestaps() TO authenticated;
