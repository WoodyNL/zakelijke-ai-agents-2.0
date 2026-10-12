CREATE TABLE IF NOT EXISTS public.beheerlog (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  moment timestamptz NOT NULL DEFAULT now(),
  door uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  door_naam text NOT NULL DEFAULT '',
  door_rol text NOT NULL DEFAULT 'klant' CHECK (door_rol IN ('admin', 'support', 'klant')),
  actie text NOT NULL CHECK (length(actie) BETWEEN 3 AND 60),
  client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  omschrijving text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX IF NOT EXISTS beheerlog_moment_idx ON public.beheerlog (moment DESC);
CREATE INDEX IF NOT EXISTS beheerlog_klant_idx ON public.beheerlog (client_id, moment DESC);

ALTER TABLE public.beheerlog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.beheerlog FROM anon, authenticated;
GRANT SELECT ON public.beheerlog TO authenticated;
GRANT ALL ON public.beheerlog TO service_role;

DROP POLICY IF EXISTS beheerlog_lezen ON public.beheerlog;
CREATE POLICY beheerlog_lezen ON public.beheerlog
  FOR SELECT TO authenticated
  USING (private.is_staf(auth.uid()) OR client_id = private.mijn_klant(auth.uid()));

CREATE OR REPLACE FUNCTION public.leg_vast(
  _actie text,
  _omschrijving text DEFAULT '',
  _client_id uuid DEFAULT NULL,
  _agent_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rol text;
  naam text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  SELECT CASE
           WHEN private.has_role(auth.uid(), 'admin'::app_role) THEN 'admin'
           WHEN private.is_staf(auth.uid()) THEN 'support'
           ELSE 'klant'
         END
    INTO rol;
  SELECT coalesce(nullif(p.name, ''), p.email, 'Onbekend') INTO naam
  FROM public.profiles p WHERE p.id = auth.uid();

  INSERT INTO public.beheerlog
    (door, door_naam, door_rol, actie, client_id, agent_id, omschrijving, details)
  VALUES (
    auth.uid(),
    coalesce(naam, 'Onbekend'),
    rol,
    left(_actie, 60),
    _client_id,
    _agent_id,
    left(coalesce(_omschrijving, ''), 300),
    CASE WHEN jsonb_typeof(coalesce(_details, '{}'::jsonb)) = 'object'
         THEN coalesce(_details, '{}'::jsonb) ELSE '{}'::jsonb END
  );
END
$$;
REVOKE EXECUTE ON FUNCTION public.leg_vast(text, text, uuid, uuid, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.leg_vast(text, text, uuid, uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.mijn_logboek(_aantal integer DEFAULT 50)
RETURNS TABLE (
  id bigint,
  moment timestamptz,
  door text,
  door_rol text,
  actie text,
  omschrijving text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.moment,
         CASE WHEN b.door_rol = 'klant' THEN b.door_naam ELSE 'Zakelijke AI Agents' END,
         b.door_rol, b.actie, b.omschrijving
  FROM public.beheerlog b
  WHERE b.client_id = private.mijn_klant(auth.uid())
  ORDER BY b.moment DESC
  LIMIT greatest(least(_aantal, 200), 1)
$$;
REVOKE EXECUTE ON FUNCTION public.mijn_logboek(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mijn_logboek(integer) TO authenticated;