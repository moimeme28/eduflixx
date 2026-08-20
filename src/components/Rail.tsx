import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TitleCard } from "@/components/TitleCard";
import type { TitleItem } from "@/lib/tmdb.functions";

interface RailProps {
  title: string;
  items?: TitleItem[];
  isLoading?: boolean;
  action?: ReactNode;
  emptyLabel?: string;
}

export function Rail({ title, items, isLoading, action, emptyLabel }: RailProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 px-4 sm:px-8">
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        {action}
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 sm:px-8">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-[150px] shrink-0 rounded-xl sm:w-[176px]" />
          ))}
        {!isLoading && items?.map((item) => <TitleCard key={`${item.mediaType}-${item.id}`} item={item} />)}
        {!isLoading && (!items || items.length === 0) && (
          <p className="py-8 text-sm text-muted-foreground">{emptyLabel ?? "Nothing here yet."}</p>
        )}
      </div>
    </section>
  );
}
