import { Link } from "@tanstack/react-router";
import { Star, Film, Tv } from "lucide-react";
import type { TitleItem } from "@/lib/tmdb.functions";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AddToListButton } from "@/components/AddToListButton";


export function TitleCard({ item, className }: { item: TitleItem; className?: string }) {
  return (
    <div
      className={cn(
        "group relative block w-[150px] shrink-0 overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card)] transition-transform duration-300 hover:z-10 hover:-translate-y-1 hover:scale-[1.04] sm:w-[176px]",
        className,
      )}
    >
      <Link to="/title/$type/$id" params={{ type: item.mediaType, id: String(item.id) }} className="block">
        <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
          {item.poster ? (
            <img
              src={item.poster}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              {item.mediaType === "tv" ? <Tv className="h-8 w-8" /> : <Film className="h-8 w-8" />}
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent p-3 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="line-clamp-2 text-sm font-semibold leading-tight">{item.title}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{item.year || "—"}</span>
            {item.rating > 0 && (
              <span className="flex items-center gap-0.5 text-accent">
                <Star className="h-3 w-3 fill-current" /> {item.rating}
              </span>
            )}
          </div>
        </div>
      </Link>
      <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide backdrop-blur">
        {item.mediaType === "tv" ? "Series" : "Film"}
      </span>
      <FavoriteButton
        variant="icon"
        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        item={{
          tmdbId: item.id,
          mediaType: item.mediaType,
          title: item.title,
          poster: item.poster,
          year: item.year,
          rating: item.rating,
        }}
      />
      <AddToListButton
        variant="icon"
        className="absolute right-2 top-12 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        item={{
          tmdbId: item.id,
          mediaType: item.mediaType,
          title: item.title,
          poster: item.poster,
          year: item.year,
          rating: item.rating,
        }}
      />
    </div>
  );
}


