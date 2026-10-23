-- Serialiseer rolwijzigingen vóór de bestaande laatste-beheerdercontrole.
-- Een echte rijwijziging beschermt ook bij REPEATABLE READ tegen een oud snapshot.
CREATE TABLE IF NOT EXISTS private.beheerder_wijzigingsslot (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  versie bigint NOT NULL DEFAULT 0
);
REVOKE ALL ON TABLE private.beheerder_wijzigingsslot FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.vergrendel_beheerders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO private.beheerder_wijzigingsslot (id, versie)
  VALUES (true, 1)
  ON CONFLICT (id) DO UPDATE
    SET versie = private.beheerder_wijzigingsslot.versie + 1;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.vergrendel_beheerders() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_roles_beheerders_serieel ON public.user_roles;
CREATE TRIGGER user_roles_beheerders_serieel
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH STATEMENT EXECUTE FUNCTION private.vergrendel_beheerders();

COMMENT ON FUNCTION private.vergrendel_beheerders() IS
  'Serialiseert rolwijzigingen met een transactieslot voordat de laatste beheerder wordt gecontroleerd.';
