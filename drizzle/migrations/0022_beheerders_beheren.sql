-- Beheerders zijn geen vaste waarde meer, en de laatste kan er niet uit.
--
-- Tot nu toe stond er in de trigger die bij elk nieuw account draait:
--
--   CASE WHEN lower(NEW.email) = 'wouterransijn@gmail.com' THEN 'admin' ... END
--
-- Eén persoonlijk e-mailadres, hardgecodeerd in de database. Dat werkte
-- zolang het bedrijf uit één persoon bestond, maar het is ook een
-- enkelvoudig faalpunt: raakt dat account kwijt, dan kan niemand het beheer
-- meer in — ook de eigenaar niet, want er is op Lovable Cloud geen
-- databaseconsole om het terug te zetten.
--
-- Vanaf nu krijgt elk nieuw account de rol 'client'. Beheerders worden
-- toegekend vanuit het portaal, door een beheerder, en dat wordt vastgelegd
-- in het beheerlog.
--
-- Herhaalbaar: alle drie de onderdelen mogen twee keer draaien.

-- ---------------------------------------------------------------------------
-- 1. Geen vaste beheerder meer bij het aanmaken van een account.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  -- Iedereen begint als klant. Beheer wordt toegekend, niet geërfd van een
  -- adres dat toevallig in een migratie staat.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Vangnet: er moet er één zijn.
--
--    Dit grijpt alleen in als er werkelijk geen enkele beheerder bestaat.
--    In een draaiende omgeving doet het dus niets — daar staat de rol al in
--    de tabel. Het is er voor het geval de regel hierboven wordt verwijderd
--    in een omgeving die nog geen beheerder had: zonder dit zou die omgeving
--    voor altijd op slot zitten.
--
--    Dat hier nog één keer een adres staat is bewust iets anders dan
--    hierboven: dit is een eenmalige reparatie van gegevens, geen regel die
--    bij elk toekomstig account opnieuw afgaat.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role) THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT u.id, 'admin'::public.app_role
    FROM auth.users u
    WHERE lower(u.email) = 'wouterransijn@gmail.com'
    ON CONFLICT DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role) THEN
      RAISE NOTICE 'Let op: er is geen beheerder. Ken er handmatig een toe voordat iemand het beheer nodig heeft.';
    END IF;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. De laatste beheerder kan er niet uit.
--
--    De controle hoort hier en niet alleen in de applicatie. Twee verzoeken
--    die tegelijk binnenkomen zien allebei nog twee beheerders en halen er
--    allebei één weg; dan is er nul. De database telt binnen dezelfde
--    transactie en dat is het enige punt waar dat klopt.
--
--    Ook op UPDATE, want een rol wegwerken door hem te wijzigen is hetzelfde
--    gat met een andere naam.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.beheerder_blijft_over()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _over integer;
BEGIN
  IF OLD.role <> 'admin'::public.app_role THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Bij een wijziging die de rol beheerder laat staan, verandert er niets.
  IF TG_OP = 'UPDATE' AND NEW.role = 'admin'::public.app_role THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO _over
  FROM public.user_roles
  WHERE role = 'admin'::public.app_role
    AND user_id <> OLD.user_id;

  IF _over = 0 THEN
    RAISE EXCEPTION 'De laatste beheerder kan niet worden verwijderd.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION private.beheerder_blijft_over() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS user_roles_laatste_beheerder ON public.user_roles;
CREATE TRIGGER user_roles_laatste_beheerder
  BEFORE DELETE OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION private.beheerder_blijft_over();

COMMENT ON FUNCTION private.beheerder_blijft_over() IS
  'Weigert het verwijderen of degraderen van de laatste beheerder. Staat in de database en niet alleen in de applicatie, omdat twee gelijktijdijdige verzoeken daar allebei zouden slagen.';
