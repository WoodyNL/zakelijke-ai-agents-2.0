-- De heractivatie-agent: wat er terugkomt, en voor wie hij werkt.
--
-- Technisch is dit de uitgaande e-mailagent met een andere lijst. Wat hij extra
-- nodig heeft, past in één kolom en twee functies:
--
--   teruggekomen_op        wanneer een slapende klant weer klant werd. De klant
--                          vinkt dat zelf aan; wij kunnen een bestelling niet
--                          zien. Dit is het ene getal waar de agent op wordt
--                          beoordeeld, dus het hoort bij het contact en niet
--                          in een notitie.
--   markeer_teruggekomen   het vinkje, alleen door de eigenaar.
--   heractivatie_kerncijfers  aantallen voor het dashboard: aangeschreven,
--                          gereageerd, teruggekomen. Aantallen, geen inhoud —
--                          laag A, dus ook voor ons leesbaar.
--
-- Wie slapend is en wie met rust gelaten wordt, rekent de server uit met
-- src/lib/slapend.ts, niet de database: die regels horen bij de instellingen
-- van de agent en moeten te testen zijn zonder database.

ALTER TABLE public.outbound_contacts
  ADD COLUMN IF NOT EXISTS teruggekomen_op timestamptz;

CREATE INDEX IF NOT EXISTS outbound_contacts_teruggekomen_idx
  ON public.outbound_contacts (agent_id, teruggekomen_op)
  WHERE teruggekomen_op IS NOT NULL;

-- Aan- én uitzetten: een vinkje dat per ongeluk is gezet, moet weer weg kunnen
-- zonder ons erbij.
CREATE OR REPLACE FUNCTION public.markeer_teruggekomen(_contact_id uuid, _terug boolean)
RETURNS timestamptz
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _agent uuid;
  _wanneer timestamptz;
BEGIN
  SELECT c.agent_id INTO _agent FROM public.outbound_contacts c WHERE c.id = _contact_id;
  IF _agent IS NULL OR NOT private.owns_agent(_agent, auth.uid()) THEN
    RAISE EXCEPTION 'Dit contact is niet van jou.';
  END IF;

  UPDATE public.outbound_contacts
  SET teruggekomen_op = CASE WHEN _terug THEN coalesce(teruggekomen_op, now()) ELSE NULL END
  WHERE id = _contact_id
  RETURNING teruggekomen_op INTO _wanneer;

  RETURN _wanneer;
END $$;
REVOKE EXECUTE ON FUNCTION public.markeer_teruggekomen(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.markeer_teruggekomen(uuid, boolean) TO authenticated;

-- Over een periode (standaard 90 dagen), zodat het dashboard "deze maand" en
-- "dit kwartaal" kan tonen zonder twee functies.
CREATE OR REPLACE FUNCTION public.heractivatie_kerncijfers(_agent_id uuid, _dagen integer DEFAULT 90)
RETURNS TABLE (
  aangeschreven bigint,
  gereageerd bigint,
  teruggekomen bigint,
  afgemeld bigint,
  in_lijst bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH toegang AS (
    SELECT 1 WHERE private.owns_agent(_agent_id, auth.uid()) OR private.is_staf(auth.uid())
  ),
  vanaf AS (
    SELECT now() - make_interval(days => greatest(least(coalesce(_dagen, 90), 3650), 1)) AS t
  )
  SELECT
    (SELECT count(DISTINCT m.contact_id) FROM public.outbound_messages m, vanaf
      WHERE m.agent_id = _agent_id AND m.stap = 1 AND m.verzonden_op >= vanaf.t),
    (SELECT count(DISTINCT r.contact_id) FROM public.outbound_replies r, vanaf
      WHERE r.agent_id = _agent_id AND r.ontvangen_op >= vanaf.t),
    (SELECT count(*) FROM public.outbound_contacts c, vanaf
      WHERE c.agent_id = _agent_id AND c.teruggekomen_op >= vanaf.t),
    (SELECT count(*) FROM public.outbound_contacts c, vanaf
      WHERE c.agent_id = _agent_id AND c.afgemeld_op >= vanaf.t),
    (SELECT count(*) FROM public.outbound_contacts c
      WHERE c.agent_id = _agent_id AND c.afgemeld_op IS NULL AND c.bounce_op IS NULL)
  FROM toegang
$$;
REVOKE EXECUTE ON FUNCTION public.heractivatie_kerncijfers(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.heractivatie_kerncijfers(uuid, integer) TO authenticated;
