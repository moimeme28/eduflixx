// Server-only TMDB search used by the AI assistant tool.
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

export interface RecommendedTitle {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string;
  rating: number;
  overview: string;
  poster: string | null;
}

interface Raw {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
}

async function tmdb<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not configured");
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB request failed (${res.status})`);
  return (await res.json()) as T;
}

function normalize(raw: Raw, fallback?: "movie" | "tv"): RecommendedTitle | null {
  const mediaType = (raw.media_type === "tv" || raw.media_type === "movie"
    ? raw.media_type
    : fallback) as "movie" | "tv" | undefined;
  if (!mediaType) return null;
  const date = raw.release_date || raw.first_air_date || "";
  return {
    id: raw.id,
    mediaType,
    title: raw.title || raw.name || "Untitled",
    overview: raw.overview || "",
    poster: raw.poster_path ? `${TMDB_IMG}/w342${raw.poster_path}` : null,
    year: date ? date.slice(0, 4) : "",
    rating: raw.vote_average ? Math.round(raw.vote_average * 10) / 10 : 0,
  };
}

export async function searchEducationalTitles(
  query: string,
  format?: string,
): Promise<RecommendedTitle[]> {
  const wantTv = !format || ["TV Series", "Mini Series", "Series"].includes(format);
  const wantMovie = !format || !wantTv || ["Movie", "Documentary", "Film"].includes(format);
  const out: (RecommendedTitle | null)[] = [];

  if (wantMovie) {
    const m = await tmdb<{ results: Raw[] }>("/search/movie", { query });
    out.push(...m.results.map((r) => normalize(r, "movie")));
  }
  if (wantTv) {
    const t = await tmdb<{ results: Raw[] }>("/search/tv", { query });
    out.push(...t.results.map((r) => normalize(r, "tv")));
  }

  const seen = new Set<string>();
  return out
    .filter((x): x is RecommendedTitle => !!x && !!x.poster)
    .filter((x) => {
      const k = `${x.mediaType}-${x.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8);
}
