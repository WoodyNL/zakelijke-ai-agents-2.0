import { supabase } from "@/lib/supabase-browser";

/**
 * Moet deze sessie nog een code uit de app bevestigen?
 *
 * Supabase weigert een inlog met alleen een wachtwoord niet. Het geeft de
 * sessie het niveau "aal1" en zegt via nextLevel wat het niveau zou moeten
 * zijn: staat er een bevestigde app ingesteld, dan is dat "aal2". Het verschil
 * tussen die twee is precies de vraag "is de tweede stap nog open?".
 *
 * Bij twijfel zeggen we nee. Een storing in deze aanroep mag niemand voor een
 * dichte deur zetten; wat er echt achter de deur mag, bepaalt de database.
 */
export async function tweedeStapNodig(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return false;
    return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
  } catch {
    return false;
  }
}

/** De ingestelde app waarmee de code bevestigd wordt. */
export async function mijnFactor(): Promise<{ id: string } | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return null;
  const bevestigd = (data.all ?? []).filter((f) => f.status === "verified");
  return data.totp?.[0] ?? bevestigd[0] ?? null;
}

/**
 * Zet de code om in een sessie op niveau aal2.
 *
 * Geeft een nette melding terug in plaats van de Engelse tekst van Supabase;
 * dit is het eerste wat iemand ziet als hij zich vertypt.
 */
export async function bevestigTweedeStap(code: string): Promise<void> {
  const schoon = code.replace(/\D/g, "");
  if (schoon.length !== 6) throw new Error("Vul de zes cijfers uit je app in.");

  const factor = await mijnFactor();
  if (!factor) throw new Error("Op dit account staat geen app ingesteld.");

  const uitdaging = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (uitdaging.error) throw new Error(uitdaging.error.message);

  const { error } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: uitdaging.data.id,
    code: schoon,
  });
  if (error) {
    throw new Error(
      /invalid|incorrect/i.test(error.message)
        ? "Die code klopt niet (of is verlopen). Kijk in je app en probeer de nieuwe code."
        : error.message,
    );
  }
}
