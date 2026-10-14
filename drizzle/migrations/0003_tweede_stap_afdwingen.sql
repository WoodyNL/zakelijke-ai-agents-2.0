CREATE OR REPLACE FUNCTION private.tweede_stap_ok(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT
    _user_id IS DISTINCT FROM auth.uid()
    OR coalesce(nullif(auth.jwt() ->> 'aal', ''), 'aal1') = 'aal2'
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