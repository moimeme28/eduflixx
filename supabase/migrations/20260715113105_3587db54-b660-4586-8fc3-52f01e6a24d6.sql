
-- Roles
CREATE TYPE public.app_role AS ENUM ('student','teacher','admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-assign role on signup based on raw_user_meta_data.role
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chosen text;
  r public.app_role;
BEGIN
  chosen := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  IF chosen NOT IN ('student','teacher') THEN chosen := 'student'; END IF;
  r := chosen::public.app_role;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Classes
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  subject text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Class members
CREATE TABLE public.class_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_members TO authenticated;
GRANT ALL ON public.class_members TO service_role;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Helper: is user a member of the class
CREATE OR REPLACE FUNCTION public.is_class_member(_class_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.class_members WHERE class_id = _class_id AND student_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_class_teacher(_class_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classes WHERE id = _class_id AND teacher_id = _user_id)
$$;

-- Class policies
CREATE POLICY "Teacher manages own classes" ON public.classes FOR ALL TO authenticated
  USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(),'teacher'));
CREATE POLICY "Members can view class" ON public.classes FOR SELECT TO authenticated
  USING (public.is_class_member(id, auth.uid()));

-- Class member policies
CREATE POLICY "Teacher manages members" ON public.class_members FOR ALL TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid())) WITH CHECK (public.is_class_teacher(class_id, auth.uid()));
CREATE POLICY "Student reads own membership" ON public.class_members FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
CREATE POLICY "Student can leave" ON public.class_members FOR DELETE TO authenticated
  USING (auth.uid() = student_id);

-- Invites
CREATE TABLE public.class_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_invites TO authenticated;
GRANT ALL ON public.class_invites TO service_role;
ALTER TABLE public.class_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teacher manages invites" ON public.class_invites FOR ALL TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid())) WITH CHECK (public.is_class_teacher(class_id, auth.uid()));
CREATE POLICY "Invitee reads own invites" ON public.class_invites FOR SELECT TO authenticated
  USING (lower(email) = lower(coalesce((auth.jwt()->>'email'),'')));
CREATE POLICY "Invitee updates own invites" ON public.class_invites FOR UPDATE TO authenticated
  USING (lower(email) = lower(coalesce((auth.jwt()->>'email'),'')));

-- Assignments
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_id integer NOT NULL,
  media_type text NOT NULL,
  title text NOT NULL,
  poster text,
  subject text,
  note text,
  scene_start text,
  scene_end text,
  episode_info text,
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teacher manages assignments" ON public.assignments FOR ALL TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid())) WITH CHECK (public.is_class_teacher(class_id, auth.uid()));
CREATE POLICY "Members read assignments" ON public.assignments FOR SELECT TO authenticated
  USING (public.is_class_member(class_id, auth.uid()));

-- Progress
CREATE TABLE public.assignment_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_progress TO authenticated;
GRANT ALL ON public.assignment_progress TO service_role;
ALTER TABLE public.assignment_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student manages own progress" ON public.assignment_progress FOR ALL TO authenticated
  USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teacher reads class progress" ON public.assignment_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND public.is_class_teacher(a.class_id, auth.uid())));

-- updated_at triggers
CREATE TRIGGER trg_classes_updated BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON public.assignment_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
