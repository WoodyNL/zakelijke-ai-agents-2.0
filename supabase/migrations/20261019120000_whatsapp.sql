-- De WhatsApp-opvolger.
--
-- Twee tabellen: gesprekken (één per telefoonnummer per agent) en berichten.
-- Het gesprek houdt bij wanneer de klant voor het laatst zélf iets stuurde,
-- want dat is de regel van WhatsApp: binnen 24 uur daarna mag je vrij
-- antwoorden, daarbuiten alleen met een goedgekeurd sjabloon. Die regel staat
-- niet in de code van Meta om te omzeilen; wie hem negeert krijgt foutmeldingen
-- en uiteindelijk een geblokkeerd nummer.
--
-- Een gesprek kan "overgedragen" zijn: dan zwijgt de agent en antwoordt de
-- ondernemer zelf vanuit het portaal. Dat gebeurt bij de woorden die de klant
-- instelt (klacht, annuleren, jurist), als de agent iets niet weet, of als de
-- ondernemer het zelf overneemt.

CREATE TABLE IF NOT EXISTS public.whatsapp_gesprekken (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  -- Internationaal zonder plus: 31612345678. Zo levert Meta het aan.
  telefoon text NOT NULL,
  naam text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'overgedragen', 'gesloten')),
  -- Het laatste bericht van de klant zelf: het begin van het 24-uursvenster.
  laatste_inkomend_op timestamptz,
  laatste_bericht text,
  laatste_op timestamptz NOT NULL DEFAULT now(),
  overgedragen_op timestamptz,
  overdracht_reden text,
  -- De lead bij de sales-assistent die hiermee wordt opgevolgd, als dat zo is.
  lead_id uuid REFERENCES public.sales_leads(id) ON DELETE SET NULL,
  -- Wanneer wij zelf begonnen (met een sjabloon); de klant heeft dan nog
  -- niets gestuurd en het 24-uursvenster is dicht tot hij antwoordt.
  gestart_op timestamptz,
  aangemaakt_op timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, telefoon)
);
CREATE INDEX IF NOT EXISTS whatsapp_gesprekken_agent_idx ON public.whatsapp_gesprekken (agent_id, laatste_op DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_berichten (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gesprek_id uuid NOT NULL REFERENCES public.whatsapp_gesprekken(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  richting text NOT NULL CHECK (richting IN ('in', 'uit')),
  -- Wie het uitgaande bericht schreef: de agent, of een mens in het portaal.
  door text NOT NULL DEFAULT 'agent' CHECK (door IN ('agent', 'mens', 'sjabloon')),
  tekst text NOT NULL DEFAULT '',
  -- Het id van Meta; uniek, zodat een melding die opnieuw wordt aangeboden
  -- geen tweede bericht wordt.
  wa_id text UNIQUE,
  status text NOT NULL DEFAULT 'ontvangen' CHECK (status IN ('ontvangen', 'verzonden', 'bezorgd', 'gelezen', 'mislukt')),
  fout text,
  op timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_berichten_gesprek_idx ON public.whatsapp_berichten (gesprek_id, op);
CREATE INDEX IF NOT EXISTS whatsapp_berichten_agent_idx ON public.whatsapp_berichten (agent_id, op DESC);

ALTER TABLE public.whatsapp_gesprekken ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_berichten ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_gesprekken FROM anon;
REVOKE ALL ON public.whatsapp_berichten FROM anon;
GRANT SELECT, UPDATE ON public.whatsapp_gesprekken TO authenticated;
GRANT SELECT ON public.whatsapp_berichten TO authenticated;
GRANT ALL ON public.whatsapp_gesprekken TO service_role;
GRANT ALL ON public.whatsapp_berichten TO service_role;

-- Inhoud van de klant: eigenaar en team; meekijker alleen lezend; wij niet.
DROP POLICY IF EXISTS whatsapp_gesprekken_eigenaar ON public.whatsapp_gesprekken;
CREATE POLICY whatsapp_gesprekken_eigenaar ON public.whatsapp_gesprekken FOR ALL TO authenticated
  USING (private.owns_agent(agent_id, auth.uid())) WITH CHECK (private.owns_agent(agent_id, auth.uid()));
DROP POLICY IF EXISTS whatsapp_gesprekken_meekijken ON public.whatsapp_gesprekken;
CREATE POLICY whatsapp_gesprekken_meekijken ON public.whatsapp_gesprekken FOR SELECT TO authenticated
  USING (private.meekijkt_agent(agent_id, auth.uid()));
DROP POLICY IF EXISTS whatsapp_berichten_lezen ON public.whatsapp_berichten;
CREATE POLICY whatsapp_berichten_lezen ON public.whatsapp_berichten FOR SELECT TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()) OR private.meekijkt_agent(agent_id, auth.uid()));

-- Het dashboard. Gesprekken tellen, want daar rekent Meta per stuk voor; en
-- overdrachten, want dat is waar een mens nodig was.
CREATE OR REPLACE FUNCTION public.whatsapp_kerncijfers(_agent_id uuid, _dagen integer DEFAULT 30)
RETURNS TABLE (
  gesprekken bigint,
  berichten_in bigint,
  berichten_uit bigint,
  door_agent bigint,
  overdrachten bigint,
  open_overgedragen bigint,
  reactie_seconden numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH toegang AS (
    SELECT 1 WHERE private.owns_agent(_agent_id, auth.uid()) OR private.is_staf(auth.uid())
  ),
  vanaf AS (SELECT now() - make_interval(days => greatest(least(coalesce(_dagen, 30), 3650), 1)) AS t),
  b AS (SELECT x.* FROM public.whatsapp_berichten x, vanaf WHERE x.agent_id = _agent_id AND x.op >= vanaf.t),
  paren AS (
    -- Per inkomend bericht het eerstvolgende antwoord van de agent.
    SELECT i.op AS vraag, (SELECT min(u.op) FROM b u WHERE u.gesprek_id = i.gesprek_id AND u.richting = 'uit' AND u.door = 'agent' AND u.op > i.op) AS antwoord
    FROM b i WHERE i.richting = 'in'
  )
  SELECT
    (SELECT count(DISTINCT gesprek_id) FROM b),
    (SELECT count(*) FROM b WHERE richting = 'in'),
    (SELECT count(*) FROM b WHERE richting = 'uit'),
    (SELECT count(*) FROM b WHERE richting = 'uit' AND door = 'agent'),
    (SELECT count(*) FROM public.whatsapp_gesprekken g, vanaf WHERE g.agent_id = _agent_id AND g.overgedragen_op >= vanaf.t),
    (SELECT count(*) FROM public.whatsapp_gesprekken g WHERE g.agent_id = _agent_id AND g.status = 'overgedragen'),
    (SELECT round(avg(extract(epoch FROM (antwoord - vraag)))::numeric, 0) FROM paren WHERE antwoord IS NOT NULL)
  FROM toegang
$$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_kerncijfers(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.whatsapp_kerncijfers(uuid, integer) TO authenticated;
