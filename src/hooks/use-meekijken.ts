import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/dashboard.functions";
import { haalMeekijksessie } from "@/lib/meekijken.functions";

/**
 * Kijkt deze medewerker op dit moment mee, en bij wie?
 *
 * Alleen gevraagd voor wie bij ons werkt (beheerder of support); voor een klant
 * is het antwoord altijd nee. Eén keer per minuut opnieuw: een sessie verloopt
 * na een uur, en dan moet de balk verdwijnen en het portaal terugvallen op de
 * eigen agents.
 */
export function useMeekijken() {
  const meFn = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const fn = useServerFn(haalMeekijksessie);
  return useQuery({
    queryKey: ["meekijken"],
    queryFn: () => fn(),
    enabled: me.data?.isStaf === true,
    refetchInterval: 60_000,
  });
}
