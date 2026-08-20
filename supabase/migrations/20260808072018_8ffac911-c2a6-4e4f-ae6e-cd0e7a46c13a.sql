CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_class_member(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_class_teacher(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.teaches_student(uuid, uuid) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_class_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_class_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.teaches_student(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_class_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_class_teacher(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.teaches_student(uuid, uuid) TO authenticated, service_role;

-- Keep internal callers resolving correctly
ALTER FUNCTION private.has_role(uuid, public.app_role) SET search_path = public, private;
ALTER FUNCTION private.is_class_member(uuid, uuid) SET search_path = public, private;
ALTER FUNCTION private.is_class_teacher(uuid, uuid) SET search_path = public, private;
ALTER FUNCTION private.teaches_student(uuid, uuid) SET search_path = public, private;
ALTER FUNCTION public.admin_set_role(uuid, public.app_role, boolean) SET search_path = public, private;
ALTER FUNCTION public.claim_admin() SET search_path = public, private;