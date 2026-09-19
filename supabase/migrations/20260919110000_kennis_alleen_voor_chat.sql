-- Alleen een chat-assistent geeft zijn kennis aan een bezoeker.
--
-- agent_knowledge() is openbaar: de chat-assistent op een website haalt er zijn
-- kennis mee op, met niets meer dan zijn slug. Voor een chat-assistent is dat
-- de bedoeling: alles in die kennisbank vertelt hij toch al aan elke bezoeker.
--
-- Maar de functie keek niet naar de soort. Een e-mailagent met een slug die
-- live stond, gaf zijn kennisbank net zo goed prijs, en daar staat wat hij
-- namens de klant mag zeggen over prijzen, levering en interne afspraken.
-- Wie de slug raadde, kon dat lezen.
--
-- De andere soorten lezen hun kennis op de server met de service-role, direct
-- uit knowledge_items. Die hebben deze functie niet nodig.

CREATE OR REPLACE FUNCTION public.agent_knowledge(_slug text)
RETURNS TABLE (category text, title text, question text, content text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.category, k.title, k.question, k.content
  FROM public.knowledge_items k
  JOIN public.agents a ON a.id = k.agent_id
  WHERE a.slug = _slug
    AND a.status = 'live'
    AND a.kind = 'chat_assistent'
    AND k.is_active = true
  ORDER BY k.category, k.sort_order
$$;
REVOKE EXECUTE ON FUNCTION public.agent_knowledge(text) FROM public;
GRANT EXECUTE ON FUNCTION public.agent_knowledge(text) TO anon, authenticated;
