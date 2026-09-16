-- FASE 5 — de uitgaande e-mailagent (eerste echte klant: FJ Snacks).
--
-- Alles wat het platform tot nu toe kent, reageert op iemand die er zelf om
-- vraagt: een bezoeker stelt een vraag, de agent antwoordt. Dit is het eerste
-- soort agent dat uit zichzelf contact opneemt met mensen die daar niet om
-- gevraagd hebben. Dat verandert wat er mis kan gaan, en dus wat de database
-- moet afdwingen.
--
-- Bij een chat-assistent is de ergste fout een slecht antwoord aan één persoon
-- die toch al aan het praten was. Hier is de ergste fout een mail aan iemand die
-- zich heeft afgemeld, of tweehonderd mails in één keer naar een lijst die nog
-- niet gecontroleerd is. Beide zijn onomkeerbaar: een verzonden mail komt niet
-- terug, en de reputatie van het verzenddomein herstelt traag.
--
-- Daarom zitten de grenzen hier in de database en niet alleen in de code die
-- verstuurt. Code wordt herschreven, een trigger blijft staan.

-- ---------------------------------------------------------------------------
-- 1. Woordenschat
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.contact_herkomst AS ENUM ('oud_klant', 'koud');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- 'concept' en 'direct' zijn bewust allebei mogelijk. De klant kiest per
  -- campagne, zodat een lijst eerst als concept kan worden meegelezen en een
  -- volgende campagne autonoom mag versturen zonder de code aan te passen.
  CREATE TYPE public.verzendwijze AS ENUM ('concept', 'direct');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bericht_status AS ENUM (
    'concept',     -- klaargezet, wacht op een mens
    'gepland',     -- mag weg, nog niet verstuurd
    'verzonden',
    'mislukt',
    'beantwoord'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. De contacten
--
--    Dit zijn persoonsgegevens van mensen die meestal niet om contact hebben
--    gevraagd, dus geldt de AVG. Twee dingen staan er daarom vanaf het begin
--    in plaats van achteraf: een afmeldmoment en een afmeldsleutel. De sleutel
--    zit in de link onderaan elke mail; zonder die link is een afmelding een
--    handmatige klus en gaat het vroeg of laat mis.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.outbound_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  email text NOT NULL,
  naam text,
  bedrijf text,
  plaats text,
  telefoon text,
  herkomst public.contact_herkomst NOT NULL DEFAULT 'koud',
  -- Voor oud-klanten: wanneer er voor het laatst is geleverd. Dat bepaalt de
  -- toon van het eerste bericht meer dan wat dan ook.
  laatst_besteld_op date,
  notitie text,
  afgemeld_op timestamptz,
  afmeldsleutel uuid NOT NULL DEFAULT gen_random_uuid(),
  -- Een harde bounce betekent dat het adres niet bestaat. Blijven proberen
  -- beschadigt het verzenddomein, dus behandelen we het als afgemeld.
  bounce_op timestamptz,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- Eén adres per agent. Zonder dit levert een tweede import van dezelfde lijst
-- dubbele mails op naar dezelfde mensen.
CREATE UNIQUE INDEX IF NOT EXISTS outbound_contacts_uniek
  ON public.outbound_contacts (agent_id, lower(email));

CREATE INDEX IF NOT EXISTS outbound_contacts_agent
  ON public.outbound_contacts (agent_id);

-- ---------------------------------------------------------------------------
-- 3. De campagnes
--
--    Een campagne is één reeks berichten naar één groep, met één toon. De
--    tweehonderd oud-klanten en de koude horeca zijn uitdrukkelijk twee
--    campagnes: de eerste groep kende het bedrijf al en vertrok na een
--    overname, de tweede heeft nog nooit van FJ Snacks gehoord. Dat vraagt een
--    ander eerste bericht, een ander tempo en een andere verwachting.
--
--    dagmaximum is geen instelling maar een rem. Een nieuw verzenddomein dat
--    op dag één tweehonderd mails verstuurt, komt in de spamfilters terecht en
--    krijgt dat nauwelijks meer terug.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.outbound_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  naam text NOT NULL,
  herkomst public.contact_herkomst NOT NULL DEFAULT 'koud',
  verzendwijze public.verzendwijze NOT NULL DEFAULT 'concept',
  afzender_naam text,
  afzender_email text,
  antwoord_naar text,
  dagmaximum integer NOT NULL DEFAULT 20 CHECK (dagmaximum BETWEEN 1 AND 500),
  -- Aan/uit los van de verzendwijze: zo kan een campagne worden stilgezet
  -- zonder de instellingen kwijt te raken.
  actief boolean NOT NULL DEFAULT false,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbound_campaigns_agent
  ON public.outbound_campaigns (agent_id);

-- ---------------------------------------------------------------------------
-- 4. De berichten
--
--    Elk bericht dat is klaargezet of verstuurd, met de stap in de reeks. Stap
--    1 is het eerste bericht, stap 2 de opvolging, en zo verder. Het bewaren
--    van de verstuurde tekst is geen logboek voor de vorm: als iemand over drie
--    weken antwoordt, moet de agent kunnen teruglezen wat hij zelf heeft
--    beweerd voordat hij reageert.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.outbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.outbound_campaigns(id) ON DELETE SET NULL,
  contact_id uuid NOT NULL REFERENCES public.outbound_contacts(id) ON DELETE CASCADE,
  stap smallint NOT NULL DEFAULT 1 CHECK (stap BETWEEN 1 AND 10),
  status public.bericht_status NOT NULL DEFAULT 'concept',
  onderwerp text NOT NULL,
  tekst text NOT NULL,
  -- Het id dat Resend teruggeeft, zodat een bounce of klacht later aan dit
  -- bericht te koppelen is.
  provider_id text,
  fout text,
  gepland_voor timestamptz,
  verzonden_op timestamptz,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbound_messages_agent ON public.outbound_messages (agent_id);
CREATE INDEX IF NOT EXISTS outbound_messages_contact ON public.outbound_messages (contact_id);
CREATE INDEX IF NOT EXISTS outbound_messages_status ON public.outbound_messages (agent_id, status);

-- Eén bericht per stap per contact. Dit is de rem op de fout die je pas merkt
-- als hij al is gemaakt: een vastgelopen taak die opnieuw start en iedereen de
-- opvolging nog een keer stuurt.
CREATE UNIQUE INDEX IF NOT EXISTS outbound_messages_stap_uniek
  ON public.outbound_messages (contact_id, stap);

-- ---------------------------------------------------------------------------
-- 5. De proefpakketten
--
--    Het doel van de hele reeks is geen antwoord maar een doos kip op de stoep.
--    Dat gebeurt buiten de software om: de chauffeur van Frank rijdt op vrijdag.
--    Daarmee is de bezorgdag geen voorkeur maar een harde grens, en is het
--    aantal plekken per vrijdag eindig. Die grens hoort zichtbaar te zijn
--    voordat de agent een afspraak toezegt die niet waargemaakt kan worden.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.outbound_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.outbound_contacts(id) ON DELETE CASCADE,
  bezorgdag date NOT NULL,
  adres text,
  status text NOT NULL DEFAULT 'afgesproken',
  notitie text,
  aangemaakt_op timestamptz NOT NULL DEFAULT now(),
  -- De chauffeur rijdt op vrijdag. ISODOW 5 = vrijdag.
  CONSTRAINT bezorgdag_is_vrijdag CHECK (EXTRACT(ISODOW FROM bezorgdag) = 5)
);

CREATE INDEX IF NOT EXISTS outbound_deliveries_dag
  ON public.outbound_deliveries (agent_id, bezorgdag);

CREATE UNIQUE INDEX IF NOT EXISTS outbound_deliveries_uniek
  ON public.outbound_deliveries (contact_id, bezorgdag);

-- ---------------------------------------------------------------------------
-- 6. De afmelding is niet te omzeilen
--
--    Dit is de enige regel in dit bestand die er echt toe doet. Mailen naar
--    iemand die zich heeft afgemeld is wettelijk niet toegestaan, en het is de
--    fout die je het makkelijkst per ongeluk maakt: een import die een oude
--    lijst terugzet, een herstart die een wachtrij opnieuw afloopt, een
--    handmatige ingreep op een drukke dag.
--
--    Daarom staat de controle hier en niet in de verzendcode. Wie langs deze
--    trigger wil, moet de database aanpassen — niet een regel code vergeten.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.outbound_blokkeer_afgemeld()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record;
BEGIN
  SELECT afgemeld_op, bounce_op, agent_id, email
    INTO c
  FROM public.outbound_contacts
  WHERE id = NEW.contact_id;

  IF c IS NULL THEN
    RAISE EXCEPTION 'Onbekend contact: %', NEW.contact_id;
  END IF;

  IF c.afgemeld_op IS NOT NULL THEN
    RAISE EXCEPTION 'Dit contact heeft zich afgemeld op %; er gaat geen bericht meer heen.',
      c.afgemeld_op;
  END IF;

  IF c.bounce_op IS NOT NULL THEN
    RAISE EXCEPTION 'Dit adres bouncete op %; blijven proberen schaadt het verzenddomein.',
      c.bounce_op;
  END IF;

  -- Een bericht hoort bij dezelfde agent als het contact. Zonder deze controle
  -- kan een klant een bericht aanmaken op zijn eigen agent, gericht aan het
  -- contact van een ander.
  IF c.agent_id <> NEW.agent_id THEN
    RAISE EXCEPTION 'Contact en bericht horen bij verschillende agents.';
  END IF;

  RETURN NEW;
END $$;

-- Twee triggers in plaats van één, omdat het moment waarop je mag controleren
-- verschilt. Bij het aanmaken van een bericht altijd. Bij een wijziging alleen
-- op de overgang naar 'gepland', want dat is het laatste moment vóór verzending
-- waarop tegenhouden nog iets uithaalt.
--
-- Wat hier uitdrukkelijk niet gebeurt, is controleren bij de overgang naar
-- 'verzonden'. Die vindt plaats nadat de mail werkelijk is verstuurd. Meldt
-- iemand zich in dat ene moment af, dan zou een blokkade hier de mail niet meer
-- tegenhouden maar wel het bericht op 'gepland' laten staan — waarna een
-- volgende ronde hem opnieuw verstuurt. De administratie moet de werkelijkheid
-- kunnen bijhouden, ook als die werkelijkheid ongelukkig is.

DROP TRIGGER IF EXISTS outbound_messages_afmeldcontrole ON public.outbound_messages;
DROP TRIGGER IF EXISTS outbound_messages_afmeldcontrole_nieuw ON public.outbound_messages;
DROP TRIGGER IF EXISTS outbound_messages_afmeldcontrole_plannen ON public.outbound_messages;

CREATE TRIGGER outbound_messages_afmeldcontrole_nieuw
  BEFORE INSERT ON public.outbound_messages
  FOR EACH ROW EXECUTE FUNCTION public.outbound_blokkeer_afgemeld();

CREATE TRIGGER outbound_messages_afmeldcontrole_plannen
  BEFORE UPDATE ON public.outbound_messages
  FOR EACH ROW
  WHEN (
    NEW.status = 'gepland'::public.bericht_status
    AND OLD.status IS DISTINCT FROM 'gepland'::public.bericht_status
  )
  EXECUTE FUNCTION public.outbound_blokkeer_afgemeld();

-- ---------------------------------------------------------------------------
-- 7. Afmelden zonder in te loggen
--
--    De ontvanger van een koude mail heeft geen account en gaat er ook geen
--    maken. De afmeldlink moet dus werken voor een volslagen vreemde, met de
--    sleutel uit de link als enige bewijs.
--
--    De functie geeft niets terug over de klant: geen naam, geen bevestiging
--    dat het adres bestond. Een onbekende sleutel en een geldige sleutel geven
--    hetzelfde antwoord, zodat de link niet te gebruiken is om te achterhalen
--    wie er in de lijst staat.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.outbound_afmelden(_sleutel uuid)
RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.outbound_contacts
  SET afgemeld_op = coalesce(afgemeld_op, now())
  WHERE afmeldsleutel = _sleutel;
$$;

GRANT EXECUTE ON FUNCTION public.outbound_afmelden(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Wie mag wat zien
--
--    Contactgegevens van derden zijn het gevoeligste wat in dit platform staat.
--    Strikt per agent, en anon komt er helemaal niet bij: die heeft alleen de
--    afmeldfunctie hierboven nodig.
-- ---------------------------------------------------------------------------

ALTER TABLE public.outbound_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_campaigns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_deliveries ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'outbound_contacts', 'outbound_campaigns', 'outbound_messages', 'outbound_deliveries'
  ] LOOP
    -- Eén policy per tabel voor alle bewerkingen. Losse policies per bewerking
    -- zijn hier geen winst: permissieve policies stapelen met OR, en elke extra
    -- policy is een extra kans dat er per ongeluk een brede tussen staat.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_eigenaar', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
      FOR ALL TO authenticated
      USING (
        private.owns_agent(agent_id, auth.uid())
        OR private.has_role(auth.uid(), 'admin'::app_role)
      )
      WITH CHECK (
        private.owns_agent(agent_id, auth.uid())
        OR private.has_role(auth.uid(), 'admin'::app_role)
      )
    $f$, t || '_eigenaar', t);

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 9. Hoeveel plekken zijn er nog op een vrijdag
--
--    Bedoeld voor het scherm én voor de agent zelf: voordat hij een bezorging
--    toezegt, moet hij weten of die vrijdag nog ruimte heeft.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.outbound_vrijdagen(_agent_id uuid, _weken integer DEFAULT 8)
RETURNS TABLE (bezorgdag date, afgesproken bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.bezorgdag, count(*)::bigint
  FROM public.outbound_deliveries d
  WHERE d.agent_id = _agent_id
    AND d.bezorgdag >= (now() AT TIME ZONE 'Europe/Amsterdam')::date
    AND d.bezorgdag < (now() AT TIME ZONE 'Europe/Amsterdam')::date
                      + make_interval(weeks => greatest(_weken, 1))
    AND (
      private.owns_agent(_agent_id, auth.uid())
      OR private.has_role(auth.uid(), 'admin'::app_role)
    )
  GROUP BY d.bezorgdag
  ORDER BY d.bezorgdag
$$;

REVOKE EXECUTE ON FUNCTION public.outbound_vrijdagen(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.outbound_vrijdagen(uuid, integer) TO authenticated;
