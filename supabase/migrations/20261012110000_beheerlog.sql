-- Het logboek: wie veranderde wat, en bij welke klant.
--
-- Tot nu toe lag alleen vast wat een agent deed (agent_gebeurtenissen) en
-- wanneer er is meegekeken (meekijksessies). Wat wíj aan een agent wijzigden,
-- wie een klant aanmaakte of verwijderde, en wie een collega uitnodigde, stond
-- nergens. Dat is de eerste vraag in elk gesprek over beveiliging, en het is
-- ook wat je zelf nodig hebt als er iets anders staat dan je verwachtte.
--
-- Twee keuzes die het logboek bruikbaar houden:
--
--   1. Het is onveranderlijk. Niemand mag erin schrijven of iets wijzigen,
--      ook de beheerder niet; vastleggen gaat via één functie die zelf bepaalt
--      wie de handeling deed. Een log dat je kunt aanpassen, bewijst niets.
--   2. De klant leest mee. Alles wat over zijn account gaat, ziet hij in zijn
--      portaal. Daarom staat er in `details` nooit inhoud van een klant, maar
--      alleen wat er is gewijzigd en waarin.

CREATE TABLE IF NOT EXISTS public.beheerlog (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  moment timestamptz NOT NULL DEFAULT now(),
  -- Wie het deed. Blijft leeg als het account later wordt verwijderd; de
  -- naam die we toen vastlegden blijft wel staan.
  door uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  door_naam text NOT NULL DEFAULT '',
  door_rol text NOT NULL DEFAULT 'klant' CHECK (door_rol IN ('admin', 'support', 'klant')),
  -- Wat er gebeurde, als vaste code: 'agent.gewijzigd', 'klant.verwijderd'.
  actie text NOT NULL CHECK (length(actie) BETWEEN 3 AND 60),
  -- Over wie het ging. Allebei mogen leeg zijn: een nieuwe klant heeft nog
  -- geen agent, en een medewerker hoort bij geen enkele klant.
  client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  /** Korte, leesbare omschrijving; geen inhoud van de klant. */
  omschrijving text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX IF NOT EXISTS beheerlog_moment_idx ON public.beheerlog (moment DESC);
CREATE INDEX IF NOT EXISTS beheerlog_klant_idx ON public.beheerlog (client_id, moment DESC);

ALTER TABLE public.beheerlog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.beheerlog FROM anon, authenticated;
GRANT SELECT ON public.beheerlog TO authenticated;
GRANT ALL ON public.beheerlog TO service_role;

-- Wij zien alles; een klant ziet wat over zijn eigen account gaat. Dat laatste
-- is het punt: "jij houdt de controle" betekent ook dat je kunt zien wat wij
-- bij je hebben gedaan.
DROP POLICY IF EXISTS beheerlog_lezen ON public.beheerlog;
CREATE POLICY beheerlog_lezen ON public.beheerlog
  FOR SELECT TO authenticated
  USING (private.is_staf(auth.uid()) OR client_id = private.mijn_klant(auth.uid()));

-- Vastleggen kan alleen hiermee, en wie het deed bepaalt de database zelf.
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

-- Voor de klant: wat wij bij hem deden, met onze naam erbij. Via een functie,
-- omdat hij onze profielen niet mag lezen.
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
