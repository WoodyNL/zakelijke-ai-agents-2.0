-- FASE 3 — meten, omrekenen en grenzen handhaven.
--
-- Drie dingen die tot nu toe ontbraken:
--
-- 1. Het tokenverbruik werd nergens vastgelegd, dus er was geen manier om te
--    weten wat een klant werkelijk kost. Zonder dat cijfer kun je geen marge
--    berekenen en geen overschrijding factureren.
--
-- 2. De fair-use-grens stond alleen op de website ("300 gesprekken per maand
--    bij een losse agent, 2.000 bij een traject"). In de database bestond hij
--    niet, dus hij was niet af te dwingen en niet te factureren.
--
-- 3. Tijdwinst kon worden getoond, maar niet omgerekend naar geld. Daarvoor is
--    een uurtarief nodig, en dat is net als de minuten een afspraak met de
--    klant en geen meting.

-- ---------------------------------------------------------------------------
-- 1. Wat een agent kost en wat hij mag
-- ---------------------------------------------------------------------------

ALTER TABLE public.agents
  -- Voor het omrekenen van bespaarde tijd naar euro's. Leeg betekent: we tonen
  -- geen bedrag. Een verzonnen uurtarief levert een cijfer op dat overtuigend
  -- klinkt en nergens op rust.
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(8, 2),
  ADD COLUMN IF NOT EXISTS hourly_rate_basis text,

  -- De fair-use-grens per maand, zoals op de tarievenpagina. Leeg betekent: geen
  -- grens, en dus ook niets na te factureren.
  ADD COLUMN IF NOT EXISTS fair_use_per_month integer,
  ADD COLUMN IF NOT EXISTS overage_price numeric(6, 2) NOT NULL DEFAULT 1.00;

-- ---------------------------------------------------------------------------
-- 2. Tokenverbruik vastleggen
--
--    Tokens zijn pas bekend nadat het model heeft geantwoord, dus dit kan niet
--    in claim_agent_request(): die draait ervoor. Een aparte functie die na
--    afloop optelt bij het huidige uur.
-- ---------------------------------------------------------------------------

ALTER TABLE public.agent_usage
  ADD COLUMN IF NOT EXISTS input_tokens bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cache_read_tokens bigint NOT NULL DEFAULT 0;

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
      cache_read_tokens = cache_read_tokens + greatest(_cache_read, 0)
  WHERE agent_id = _agent_id
    AND hour = date_trunc('hour', now());
END $$;

REVOKE EXECUTE ON FUNCTION public.record_agent_tokens(uuid, bigint, bigint, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.record_agent_tokens(uuid, bigint, bigint, bigint) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. De maandstand van een agent
--
--    Alles wat een klant en een beheerder over deze maand willen weten, in één
--    aanroep: hoeveel berichten, hoeveel daarvan boven de fair-use-grens, wat
--    dat extra kost, en het tokenverbruik waarmee wij onze eigen kosten kunnen
--    narekenen.
--
--    De maand loopt in Amsterdamse tijd. Een klant die op 1 februari kijkt, wil
--    niet dat 31 januari 23:30 nog meetelt omdat de server in UTC denkt.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.agent_month_summary(_agent_id uuid, _month_offset integer DEFAULT 0)
RETURNS TABLE (
  maand date,
  requests bigint,
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
    SELECT coalesce(sum(u.requests), 0)::bigint AS requests,
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
