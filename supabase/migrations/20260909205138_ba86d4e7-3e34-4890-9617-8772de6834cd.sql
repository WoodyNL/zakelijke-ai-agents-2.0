CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY "Users read own roles" ON public.user_roles;
DROP POLICY "Users read own profile" ON public.profiles;
DROP POLICY "Users update own profile" ON public.profiles;
DROP POLICY "Clients read own agents" ON public.agents;
DROP POLICY "Admins manage agents" ON public.agents;
DROP POLICY "Clients read own agent stats" ON public.agent_stats;
DROP POLICY "Admins manage agent stats" ON public.agent_stats;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin')) WITH CHECK (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients read own agents" ON public.agents FOR SELECT TO authenticated USING (client_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage agents" ON public.agents FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients read own agent stats" ON public.agent_stats FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_stats.agent_id AND (a.client_id = auth.uid() OR private.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Admins manage agent stats" ON public.agent_stats FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP FUNCTION public.has_role(uuid, public.app_role);