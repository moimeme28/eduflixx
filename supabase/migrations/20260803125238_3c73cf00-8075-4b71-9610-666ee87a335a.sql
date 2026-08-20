CREATE OR REPLACE FUNCTION public.teaches_student(_teacher_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = _student_id AND c.teacher_id = _teacher_id
  )
$$;

CREATE POLICY "Teachers read their students profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.teaches_student(auth.uid(), id));