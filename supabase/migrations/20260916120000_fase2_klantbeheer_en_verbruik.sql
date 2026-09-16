-- FASE 2 — de klant beheert zijn eigen kennisbank en ziet zijn verbruik.
--
-- Twee dingen die uit het testen met een echte klantaccount naar voren kwamen:
-- een klant kan zijn eigen kennisbank niet beheren, en hij ziet niet wat zijn
-- agent doet.

-- ---------------------------------------------------------------------------
-- 1. De aanname achter "tijd bespaard"
--
--    Verbruik kunnen we tellen; bespaarde tijd niet. Om van berichten naar uren
--    te komen is een aanname nodig, en die hoort per klant te worden afgesproken
--    in plaats van door ons verzonnen. Leeg betekent: we tonen geen tijdwinst,
--    want een getal dat gemeten lijkt maar geschat is, is erger dan geen getal.
--
--    De toelichting staat erbij zodat het dashboard kan laten zien waaróp de
--    schatting rust, bijvoorbeeld "gemiddelde afhandeltijd van een offerte-
--    aanvraag, gemeten bij de nulmeting in september".
-- ---------------------------------------------------------------------------

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS minutes_saved_per_action numeric(6, 2),
  ADD COLUMN IF NOT EXISTS minutes_saved_basis text;

-- ---------------------------------------------------------------------------
-- 2. Verbruik per dag, zodat een klant een verloop ziet
--
--    agent_usage telt per uur, wat precies genoeg is om een limiet te
--    handhaven maar onhandig om een maand mee te tonen. Deze functie telt op
--    naar dagen, en geeft alleen de agents terug waarvan de aanroeper eigenaar
--    is. De controle zit in de functie en niet alleen in RLS, zodat een klant
--    ook via een omweg niet bij het verbruik van een ander komt.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.agent_usage_daily(_agent_id uuid, _days integer DEFAULT 30)
RETURNS TABLE (dag date, requests bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (u.hour AT TIME ZONE 'Europe/Amsterdam')::date AS dag,
         sum(u.requests)::bigint AS requests
  FROM public.agent_usage u
  WHERE u.agent_id = _agent_id
    AND u.hour >= now() - make_interval(days => greatest(_days, 1))
    AND (
      private.owns_agent(_agent_id, auth.uid())
      OR private.has_role(auth.uid(), 'admin'::app_role)
    )
  GROUP BY 1
  ORDER BY 1
$$;

REVOKE EXECUTE ON FUNCTION public.agent_usage_daily(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.agent_usage_daily(uuid, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Een klant mag de instellingen van zijn eigen agent lezen
--
--    Voor het dashboard is de aanname over tijdwinst nodig, plus de labels.
--    agent_public_config() is hiervoor niet geschikt: die werkt alleen voor
--    live agents en laat deze velden bewust weg.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.my_agent_settings(_agent_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  status text,
  metric_label text,
  score_label text,
  welcome_text text,
  tone text,
  capture_leads boolean,
  minutes_saved_per_action numeric,
  minutes_saved_basis text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.name, a.slug, a.status::text, a.metric_label, a.score_label,
         a.welcome_text, a.tone, a.capture_leads,
         a.minutes_saved_per_action, a.minutes_saved_basis
  FROM public.agents a
  WHERE a.id = _agent_id
    AND (
      private.owns_agent(a.id, auth.uid())
      OR private.has_role(auth.uid(), 'admin'::app_role)
    )
$$;

REVOKE EXECUTE ON FUNCTION public.my_agent_settings(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_agent_settings(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. De welkomsttekst en toon mag een klant zelf aanpassen
--
--    Bewust niet de instructies en niet het model: een klant die zijn eigen
--    systeemprompt schrijft, bouwt een agent waar wij niet meer voor kunnen
--    instaan. Toon en begroeting zijn wel van hem.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_my_agent(
  _agent_id uuid,
  _welcome_text text,
  _tone text
)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (
    private.owns_agent(_agent_id, auth.uid())
    OR private.has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.agents
  SET welcome_text = nullif(btrim(_welcome_text), ''),
      tone = nullif(btrim(_tone), '')
  WHERE id = _agent_id;

  RETURN true;
END $$;

REVOKE EXECUTE ON FUNCTION public.update_my_agent(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_my_agent(uuid, text, text) TO authenticated;
