// TMDB integration — all calls run server-side so the API key never reaches
// the browser. Read process.env.TMDB_API_KEY inside handlers (edge runtime).
import { createServerFn } from "@tanstack/react-start";

const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMG = "https://image.tmdb.org/t/p";

export interface TitleItem {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  year: string;
  rating: number;
}

export interface CastMember {
  name: string;
  character: string;
  profile: string | null;
}

export interface TitleDetails extends TitleItem {
  runtime: number | null;
  genres: string[];
  director: string | null;
  cast: CastMember[];
  trailerKey: string | null;
  similar: TitleItem[];
  tagline: string | null;
}

function img(path: string | null, size: string): string | null {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not configured");
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) {
    // An empty value means "drop this param" (e.g. remove the language filter).
    if (v === "") url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB request failed (${res.status})`);
  return (await res.json()) as T;
}

interface RawItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
}

function normalize(raw: RawItem, fallbackType?: "movie" | "tv"): TitleItem | null {
  const mediaType = (raw.media_type === "tv" || raw.media_type === "movie"
    ? raw.media_type
    : fallbackType) as "movie" | "tv" | undefined;
  if (!mediaType) return null;
  const title = raw.title || raw.name || "Untitled";
  const date = raw.release_date || raw.first_air_date || "";
  return {
    id: raw.id,
    mediaType,
    title,
    overview: raw.overview || "",
    poster: img(raw.poster_path ?? null, "w500"),
    backdrop: img(raw.backdrop_path ?? null, "w1280"),
    year: date ? date.slice(0, 4) : "",
    rating: raw.vote_average ? Math.round(raw.vote_average * 10) / 10 : 0,
  };
}

function keyOf(it: TitleItem): string {
  return `${it.mediaType}-${it.id}`;
}

// Collapse duplicates by media type + TMDB id, keeping the most complete
// record for each (a later copy may carry a backdrop/overview the first lacked).
function dedupe(items: (TitleItem | null)[]): TitleItem[] {
  const byKey = new Map<string, TitleItem>();
  const order: string[] = [];
  for (const it of items) {
    if (!it || !it.poster) continue;
    const k = keyOf(it);
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, it);
      order.push(k);
      continue;
    }
    byKey.set(k, {
      ...prev,
      overview: prev.overview || it.overview,
      backdrop: prev.backdrop ?? it.backdrop,
      poster: prev.poster ?? it.poster,
      year: prev.year || it.year,
      rating: prev.rating || it.rating,
    });
  }
  return order.map((k) => byKey.get(k)!);
}

// Deterministic relevance ordering: match score, then rating, then recency,
// then title/id so identical inputs always produce the identical sequence.
function byRelevance(scores?: Map<string, number>) {
  return (a: TitleItem, b: TitleItem): number => {
    if (scores) {
      const sa = scores.get(keyOf(a)) ?? 0;
      const sb = scores.get(keyOf(b)) ?? 0;
      if (sb !== sa) return sb - sa;
    }
    if (b.rating !== a.rating) return b.rating - a.rating;
    const ya = Number(a.year) || 0;
    const yb = Number(b.year) || 0;
    if (yb !== ya) return yb - ya;
    const t = a.title.localeCompare(b.title);
    if (t !== 0) return t;
    return a.id - b.id;
  };
}


// Trending educational documentaries (movies with the documentary genre).
export const getTrendingDocumentaries = createServerFn({ method: "GET" }).handler(
  async (): Promise<TitleItem[]> => {
    const data = await tmdb<{ results: RawItem[] }>("/discover/movie", {
      with_genres: "99",
      sort_by: "popularity.desc",
      "vote_count.gte": "50",
    });
    return dedupe(data.results.map((r) => normalize(r, "movie")));
  },
);

// Popular educational TV series (documentary genre).
export const getEducationalSeries = createServerFn({ method: "GET" }).handler(
  async (): Promise<TitleItem[]> => {
    const data = await tmdb<{ results: RawItem[] }>("/discover/tv", {
      with_genres: "99",
      sort_by: "popularity.desc",
      "vote_count.gte": "20",
    });
    return dedupe(data.results.map((r) => normalize(r, "tv")));
  },
);

// Recently added / newest documentaries.
export const getRecentlyAdded = createServerFn({ method: "GET" }).handler(
  async (): Promise<TitleItem[]> => {
    const data = await tmdb<{ results: RawItem[] }>("/discover/movie", {
      with_genres: "99",
      sort_by: "primary_release_date.desc",
      "vote_count.gte": "10",
      "primary_release_date.lte": new Date().toISOString().slice(0, 10),
    });
    return dedupe(data.results.map((r) => normalize(r, "movie")));
  },
);

// Educational titles for a subject/topic query, optionally filtered.
// Strategy: resolve query terms to TMDB keyword IDs and use /discover with
// with_keywords (OR-joined), which yields far more relevant titles than
// literal /search matches. Also blend documentaries + direct searches.
export const getEducationalByQuery = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string; format?: string }) => input)
  .handler(async ({ data }): Promise<TitleItem[]> => {
    const { query, format } = data;

    const wantMovie = !format || ["Movie", "Documentary", "Biography", "Based on Real Events"].includes(format);
    const wantTv = !format || ["TV Series", "Mini Series"].includes(format);
    const wantDoc = !format || ["Documentary", "TV Series", "Mini Series"].includes(format);

    const STOP = new Set(["the", "and", "for", "with", "from", "into", "your", "you", "are", "was", "were"]);
    const terms = Array.from(
      new Set(
        query
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2 && !STOP.has(w)),
      ),
    );
    const scores = new Map<string, number>();
    const results: (TitleItem | null)[] = [];
    const push = (item: TitleItem | null, weight = 1) => {
      if (!item) return;
      const k = `${item.mediaType}-${item.id}`;
      scores.set(k, (scores.get(k) ?? 0) + weight);
      results.push(item);
    };

    const keywordIds: number[] = [];
    await Promise.all(
      terms.map(async (term) => {
        try {
          const res = await tmdb<{ results: { id: number; name: string }[] }>(
            "/search/keyword",
            { query: term },
          );
          for (const k of res.results.slice(0, 3)) keywordIds.push(k.id);
        } catch {
          /* ignore */
        }
      }),
    );
    const kwParam = Array.from(new Set(keywordIds)).slice(0, 20).join("|");

    const calls: Promise<void>[] = [];
    const pages = ["1", "2"];

    if (kwParam) {
      const baseParams: Record<string, string> = {
        with_keywords: kwParam,
        sort_by: "popularity.desc",
        "vote_count.gte": "5",
      };
      if (format === "Documentary") baseParams.with_genres = "99";
      for (const page of pages) {
        if (wantMovie) {
          calls.push(
            tmdb<{ results: RawItem[] }>("/discover/movie", { ...baseParams, page })
              .then((r) => r.results.forEach((raw) => push(normalize(raw, "movie"), 3)))
              .catch(() => {}),
          );
        }
        if (wantTv) {
          calls.push(
            tmdb<{ results: RawItem[] }>("/discover/tv", { ...baseParams, page })
              .then((r) => r.results.forEach((raw) => push(normalize(raw, "tv"), 3)))
              .catch(() => {}),
          );
        }
      }
    }

    if (wantDoc) {
      const docParams: Record<string, string> = {
        with_genres: "99",
        sort_by: "popularity.desc",
        "vote_count.gte": "3",
      };
      if (kwParam) docParams.with_keywords = kwParam;
      for (const page of pages) {
        if (wantMovie) {
          calls.push(
            tmdb<{ results: RawItem[] }>("/discover/movie", { ...docParams, page })
              .then((r) => r.results.forEach((raw) => push(normalize(raw, "movie"), 2)))
              .catch(() => {}),
          );
        }
        if (wantTv) {
          calls.push(
            tmdb<{ results: RawItem[] }>("/discover/tv", { ...docParams, page, "vote_count.gte": "1" })
              .then((r) => r.results.forEach((raw) => push(normalize(raw, "tv"), 2)))
              .catch(() => {}),
          );
        }
      }
    }

    for (const q of Array.from(new Set([query, ...terms]))) {
      for (const page of pages) {
        if (wantMovie) {
          calls.push(
            tmdb<{ results: RawItem[] }>("/search/movie", { query: q, page })
              .then((r) => r.results.forEach((raw) => push(normalize(raw, "movie"), 1)))
              .catch(() => {}),
          );
        }
        if (wantTv) {
          calls.push(
            tmdb<{ results: RawItem[] }>("/search/tv", { query: q, page })
              .then((r) => r.results.forEach((raw) => push(normalize(raw, "tv"), 1)))
              .catch(() => {}),
          );
        }
      }
    }

    await Promise.all(calls);

    let out = dedupe(results).sort(byRelevance(scores));


    if (out.length < 18) {
      const fill: (TitleItem | null)[] = [];
      try {
        const [m1, m2, t1, t2] = await Promise.all([
          wantMovie
            ? tmdb<{ results: RawItem[] }>("/discover/movie", {
                with_genres: "99",
                sort_by: "popularity.desc",
                "vote_count.gte": "20",
                page: "1",
              })
            : Promise.resolve({ results: [] as RawItem[] }),
          wantMovie
            ? tmdb<{ results: RawItem[] }>("/discover/movie", {
                with_genres: "99",
                sort_by: "vote_average.desc",
                "vote_count.gte": "100",
                page: "1",
              })
            : Promise.resolve({ results: [] as RawItem[] }),
          wantTv
            ? tmdb<{ results: RawItem[] }>("/discover/tv", {
                with_genres: "99",
                sort_by: "popularity.desc",
                "vote_count.gte": "10",
                page: "1",
              })
            : Promise.resolve({ results: [] as RawItem[] }),
          wantTv
            ? tmdb<{ results: RawItem[] }>("/discover/tv", {
                with_genres: "99",
                sort_by: "popularity.desc",
                "vote_count.gte": "10",
                page: "2",
              })
            : Promise.resolve({ results: [] as RawItem[] }),
        ]);
        m1.results.forEach((r) => fill.push(normalize(r, "movie")));
        m2.results.forEach((r) => fill.push(normalize(r, "movie")));
        t1.results.forEach((r) => fill.push(normalize(r, "tv")));
        t2.results.forEach((r) => fill.push(normalize(r, "tv")));
      } catch {
        /* ignore */
      }
      // Filler never outranks a scored match: sort it on its own, then append
      // only the titles not already present.
      const present = new Set(out.map(keyOf));
      const extras = dedupe(fill)
        .filter((it) => !present.has(keyOf(it)))
        .sort(byRelevance());
      out = [...out, ...extras];
    }

    return out;
  });

// Global search across movies and TV.
export const searchTitles = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string }) => input)
  .handler(async ({ data }): Promise<TitleItem[]> => {
    if (!data.query.trim()) return [];
    const res = await tmdb<{ results: RawItem[] }>("/search/multi", { query: data.query });
    return dedupe(res.results.map((r) => normalize(r)));

  });

interface RawDetails extends RawItem {
  runtime?: number;
  episode_run_time?: number[];
  tagline?: string;
  genres?: { name: string }[];
  credits?: {
    cast?: { name: string; character?: string; profile_path?: string | null }[];
    crew?: { name: string; job?: string }[];
  };
  videos?: { results?: { key: string; type: string; site: string }[] };
  similar?: { results?: RawItem[] };
}

interface RawVideo {
  key: string;
  type: string;
  site: string;
  name?: string;
  official?: boolean;
  size?: number;
  published_at?: string;
  iso_639_1?: string;
}

// Rank YouTube videos so we surface a real trailer when one exists, falling
// back through teasers/clips instead of returning nothing.
const VIDEO_TYPE_SCORE: Record<string, number> = {
  Trailer: 100,
  Teaser: 80,
  Clip: 40,
  Featurette: 30,
  "Opening Credits": 10,
  "Behind the Scenes": 5,
};

function pickTrailer(videos: RawVideo[]): string | null {
  const scored = videos
    .filter((v) => v.site === "YouTube" && v.key)
    .map((v) => {
      let score = VIDEO_TYPE_SCORE[v.type] ?? 1;
      if (v.official) score += 25;
      if (v.iso_639_1 === "en") score += 10;
      if ((v.size ?? 0) >= 1080) score += 5;
      if (/official trailer/i.test(v.name ?? "")) score += 15;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.v.key ?? null;
}

// Full details for a movie or series (cast, trailer, similar, etc).
export const getTitleDetails = createServerFn({ method: "GET" })
  .inputValidator((input: { mediaType: "movie" | "tv"; id: number }) => input)
  .handler(async ({ data }): Promise<TitleDetails> => {
    const { mediaType, id } = data;
    const raw = await tmdb<RawDetails>(`/${mediaType}/${id}`, {
      append_to_response: "credits,videos,similar",
      // Include language-less and English videos; the default en-US filter
      // hides most trailers on non-US titles.
      include_video_language: "en,null",
    });
    const base = normalize(raw, mediaType)!;
    let videos = (raw.videos?.results ?? []) as RawVideo[];
    let trailerKey = pickTrailer(videos);

    // Fallback 1: unfiltered videos endpoint (any language).
    if (!trailerKey) {
      try {
        const all = await tmdb<{ results?: RawVideo[] }>(`/${mediaType}/${id}/videos`, {
          language: "",
          include_video_language: "en,null,en-US",
        });
        videos = all.results ?? [];
        trailerKey = pickTrailer(videos);
      } catch {
        /* ignore */
      }
    }

    // Fallback 2: for series, a trailer often only exists on season 1.
    if (!trailerKey && mediaType === "tv") {
      try {
        const s1 = await tmdb<{ results?: RawVideo[] }>(`/tv/${id}/season/1/videos`, {
          language: "",
        });
        trailerKey = pickTrailer(s1.results ?? []);
      } catch {
        /* ignore */
      }
    }
    const trailer = trailerKey ? { key: trailerKey } : undefined;
    const director = raw.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
    return {
      ...base,
      runtime: raw.runtime ?? raw.episode_run_time?.[0] ?? null,
      tagline: raw.tagline || null,
      genres: raw.genres?.map((g) => g.name) ?? [],
      director,
      cast:
        raw.credits?.cast?.slice(0, 10).map((c) => ({
          name: c.name,
          character: c.character || "",
          profile: img(c.profile_path ?? null, "w185"),
        })) ?? [],
      trailerKey: trailer?.key ?? null,
      similar: dedupe((raw.similar?.results ?? []).map((r) => normalize(r, mediaType))).slice(0, 12),
    };
  });
