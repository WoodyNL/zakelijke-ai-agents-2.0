GRANT SELECT ON public.knowledge_items TO anon;

CREATE POLICY "Anon can read active knowledge items"
ON public.knowledge_items
FOR SELECT
TO anon
USING (is_active = true);