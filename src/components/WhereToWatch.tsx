import { ExternalLink, Play } from "lucide-react";
import type { WatchAvailability, WatchOption } from "@/lib/tmdb.functions";
import { Badge } from "@/components/ui/badge";

const KIND_LABEL: Record<WatchOption["kind"], string> = {
  stream: "Subscription",
  free: "Free",
  rent: "Rent",
  buy: "Buy",
};

// Deep-link to the JustWatch offer page TMDB provides — it forwards the viewer
// straight to the provider's page for this title in their country.
export function WhereToWatch({
  title,
  watch,
  region,
}: {
  title: string;
  watch: WatchAvailability | null;
  region: string;
}) {
  const fallbackSearch = `https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}`;
  const link = watch?.link || fallbackSearch;
  const options = watch?.options ?? [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Play className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Where to watch</h3>
        {watch && watch.region !== region && (
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {watch.region}
          </Badge>
        )}
      </div>

      {options.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {options.slice(0, 6).map((o) => (
            <li key={`${o.kind}-${o.name}`}>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-2 transition hover:border-primary/50 hover:bg-primary/5"
              >
                {o.logo ? (
                  <img src={o.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-muted" />
                )}
                <span className="flex-1 text-sm font-medium">{o.name}</span>
                <span className="text-xs text-muted-foreground">{KIND_LABEL[o.kind]}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No streaming listings found for your region yet.
        </p>
      )}

      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        See all watch options <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <p className="mt-2 text-[11px] text-muted-foreground">Availability data by JustWatch via TMDB.</p>
    </div>
  );
}
