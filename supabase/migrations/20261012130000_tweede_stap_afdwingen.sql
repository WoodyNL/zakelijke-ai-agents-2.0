-- De tweede stap afdwingen, en wel op de plek waar het telt.
--
-- Wat er misging: tweestapsverificatie aanzetten voegde een code toe aan het
-- inloggen, maar wie alleen zijn wachtwoord gaf kwam nog steeds binnen.
-- Supabase weigert zo'n inlog niet; het geeft de sessie het niveau 'aal1' en
-- laat aan de app over om de tweede stap te eisen. Die eis ontbrak.
--
-- Het inlogscherm vraagt vanaf nu om de code. Maar een scherm dat iets vraagt
-- is geen slot: wie met een token rechtstreeks de database aanspreekt, komt
-- daar niet langs. Daarom staat de eis hier, in de twee functies waar al onze
-- policies op leunen.
--
--   private.has_role()  de beheerder
--   private.is_staf()   de beheerder en support
--
-- Beide zeggen vanaf nu "nee" zolang iemand met tweestapsverificatie die stap
-- in deze sessie niet heeft gezet. Elke policy en elke SECURITY DEFINER-functie
-- die erop leunt, erft dat; er is geen lijstje dat we kunnen vergeten bij te
-- werken.
--
-- Drie grenzen, bewust:
--
--   Wie geen tweestapsverificatie aan heeft, verandert niets. Anders sluit het
--   aanzetten van beveiliging iemand buiten op het verkeerde moment.
--
--   De eis geldt alleen als de vraag over jezelf gaat. Beide functies worden
--   ook gebruikt om een naam te bepalen ("wie veranderde dit?"), met het id van
--   iemand anders. Dat is geen toegangsvraag, en het niveau van mijn sessie
--   zegt niets over die ander.
--
--   De klant zelf valt hier niet onder. Zijn portaal loopt via mijn_klant() en
--   owns_agent(), en die laten we staan: een klant die zich buitensluit uit zijn
--   eigen portaal is een ergere storing dan de winst. Het inlogscherm vraagt
--   hem de code wel.

CREATE OR REPLACE FUNCTION private.tweede_stap_ok(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT
    -- Gaat de vraag over iemand anders, dan is dit geen toegangsvraag.
    _user_id IS DISTINCT FROM auth.uid()
    -- Deze sessie heeft de tweede stap gezet.
    OR coalesce(nullif(auth.jwt() ->> 'aal', ''), 'aal1') = 'aal2'
    -- Of er is niets om te zetten.
    OR NOT EXISTS (
      SELECT 1 FROM auth.mfa_factors f
      WHERE f.user_id = _user_id AND f.status = 'verified'
    )
$$;
REVOKE EXECUTE ON FUNCTION private.tweede_stap_ok(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION private.tweede_stap_ok(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  ) AND private.tweede_stap_ok(_user_id)
$$;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- Als tekst vergeleken, net als in fase 2: 'support' kwam later in app_role.
CREATE OR REPLACE FUNCTION private.is_staf(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'support')
  ) AND private.tweede_stap_ok(_user_id)
$$;
REVOKE EXECUTE ON FUNCTION private.is_staf(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION private.is_staf(uuid) TO authenticated;
