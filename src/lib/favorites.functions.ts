import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";

export interface FavoriteItem {
  id: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  poster: string | null;
  year: string | null;
  rating: number | null;
  note: string | null;
  createdAt: string;
}

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FavoriteItem[]> => {
    const { data, error } = await context.supabase
      .from("favorites")
      .select("id, tmdb_id, media_type, title, poster, year, rating, note, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      tmdbId: r.tmdb_id,
      mediaType: r.media_type as "movie" | "tv",
      title: r.title,
      poster: r.poster,
      year: r.year,
      rating: r.rating,
      note: r.note,
      createdAt: r.created_at,
    }));
  });

export const addFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      tmdbId: number;
      mediaType: "movie" | "tv";
      title: string;
      poster?: string | null;
      year?: string | null;
      rating?: number | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("favorites").upsert(
      {
        user_id: context.userId,
        tmdb_id: data.tmdbId,
        media_type: data.mediaType,
        title: data.title,
        poster: data.poster ?? null,
        year: data.year ?? null,
        rating: data.rating ?? null,
      },
      { onConflict: "user_id,media_type,tmdb_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tmdbId: number; mediaType: "movie" | "tv" }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorites")
      .delete()
      .eq("user_id", context.userId)
      .eq("tmdb_id", data.tmdbId)
      .eq("media_type", data.mediaType);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateFavoriteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; note: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorites")
      .update({ note: data.note })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
