
-- Admin read policies
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all classes" ON public.classes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage classes" ON public.classes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all members" ON public.class_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all assignments" ON public.assignments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all progress" ON public.assignment_progress FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Bootstrap: first signed-in user can claim admin only while no admin exists
CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE has_any boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO has_any;
  IF has_any THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') $$;

-- Admins can grant/revoke roles
CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id uuid, _role app_role, _grant boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF _role = 'admin' AND _user_id = auth.uid() THEN
      RAISE EXCEPTION 'cannot remove your own admin role';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) TO authenticated;
