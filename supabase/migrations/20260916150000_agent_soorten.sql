-- Agents krijgen een soort.
--
-- Tot nu toe was een agent alleen een naam met cijfers eronder. Het portaal kon
-- daardoor niet weten of een kennisbank zinvol was: het gebruikte de
-- aanwezigheid van een slug als hulpconstructie, en dat is geen eigenschap maar
-- een toevalligheid. Een klant kreeg zo een uploadknop voor een agent die die
-- kennis nooit zou raadplegen.
--
-- De soorten volgen de producten die daadwerkelijk worden verkocht, zoals die in
-- src/content/site.ts staan. 'overig' is er voor maatwerk dat in geen van de
-- vakjes past; dat is eerlijker dan alles in een bestaande categorie duwen.

CREATE TYPE public.agent_kind AS ENUM (
  'chat_assistent',      -- praat met bezoekers, raadpleegt een kennisbank
  'sales_assistent',     -- kwalificeert en volgt binnenkomende leads op
  'inbox_draft',         -- zet concept-antwoorden klaar in een mailbox
  'whatsapp_followup',   -- houdt leads warm via WhatsApp
  'overig'
);

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS kind public.agent_kind NOT NULL DEFAULT 'overig';

-- Bestaande agents indelen op hun naam. Dit is een beste gok om te voorkomen
-- dat alles op 'overig' blijft staan; een beheerder kan het corrigeren. Bewust
-- geen gok op basis van iets vaags: past een naam niet duidelijk, dan blijft
-- hij 'overig' in plaats van dat we iets verzinnen.
UPDATE public.agents
SET kind = CASE
  WHEN slug = 'website-assistent' THEN 'chat_assistent'::public.agent_kind
  WHEN name ILIKE '%whatsapp%' THEN 'whatsapp_followup'::public.agent_kind
  WHEN name ILIKE '%inbox%' OR name ILIKE '%draft%' THEN 'inbox_draft'::public.agent_kind
  WHEN name ILIKE '%lead%' OR name ILIKE '%sales%' THEN 'sales_assistent'::public.agent_kind
  WHEN name ILIKE '%assistent%' OR name ILIKE '%assistant%' THEN 'chat_assistent'::public.agent_kind
  ELSE 'overig'::public.agent_kind
END
WHERE kind = 'overig';

-- De soort hoort bij de instellingen die een klant van zijn eigen agent mag
-- zien: het portaal bepaalt er schermen mee.
CREATE OR REPLACE FUNCTION public.my_agent_settings(_agent_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  status text,
  kind text,
  metric_label text,
  score_label text,
  welcome_text text,
  tone text,
  capture_leads boolean,
  minutes_saved_per_action numeric,
  minutes_saved_basis text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.name, a.slug, a.status::text, a.kind::text, a.metric_label, a.score_label,
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
