-- De teller die de rekening bepaalt, mag niet door bezoekers op te hogen zijn.
--
-- claim_agent_request() is aanroepbaar voor anon, en dat was bewust: de
-- snelheidslimiet moet werken voor een bezoeker die niet is ingelogd. Bij het
-- bouwen stond erbij dat misbruik onschadelijk was, omdat iemand die de teller
-- ophoogt alleen zichzelf buitensluit.
--
-- Dat argument gold tot fase 3. Sinds die dezelfde teller gebruikt om
-- overschrijding van de fair-use-grens na te factureren, kan iemand daarmee de
-- rekening van een klant opblazen. En het agent-id is te achterhalen: de slug
-- staat in het embed-script op de site van de klant, en agent_public_config()
-- geeft het id daarbij.
--
-- De oplossing is de twee tellers scheiden. requests blijft de ruwe teller voor
-- de snelheidslimiet, met het oude argument dat misbruik zichzelf treft.
-- billable_requests telt alleen gesprekken die werkelijk een antwoord hebben
-- opgeleverd, en wordt geschreven door de server met de service-role. Daar komt
-- een bezoeker niet bij.

ALTER TABLE public.agent_usage
  ADD COLUMN IF NOT EXISTS billable_requests bigint NOT NULL DEFAULT 0;

-- Bestaande rijen: neem de ruwe teller over als beste benadering van wat er
-- werkelijk is gebeurd. Er was tot nu toe geen misbruik mogelijk zonder dat het
-- ook de snelheidslimiet raakte, dus die cijfers zijn bruikbaar.
UPDATE public.agent_usage
SET billable_requests = requests
WHERE billable_requests = 0 AND requests > 0;

-- ---------------------------------------------------------------------------
-- Vastleggen wat er werkelijk gebeurd is
--
--    Draait na een geslaagd antwoord en telt zowel het gesprek als de tokens.
--    Niet meer aanroepbaar voor anon: dit is de bron voor de facturatie.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_agent_tokens(
  _agent_id uuid,
  _input bigint,
  _output bigint,
  _cache_read bigint
)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Alleen optellen bij een rij die al bestaat. claim_agent_request() heeft die
  -- vlak ervoor aangemaakt; bestaat hij niet, dan hoort dit verzoek hier niet en
  -- doen we niets in plaats van een rij te verzinnen.
  UPDATE public.agent_usage
  SET input_tokens = input_tokens + greatest(_input, 0),
      output_tokens = output_tokens + greatest(_output, 0),
      cache_read_tokens = cache_read_tokens + greatest(_cache_read, 0),
      billable_requests = billable_requests + 1
  WHERE agent_id = _agent_id
    AND hour = date_trunc('hour', now());
END $$;

REVOKE EXECUTE ON FUNCTION public.record_agent_tokens(uuid, bigint, bigint, bigint) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.record_agent_tokens(uuid, bigint, bigint, bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- De maandstand factureert voortaan op de afgeschermde teller
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.agent_month_summary(_agent_id uuid, _month_offset integer DEFAULT 0)
RETURNS TABLE (
  maand date,
  requests bigint,
  ruwe_requests bigint,
  input_tokens bigint,
  output_tokens bigint,
  cache_read_tokens bigint,
  fair_use_per_month integer,
  boven_grens bigint,
  overage_price numeric,
  overage_bedrag numeric,
  minutes_saved_per_action numeric,
  minutes_saved_basis text,
  hourly_rate numeric,
  hourly_rate_basis text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH grens AS (
    SELECT a.fair_use_per_month, a.overage_price, a.minutes_saved_per_action,
           a.minutes_saved_basis, a.hourly_rate, a.hourly_rate_basis
    FROM public.agents a
    WHERE a.id = _agent_id
      AND (
        private.owns_agent(a.id, auth.uid())
        OR private.has_role(auth.uid(), 'admin'::app_role)
      )
  ),
  periode AS (
    SELECT date_trunc('month', (now() AT TIME ZONE 'Europe/Amsterdam'))
             + make_interval(months => _month_offset) AS start
  ),
  verbruik AS (
    -- billable_requests is de bron voor alles wat een klant te zien of te
    -- betalen krijgt. De ruwe teller staat er alleen bij zodat een beheerder
    -- een groot verschil kan opmerken; dat wijst op verzoeken die wel zijn
    -- begonnen maar nooit een antwoord opleverden.
    SELECT coalesce(sum(u.billable_requests), 0)::bigint AS requests,
           coalesce(sum(u.requests), 0)::bigint AS ruwe_requests,
           coalesce(sum(u.input_tokens), 0)::bigint AS input_tokens,
           coalesce(sum(u.output_tokens), 0)::bigint AS output_tokens,
           coalesce(sum(u.cache_read_tokens), 0)::bigint AS cache_read_tokens
    FROM public.agent_usage u, periode p
    WHERE u.agent_id = _agent_id
      AND (u.hour AT TIME ZONE 'Europe/Amsterdam') >= p.start
      AND (u.hour AT TIME ZONE 'Europe/Amsterdam') < p.start + interval '1 month'
  )
  SELECT
    (SELECT start::date FROM periode),
    v.requests,
    v.ruwe_requests,
    v.input_tokens,
    v.output_tokens,
    v.cache_read_tokens,
    g.fair_use_per_month,
    greatest(v.requests - coalesce(g.fair_use_per_month, v.requests), 0)::bigint AS boven_grens,
    g.overage_price,
    round(
      greatest(v.requests - coalesce(g.fair_use_per_month, v.requests), 0) * coalesce(g.overage_price, 0),
      2
    ) AS overage_bedrag,
    g.minutes_saved_per_action,
    g.minutes_saved_basis,
    g.hourly_rate,
    g.hourly_rate_basis
  FROM verbruik v, grens g
$$;

REVOKE EXECUTE ON FUNCTION public.agent_month_summary(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.agent_month_summary(uuid, integer) TO authenticated;
