import { Link } from "@tanstack/react-router";
import { Film, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EduList, PublicProfile } from "@/lib/social.functions";

export function ListCard({ list, owner }: { list: EduList; owner?: PublicProfile | null }) {
  const ownerName = owner?.displayName ?? (list as any).owner?.displayName ?? "Unknown";

  return (
    <Link
      to="/lists/$listId"
      params={{ listId: list.id }}
      className="group flex flex-col rounded-2xl border border-border bg-card/50 p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 text-base font-semibold group-hover:text-primary">{list.name}</h3>
        {!list.isPublic && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      </div>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
        {list.description || "No description yet."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {list.subject && <Badge variant="secondary">{list.subject}</Badge>}
        <span className="flex items-center gap-1">
          <Film className="h-3 w-3" /> {list.itemCount ?? 0} titles
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" /> {ownerName}
        </span>

      </div>
    </Link>
  );
}
