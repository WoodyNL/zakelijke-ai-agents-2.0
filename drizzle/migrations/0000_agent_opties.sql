ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS opties jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_opties_object;
ALTER TABLE public.agents
  ADD CONSTRAINT agents_opties_object CHECK (jsonb_typeof(opties) = 'object');

CREATE OR REPLACE FUNCTION public.zet_mijn_agent_opties(_agent_id uuid, _opties jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  nieuw jsonb;
BEGIN
  IF NOT private.owns_agent(_agent_id, auth.uid()) THEN
    RAISE EXCEPTION 'Deze agent bestaat niet, of is niet van jou.';
  END IF;
  IF _opties IS NULL OR jsonb_typeof(_opties) <> 'object' THEN
    RAISE EXCEPTION 'Ongeldige opties.';
  END IF;
  UPDATE public.agents
  SET opties = coalesce(opties, '{}'::jsonb) || _opties
  WHERE id = _agent_id
  RETURNING opties INTO nieuw;
  RETURN nieuw;
END
$$;
REVOKE EXECUTE ON FUNCTION public.zet_mijn_agent_opties(uuid, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.zet_mijn_agent_opties(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.zet_mijn_agent_velden(
  _agent_id uuid,
  _tone text DEFAULT NULL,
  _welcome_text text DEFAULT NULL,
  _notify_email text DEFAULT NULL,
  _capture_leads boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.owns_agent(_agent_id, auth.uid()) THEN
    RAISE EXCEPTION 'Deze agent bestaat niet, of is niet van jou.';
  END IF;
  UPDATE public.agents
  SET tone = coalesce(_tone, tone),
      welcome_text = coalesce(_welcome_text, welcome_text),
      notify_email = coalesce(_notify_email, notify_email),
      capture_leads = coalesce(_capture_leads, capture_leads)
  WHERE id = _agent_id;
END
$$;
REVOKE EXECUTE ON FUNCTION public.zet_mijn_agent_velden(uuid, text, text, text, boolean)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.zet_mijn_agent_velden(uuid, text, text, text, boolean)
  TO authenticated;