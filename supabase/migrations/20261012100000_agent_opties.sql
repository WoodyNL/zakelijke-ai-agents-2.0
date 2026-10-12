-- Opties per agent: één veld voor alles wat je aan en uit kunt zetten.
--
-- Bestaande instellingen blijven staan waar ze staan (model, toon, fair use,
-- toegestane domeinen). Die werken, en een werkende kolom verhuizen levert
-- alleen risico op. Nieuwe opties komen hier terecht, zodat een nieuwe functie
-- geen nieuwe kolom meer vraagt. Welke opties er bestaan, wat ze betekenen en
-- wie ze mag zetten, staat in src/lib/agent-opties.ts — niet hier, want dat is
-- productkennis en geen gegevensstructuur.

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS opties jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_opties_object;
ALTER TABLE public.agents
  ADD CONSTRAINT agents_opties_object CHECK (jsonb_typeof(opties) = 'object');

-- ---------------------------------------------------------------------------
-- De klant zet zijn eigen opties
--
--    De agents-tabel is van ons: alleen een beheerder mag erin schrijven, want
--    daar staan ook de status, de fair use en het tarief. Maar een deel van de
--    opties is van de klant (zijn toon, zijn meldadres, wat de agent mag
--    vragen). Daarom deze functie: hij controleert eigendom, en laat alleen
--    de sleutels door die de server meegeeft.
--
--    Welke sleutels dat zijn, bepaalt de app (agent-opties.ts). Dat lijkt een
--    zwakke plek, maar is het niet: de functie accepteert alleen losse velden
--    van het optie-object en kan de status, het tarief of het eigendom van een
--    agent niet aanraken. Het ergste wat een fout in die lijst kan doen, is
--    een optie opslaan die de klant niet had mogen zetten.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.zet_mijn_agent_opties(_agent_id uuid, _opties jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  nieuw jsonb;
BEGIN
  IF NOT private.owns_agent(_agent_id, auth.uid()) THEN
    RAISE EXCEPTION 'Deze agent bestaat niet, of is niet van jou.';
  END IF;
  IF _opties IS NULL OR jsonb_typeof(_opties) <> 'object' THEN
    RAISE EXCEPTION 'Ongeldige opties.';
  END IF;
  -- Niet vervangen maar samenvoegen: wat de beheerder heeft gezet en hier niet
  -- in staat, blijft staan.
  UPDATE public.agents
  SET opties = coalesce(opties, '{}'::jsonb) || _opties
  WHERE id = _agent_id
  RETURNING opties INTO nieuw;
  RETURN nieuw;
END
$$;
REVOKE EXECUTE ON FUNCTION public.zet_mijn_agent_opties(uuid, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.zet_mijn_agent_opties(uuid, jsonb) TO authenticated;

-- Een paar kolommen zijn van de klant en niet van ons: zijn toon, zijn
-- welkomsttekst, het adres waar meldingen heen gaan, en of de agent om
-- contactgegevens mag vragen. Diezelfde controle, en nadrukkelijk alleen deze
-- vier: de status, de fair use, het tarief en de koppeling aan een klant
-- blijven van de beheerder.
CREATE OR REPLACE FUNCTION public.zet_mijn_agent_velden(
  _agent_id uuid,
  _tone text DEFAULT NULL,
  _welcome_text text DEFAULT NULL,
  _notify_email text DEFAULT NULL,
  _capture_leads boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.owns_agent(_agent_id, auth.uid()) THEN
    RAISE EXCEPTION 'Deze agent bestaat niet, of is niet van jou.';
  END IF;
  UPDATE public.agents
  SET tone = coalesce(_tone, tone),
      welcome_text = coalesce(_welcome_text, welcome_text),
      notify_email = coalesce(_notify_email, notify_email),
      capture_leads = coalesce(_capture_leads, capture_leads)
  WHERE id = _agent_id;
END
$$;
REVOKE EXECUTE ON FUNCTION public.zet_mijn_agent_velden(uuid, text, text, text, boolean)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.zet_mijn_agent_velden(uuid, text, text, text, boolean)
  TO authenticated;
