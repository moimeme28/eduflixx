-- Remove implicit PUBLIC execute grants on all security definer / helper functions
REVOKE ALL ON FUNCTION public.admin_exists() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_class_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_class_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.teaches_student(uuid, uuid) FROM PUBLIC, anon;

-- Trigger-only functions: nobody but the database/owner should call these
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Grant back only what the app needs
GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;
-- Required by RLS policy expressions evaluated as the signed-in role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teaches_student(uuid, uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_exists() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_class_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_class_teacher(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.teaches_student(uuid, uuid) TO service_role;