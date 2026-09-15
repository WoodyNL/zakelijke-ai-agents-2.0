CREATE POLICY "Authenticated users read active knowledge"
ON public.knowledge_items
FOR SELECT
TO authenticated
USING (is_active = true);

GRANT INSERT ON public.lead_requests TO anon;

CREATE POLICY "Anyone can submit a lead request"
ON public.lead_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);