import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole, type Role } from "@/lib/classroom.functions";
import { useAuth } from "@/hooks/useAuth";

export function useRole(): { role: Role | null; isLoading: boolean } {
  const { user } = useAuth();
  const fn = useServerFn(getMyRole);
  const q = useQuery({
    queryKey: ["my-role", user?.id],
    queryFn: async () => (await fn()).role,
    enabled: !!user,
    staleTime: 60_000,
  });
  return { role: q.data ?? null, isLoading: q.isLoading };
}
