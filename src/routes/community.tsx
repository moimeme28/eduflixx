import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Compass, Users } from "lucide-react";
import { listPublicLists, listMyFollowing } from "@/lib/social.functions";
import { SUBJECTS } from "@/lib/subjects";
import { useAuth } from "@/hooks/useAuth";
import { ListCard } from "@/components/ListCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/community")({
  loader: () => listPublicLists({ data: {} }),
  head: () => ({
    meta: [
      { title: "Community Lists — EduFlix" },
      { name: "description", content: "Discover curated lists of educational films and series shared by learners and teachers on EduFlix." },
      { property: "og:title", content: "Community Lists — EduFlix" },
      { property: "og:description", content: "Discover curated lists of educational films and series shared by learners and teachers on EduFlix." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { user } = useAuth();
  const initial = Route.useLoaderData();
  const [tab, setTab] = useState<"discover" | "following">("discover");
  const [subject, setSubject] = useState<string>("");

  const publicFn = useServerFn(listPublicLists);
  const followingFn = useServerFn(listMyFollowing);

  const discoverQuery = useQuery({
    queryKey: ["public-lists", subject],
    queryFn: () => publicFn({ data: subject ? { subject } : {} }),
    initialData: initial,
  });

  const followingIdsQuery = useQuery({
    queryKey: ["my-following"],
    queryFn: () => followingFn(),
    enabled: !!user && tab === "following",
  });

  const followingListsQuery = useQuery({
    queryKey: ["public-lists", "following", followingIdsQuery.data],
    queryFn: () =>
      publicFn({ data: { following: followingIdsQuery.data ?? [], limit: 100 } }),
    enabled: tab === "following" && !!followingIdsQuery.data,
  });

  const isLoading = tab === "discover" ? discoverQuery.isLoading : followingListsQuery.isLoading || followingIdsQuery.isLoading;
  const lists = tab === "discover" ? discoverQuery.data ?? [] : followingListsQuery.data ?? [];

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Community lists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated collections of educational films and series shared by learners and teachers.
          </p>
        </div>
        {user && (
          <div className="flex gap-2">
            <Button variant={tab === "discover" ? "default" : "outline"} size="sm" onClick={() => setTab("discover")}>
              <Compass className="mr-1.5 h-4 w-4" /> Discover
            </Button>
            <Button variant={tab === "following" ? "default" : "outline"} size="sm" onClick={() => setTab("following")}>
              <Users className="mr-1.5 h-4 w-4" /> Following
            </Button>
          </div>
        )}
      </div>

      {tab === "discover" && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge
            variant={subject === "" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSubject("")}
          >
            All subjects
          </Badge>
          {SUBJECTS.map((s) => (
            <Badge
              key={s.slug}
              variant={subject === s.name ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSubject(s.name)}
            >
              {s.name}
            </Badge>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <p className="text-lg font-semibold">No lists found</p>
          <p className="mt-1 text-sm">
            {tab === "following"
              ? "People you follow haven’t shared any public lists yet."
              : subject
                ? `No public lists for ${subject} yet. Be the first to create one.`
                : "No public lists yet. Be the first to share one."}
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} owner={list.owner} />
          ))}

        </div>
      )}
    </main>
  );
}
