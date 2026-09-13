CREATE TABLE public.lead_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text,
  stage text NOT NULL DEFAULT '',
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.lead_requests TO authenticated;
GRANT ALL ON public.lead_requests TO service_role;

ALTER TABLE public.lead_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lead requests"
ON public.lead_requests
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));