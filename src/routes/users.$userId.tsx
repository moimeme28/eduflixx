import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, Film, UserCheck } from "lucide-react";
import { getUserProfile, getFollowCounts } from "@/lib/social.functions";
import { FollowButton } from "@/components/FollowButton";
import { ListCard } from "@/components/ListCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/users/$userId")({
  loader: async ({ params }) => {
    try {
      return await getUserProfile({ data: { userId: params.userId } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.profile.displayName || "Learner"} — EduFlix` : "Profile — EduFlix" },
      { name: "description", content: loaderData ? `Public lists and profile for ${loaderData.profile.displayName || "an EduFlix learner"}.` : "EduFlix learner profile" },
      { property: "og:title", content: loaderData ? `${loaderData.profile.displayName || "Learner"} — EduFlix` : "Profile — EduFlix" },
      { property: "og:description", content: loaderData ? `Public lists and profile for ${loaderData.profile.displayName || "an EduFlix learner"}.` : "EduFlix learner profile" },
    ],
  }),
  component: UserProfilePage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">User not found</h1>
      <Button asChild className="mt-6">
        <Link to="/community">Browse community</Link>
      </Button>
    </main>
  ),
});

function UserProfilePage() {
  const initial = Route.useLoaderData();
  const userId = Route.useParams().userId;
  const countsFn = useServerFn(getFollowCounts);

  const { data } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => getUserProfile({ data: { userId } }),
    initialData: initial,
  });

  const { data: liveCounts } = useQuery({
    queryKey: ["follow-counts", userId],
    queryFn: () => countsFn({ data: { userId } }),
    initialData: initial.counts,
  });

  if (!data) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
      <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{data.profile.displayName || "EduFlix learner"}</h1>
              <p className="text-sm text-muted-foreground">{data.profile.email}</p>
              <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <UserCheck className="h-4 w-4" /> {liveCounts?.followers ?? data.counts.followers} followers
                </span>
                <span>{liveCounts?.following ?? data.counts.following} following</span>
              </div>
            </div>
          </div>
          <FollowButton userId={userId} />
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">Public lists</h2>
        {data.lists.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No public lists yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.lists.map((list) => (
              <ListCard key={list.id} list={list} owner={data.profile} />
            ))}

          </div>
        )}
      </section>
    </main>
  );
}
