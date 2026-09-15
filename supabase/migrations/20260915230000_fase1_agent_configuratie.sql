-- FASE 1 — een agent draait op de site van een klant.
--
-- Tot nu toe stond alles wat de assistent kenmerkt hardgecodeerd in
-- assistant.server.ts: de toon, de welkomsttekst, het model, en het adres waar
-- een lead naartoe gaat. Dat werkt voor één agent en breekt bij de tweede.
--
-- Deze migratie maakt die dingen instelbaar per agent, en voegt twee
-- beschermingen toe die je pas nodig hebt zodra een agent op een vreemde site
-- staat: een lijst met toegestane domeinen, en een limiet per uur.

-- ---------------------------------------------------------------------------
-- 1. Instellingen per agent
-- ---------------------------------------------------------------------------

ALTER TABLE public.agents
  -- Wat een klant straks zelf mag aanpassen.
  ADD COLUMN IF NOT EXISTS welcome_text text,
  ADD COLUMN IF NOT EXISTS tone text,

  -- Wat alleen een beheerder aanpast. Een klant die zijn eigen instructies
  -- schrijft, bouwt een agent waar jij niet meer voor kunt instaan.
  ADD COLUMN IF NOT EXISTS extra_instructions text,
  ADD COLUMN IF NOT EXISTS model text NOT NULL DEFAULT 'claude-sonnet-5',

  -- Waar een lead uit een gesprek naartoe gaat. Leeg betekent: naar het adres
  -- dat in de code staat, dus naar ons. Bij een klant hoort hier zijn eigen
  -- adres, anders krijgen wij zijn leads en hij niet.
  ADD COLUMN IF NOT EXISTS notify_email text,
  ADD COLUMN IF NOT EXISTS capture_leads boolean NOT NULL DEFAULT true,

  -- Op welke domeinen deze agent mag draaien. Leeg betekent overal, en dat is
  -- bewust alleen bruikbaar tijdens het opzetten.
  ADD COLUMN IF NOT EXISTS allowed_domains text[] NOT NULL DEFAULT '{}',

  -- Bovengrens per uur, zodat één misbruiker niet het hele API-tegoed opmaakt.
  ADD COLUMN IF NOT EXISTS rate_limit_per_hour integer NOT NULL DEFAULT 60;

-- Onze eigen assistent: zet de domeinen goed en laat de rest op de standaard.
UPDATE public.agents
SET
  welcome_text = COALESCE(
    welcome_text,
    'Hoi, ik ben de assistent van Zakelijke AI Agents. Vraag me gerust naar de AI-scan, wat iets kost, hoe lang iets duurt, of wat AI in jouw branche zou kunnen doen.'
  ),
  allowed_domains = CASE
    WHEN cardinality(allowed_domains) = 0
      THEN ARRAY['zakelijkeaiagents.nl', 'www.zakelijkeaiagents.nl', 'localhost']
    ELSE allowed_domains
  END
WHERE slug = 'website-assistent';

-- ---------------------------------------------------------------------------
-- 2. Wat een bezoeker over een agent mag weten
--
--    resolve_live_agent() gaf alleen een id terug. De server heeft meer nodig
--    om een gesprek te voeren, en draait lokaal met dezelfde publieke sleutel
--    als een bezoeker, dus die velden moeten hierlangs.
--
--    De scheiding loopt langs gevoeligheid, niet langs gemak. Welkomsttekst,
--    toon, model, limiet en toegestane domeinen zijn hoe dan ook van buitenaf
--    waarneembaar zodra de agent draait; die mogen hier langs. Het e-mailadres
--    waar leads naartoe gaan en de maatwerkinstructies van een klant niet: die
--    blijven achter de service-role.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.agent_public_config(_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  welcome_text text,
  tone text,
  model text,
  capture_leads boolean,
  allowed_domains text[],
  rate_limit_per_hour integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.name, a.welcome_text, a.tone, a.model,
         a.capture_leads, a.allowed_domains, a.rate_limit_per_hour
  FROM public.agents a
  WHERE a.slug = _slug AND a.status = 'live'
$$;

REVOKE EXECUTE ON FUNCTION public.agent_public_config(text) FROM public;
GRANT EXECUTE ON FUNCTION public.agent_public_config(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Verbruik tellen en begrenzen
--
--    De teller moet geschreven kunnen worden door een verzoek van een anonieme
--    bezoeker, en die heeft geen schrijfrechten op de tabel. Daarom loopt het
--    via een SECURITY DEFINER functie die precies één ding doet: ophogen en
--    zeggen of de grens al bereikt is.
--
--    Iemand die deze functie rechtstreeks aanroept kan zijn eigen teller
--    ophogen, en zichzelf daarmee buitensluiten. Dat is hetzelfde effect als
--    het eindpunt platgooien, dus het levert geen nieuwe mogelijkheid op.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_usage (
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  hour timestamptz NOT NULL,
  requests integer NOT NULL DEFAULT 0,
  PRIMARY KEY (agent_id, hour)
);

ALTER TABLE public.agent_usage ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.agent_usage TO service_role;

CREATE POLICY "Clients read usage of own agents"
ON public.agent_usage
FOR SELECT
TO authenticated
USING (private.owns_agent(agent_id, auth.uid()));

CREATE POLICY "Admins manage usage"
ON public.agent_usage
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.agent_usage TO authenticated;

-- Hoogt de teller van het huidige uur op en geeft terug of het verzoek nog
-- binnen de grens van deze agent valt.
CREATE OR REPLACE FUNCTION public.claim_agent_request(_agent_id uuid)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  grens integer;
  staat integer;
BEGIN
  SELECT rate_limit_per_hour INTO grens
  FROM public.agents
  WHERE id = _agent_id AND status = 'live';

  IF grens IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.agent_usage (agent_id, hour, requests)
  VALUES (_agent_id, date_trunc('hour', now()), 1)
  ON CONFLICT (agent_id, hour)
  DO UPDATE SET requests = public.agent_usage.requests + 1
  RETURNING requests INTO staat;

  RETURN staat <= grens;
END $$;

REVOKE EXECUTE ON FUNCTION public.claim_agent_request(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_agent_request(uuid) TO anon, authenticated;
