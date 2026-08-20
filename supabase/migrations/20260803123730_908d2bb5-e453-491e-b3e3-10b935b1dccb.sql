CREATE POLICY "Invited student can join class"
ON public.class_members
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.class_invites ci
    WHERE ci.class_id = class_members.class_id
      AND lower(ci.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
);