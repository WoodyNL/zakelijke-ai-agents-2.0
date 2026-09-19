-- Fase 2 van het beheerplan: meekijken bij een klant, met een log die hij ziet.
--
-- Sinds fase 1 ziet een beheerder de inhoud van een klant niet meer. Bij een
-- storing moet hij soms toch kijken: waarom verstuurt deze campagne niet,
-- waarom komt dit antwoord niet binnen. Daarvoor is er nu meekijken.
--
-- De afspraken (besloten 19 september 2026):
--   - zonder akkoord van de klant vooraf, maar altijd met een reden;
--   - tijdelijk: een sessie verloopt na 60 minuten;
--   - alleen lezen: de database geeft een meekijkende beheerder geen
--     schrijfrechten, dus ook een fout in de app kan niets wijzigen;
--   - nooit de kennisbank;
--   - de klant ziet in zijn portaal wie wanneer en waarom heeft meegekeken,
--     en welke schermen er zijn bekeken.

-- ---------------------------------------------------------------------------
-- 1. Bij welke klant hoort iemand?
--
--    Nu nog: bij zichzelf. In fase 5 komen teamleden erbij, en dan wijst deze
--    functie een teamlid naar het account van zijn bedrijf. Alles wat van
--    "mijn klant" afhangt, loopt via hier, zodat fase 5 één plek verandert.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.mijn_klant(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id
$$;
REVOKE EXECUTE ON FUNCTION private.mijn_klant(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION private.mijn_klant(uuid) TO authenticated;

-- Wie bij ons werkt: de beheerder, en vanaf fase 5 een support-medewerker.
-- Vergeleken als tekst en niet als enum, omdat de waarde 'support' pas in
-- fase 5 aan app_role wordt toegevoegd en een nieuwe enumwaarde niet gebruikt
-- mag worden in de transactie die hem toevoegt.
CREATE OR REPLACE FUNCTION private.is_staf(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'support')
  )
$$;
REVOKE EXECUTE ON FUNCTION private.is_staf(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION private.is_staf(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. De sessies en de bekeken schermen
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.meekijksessies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beheerder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reden text NOT NULL CHECK (length(btrim(reden)) BETWEEN 10 AND 500),
  gestart_op timestamptz NOT NULL DEFAULT now(),
  verloopt_op timestamptz NOT NULL DEFAULT now() + interval '60 minutes',
  gestopt_op timestamptz,
  CHECK (beheerder_id <> client_id)
);

CREATE INDEX IF NOT EXISTS meekijksessies_beheerder_idx
  ON public.meekijksessies (beheerder_id, verloopt_op DESC);
CREATE INDEX IF NOT EXISTS meekijksessies_klant_idx
  ON public.meekijksessies (client_id, gestart_op DESC);

CREATE TABLE IF NOT EXISTS public.meekijkpaginas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sessie_id uuid NOT NULL REFERENCES public.meekijksessies(id) ON DELETE CASCADE,
  pad text NOT NULL CHECK (length(pad) BETWEEN 1 AND 300),
  bekeken_op timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meekijkpaginas_sessie_idx
  ON public.meekijkpaginas (sessie_id, bekeken_op);

-- Lezen mag: de beheerder zijn eigen sessies, de klant de sessies bij hem.
-- Schrijven gaat alleen via de functies hieronder. Een log die je zelf kunt
-- aanpassen, is geen log.
ALTER TABLE public.meekijksessies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meekijkpaginas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.meekijksessies FROM anon, authenticated;
REVOKE ALL ON public.meekijkpaginas FROM anon, authenticated;
GRANT SELECT ON public.meekijksessies TO authenticated;
GRANT SELECT ON public.meekijkpaginas TO authenticated;
GRANT ALL ON public.meekijksessies TO service_role;
GRANT ALL ON public.meekijkpaginas TO service_role;

DROP POLICY IF EXISTS meekijksessies_lezen ON public.meekijksessies;
CREATE POLICY meekijksessies_lezen ON public.meekijksessies
  FOR SELECT TO authenticated
  USING (beheerder_id = auth.uid() OR client_id = private.mijn_klant(auth.uid()));

DROP POLICY IF EXISTS meekijkpaginas_lezen ON public.meekijkpaginas;
CREATE POLICY meekijkpaginas_lezen ON public.meekijkpaginas
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meekijksessies s
      WHERE s.id = meekijkpaginas.sessie_id
        AND (s.beheerder_id = auth.uid() OR s.client_id = private.mijn_klant(auth.uid()))
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Kijkt deze beheerder op dit moment mee?
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.actieve_meekijkklant(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.client_id
  FROM public.meekijksessies s
  WHERE s.beheerder_id = _user_id
    AND s.gestopt_op IS NULL
    AND s.verloopt_op > now()
    AND private.is_staf(_user_id)
  ORDER BY s.gestart_op DESC
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION private.actieve_meekijkklant(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION private.actieve_meekijkklant(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.meekijkt_agent(_agent_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = _agent_id
      AND a.client_id = private.actieve_meekijkklant(_user_id)
  )
$$;
REVOKE EXECUTE ON FUNCTION private.meekijkt_agent(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION private.meekijkt_agent(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Alleen-lezen toegang tijdens het meekijken
--
--    Aparte policies voor SELECT. Permissieve policies stapelen met OR, dus de
--    eigenaar houdt zijn FOR ALL-policy en de beheerder krijgt er lezen bij,
--    en alleen lezen. De kennisbank staat hier bewust niet tussen.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'outbound_contacts', 'outbound_campaigns', 'outbound_messages',
    'outbound_deliveries', 'outbound_replies'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_meekijken', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
      FOR SELECT TO authenticated
      USING (private.meekijkt_agent(agent_id, auth.uid()))
    $f$, t || '_meekijken', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS lead_requests_meekijken ON public.lead_requests;
CREATE POLICY lead_requests_meekijken ON public.lead_requests
  FOR SELECT TO authenticated
  USING (agent_id IS NOT NULL AND private.meekijkt_agent(agent_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. Welke klant hoort bij deze sessie van de app?
--
--    mijn_klant(): de klant van wie ik ben. Voor alles wat iets wijzigt.
--    werk_klant(): de klant naar wie ik kijk. Tijdens meekijken is dat de klant
--    bij wie wordt meegekeken, anders mijn eigen. Alleen voor lezen.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mijn_klant()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.mijn_klant(auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.mijn_klant() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mijn_klant() TO authenticated;

CREATE OR REPLACE FUNCTION public.werk_klant()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(private.actieve_meekijkklant(auth.uid()), private.mijn_klant(auth.uid()))
$$;
REVOKE EXECUTE ON FUNCTION public.werk_klant() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.werk_klant() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Beginnen, stoppen, schermen vastleggen
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.start_meekijken(_client_id uuid, _reden text)
RETURNS TABLE (id uuid, client_id uuid, verloopt_op timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT private.is_staf(auth.uid()) THEN
    RAISE EXCEPTION 'Alleen een beheerder of support-medewerker kan meekijken';
  END IF;
  IF length(btrim(coalesce(_reden, ''))) < 10 THEN
    RAISE EXCEPTION 'Geef een reden van minstens tien tekens';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _client_id) THEN
    RAISE EXCEPTION 'Deze klant bestaat niet';
  END IF;

  -- Eén sessie tegelijk: een nieuwe sluit de vorige af.
  UPDATE public.meekijksessies s
  SET gestopt_op = now()
  WHERE s.beheerder_id = auth.uid() AND s.gestopt_op IS NULL AND s.verloopt_op > now();

  RETURN QUERY
  INSERT INTO public.meekijksessies AS s (beheerder_id, client_id, reden)
  VALUES (auth.uid(), _client_id, btrim(_reden))
  RETURNING s.id, s.client_id, s.verloopt_op;
END
$$;
REVOKE EXECUTE ON FUNCTION public.start_meekijken(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.start_meekijken(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.stop_meekijken()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.meekijksessies
  SET gestopt_op = now()
  WHERE beheerder_id = auth.uid() AND gestopt_op IS NULL AND verloopt_op > now()
$$;
REVOKE EXECUTE ON FUNCTION public.stop_meekijken() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.stop_meekijken() TO authenticated;

-- Legt een bekeken scherm vast bij de lopende sessie. Zonder sessie gebeurt er
-- niets; zo kan de app dit gewoon bij elke paginawissel aanroepen.
CREATE OR REPLACE FUNCTION public.log_meekijkpagina(_pad text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.meekijkpaginas (sessie_id, pad)
  SELECT s.id, left(_pad, 300)
  FROM public.meekijksessies s
  WHERE s.beheerder_id = auth.uid()
    AND s.gestopt_op IS NULL
    AND s.verloopt_op > now()
    AND length(coalesce(_pad, '')) > 0
    AND private.is_staf(auth.uid())
  ORDER BY s.gestart_op DESC
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.log_meekijkpagina(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.log_meekijkpagina(text) TO authenticated;

-- Voor de balk bovenin: kijk ik mee, bij wie, en tot wanneer.
CREATE OR REPLACE FUNCTION public.mijn_meekijksessie()
RETURNS TABLE (id uuid, client_id uuid, klant text, reden text, verloopt_op timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.client_id, coalesce(nullif(p.name, ''), p.email), s.reden, s.verloopt_op
  FROM public.meekijksessies s
  JOIN public.profiles p ON p.id = s.client_id
  WHERE s.beheerder_id = auth.uid()
    AND s.gestopt_op IS NULL
    AND s.verloopt_op > now()
    AND private.is_staf(auth.uid())
  ORDER BY s.gestart_op DESC
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.mijn_meekijksessie() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mijn_meekijksessie() TO authenticated;

-- De toegangslog voor de klant. Via een functie, omdat de klant het profiel
-- van de beheerder niet mag lezen en hier alleen de naam nodig heeft.
CREATE OR REPLACE FUNCTION public.mijn_toegangslog()
RETURNS TABLE (
  id uuid,
  beheerder text,
  reden text,
  gestart_op timestamptz,
  geeindigd_op timestamptz,
  paginas text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.id,
    coalesce(nullif(b.name, ''), 'Zakelijke AI Agents'),
    s.reden,
    s.gestart_op,
    least(coalesce(s.gestopt_op, s.verloopt_op), s.verloopt_op),
    coalesce(
      (SELECT array_agg(DISTINCT m.pad ORDER BY m.pad)
       FROM public.meekijkpaginas m WHERE m.sessie_id = s.id),
      '{}'
    )
  FROM public.meekijksessies s
  JOIN public.profiles b ON b.id = s.beheerder_id
  WHERE s.client_id = private.mijn_klant(auth.uid())
  ORDER BY s.gestart_op DESC
  LIMIT 100
$$;
REVOKE EXECUTE ON FUNCTION public.mijn_toegangslog() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mijn_toegangslog() TO authenticated;
