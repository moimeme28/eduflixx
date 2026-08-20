import { useNavigate } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavorites, type FavoriteInput } from "@/hooks/useFavorites";

export function FavoriteButton({
  item,
  variant = "default",
  className,
}: {
  item: FavoriteInput;
  variant?: "default" | "icon";
  className?: string;
}) {
  const navigate = useNavigate();
  const { user, isFavorite, add, remove, isMutating } = useFavorites();
  const saved = isFavorite(item.mediaType, item.tmdbId);

  function toggle() {
    if (!user) {
      toast.info("Sign in to save titles to your watchlist.");
      navigate({ to: "/auth" });
      return;
    }
    if (saved) {
      remove({ tmdbId: item.tmdbId, mediaType: item.mediaType });
      toast.success("Removed from watchlist");
    } else {
      add(item);
      toast.success("Saved to watchlist");
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isMutating}
        aria-label={saved ? "Remove from watchlist" : "Save to watchlist"}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full glass text-foreground transition-colors hover:text-primary disabled:opacity-60",
          saved && "text-primary",
          className,
        )}
      >
        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <Button
      type="button"
      onClick={toggle}
      disabled={isMutating}
      variant={saved ? "secondary" : "default"}
      className={cn("gap-2", className)}
    >
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {saved ? "In your watchlist" : "Save to watchlist"}
    </Button>
  );
}
