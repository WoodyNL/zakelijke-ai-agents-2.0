CREATE OR REPLACE FUNCTION public.mijn_toegangsniveau()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(nullif(auth.jwt() ->> 'aal', ''), 'aal1')
$$;
REVOKE EXECUTE ON FUNCTION public.mijn_toegangsniveau() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mijn_toegangsniveau() TO authenticated;

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