import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toggleFollow, getMyFollowStatus } from "@/lib/social.functions";
import { cn } from "@/lib/utils";

export function FollowButton({ userId, className }: { userId: string; className?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const statusFn = useServerFn(getMyFollowStatus);
  const toggleFn = useServerFn(toggleFollow);

  const { data: status, isLoading } = useQuery({
    queryKey: ["follow-status", userId],
    queryFn: () => statusFn({ data: { userId } }),
    enabled: !!user && user.id !== userId,
  });

  const mut = useMutation({
    mutationFn: () => toggleFn({ data: { userId } }),
    onSuccess: (res) => {
      queryClient.setQueryData(["follow-status", userId], res);
      queryClient.invalidateQueries({ queryKey: ["follow-status", userId] });
      queryClient.invalidateQueries({ queryKey: ["follow-counts", userId] });
      queryClient.invalidateQueries({ queryKey: ["public-lists"] });
      toast.success(res.following ? "Following" : "Unfollowed");
    },
    onError: (err) => toast.error((err as Error).message || "Could not update follow"),
  });

  if (!user || user.id === userId) return null;
  if (isLoading) {
    return (
      <Button size="sm" disabled className={cn("gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading
      </Button>
    );
  }

  const following = status?.following ?? false;
  return (
    <Button
      size="sm"
      variant={following ? "secondary" : "default"}
      className={cn("gap-2", className)}
      disabled={mut.isPending}
      onClick={() => {
        if (!user) {
          toast.info("Sign in to follow other learners.");
          navigate({ to: "/auth" });
          return;
        }
        mut.mutate();
      }}
    >
      {mut.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
