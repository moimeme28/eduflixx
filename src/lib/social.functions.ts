import { createServerFn } from "@tanstack/react-start";
import { requireAuthDb } from "@/lib/db-middleware";
import { createMongoDb } from "@/lib/mongo-db";

export interface EduList {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  subject: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
}

export interface ListItem {
  id: string;
  listId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  poster: string | null;
  year: string | null;
  rating: number | null;
  note: string | null;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  displayName: string | null;
  email: string | null;
}

export interface ListWithOwner extends EduList {
  owner: PublicProfile;
}

function mapList(row: Record<string, any>): EduList {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? null,
    subject: row.subject ?? null,
    isPublic: row.is_public ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: row.item_count ?? 0,
  };
}

function mapItem(row: Record<string, any>): ListItem {
  return {
    id: row.id,
    listId: row.list_id,
    tmdbId: row.tmdb_id,
    mediaType: row.media_type as "movie" | "tv",
    title: row.title,
    poster: row.poster ?? null,
    year: row.year ?? null,
    rating: row.rating ?? null,
    note: row.note ?? null,
    createdAt: row.created_at,
  };
}

async function fetchOwners(
  db: ReturnType<typeof createMongoDb>,
  userIds: string[],
): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>();
  if (userIds.length === 0) return map;
  const { data, error } = await db
    .from("profiles")
    .select("id, display_name, email")
    .in("id", userIds);
  if (error) throw new Error(error.message);
  for (const p of data ?? []) {
    map.set(p.id, {
      id: p.id,
      displayName: p.display_name ?? null,
      email: p.email ?? null,
    });
  }
  return map;
}

async function attachItemCounts(
  db: ReturnType<typeof createMongoDb>,
  lists: EduList[],
): Promise<EduList[]> {
  if (lists.length === 0) return lists;
  const ids = lists.map((l) => l.id);
  const { data, error } = await db
    .from("list_items")
    .select("list_id")
    .in("list_id", ids);
  if (error) throw new Error(error.message);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.list_id, (counts.get(row.list_id) ?? 0) + 1);
  }
  return lists.map((l) => ({ ...l, itemCount: counts.get(l.id) ?? 0 }));
}

// --- authenticated list management ---

export const createList = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator(
    (input: {
      name: string;
      description?: string;
      subject?: string;
      isPublic?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<EduList> => {
    const { data: row, error } = await context.db
      .from("lists")
      .insert({
        user_id: context.userId,
        name: data.name.trim(),
        description: data.description?.trim() ?? null,
        subject: data.subject?.trim() ?? null,
        is_public: data.isPublic ?? true,
      })
      .select("id, user_id, name, description, subject, is_public, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return mapList(row);
  });

export const updateList = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator(
    (input: {
      listId: string;
      name?: string;
      description?: string;
      subject?: string;
      isPublic?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<EduList> => {
    const { data: existing } = await context.db
      .from("lists")
      .select("id")
      .eq("id", data.listId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!existing) throw new Error("List not found or not owned by you");

    const set: Record<string, any> = {};
    if (data.name !== undefined) set.name = data.name.trim();
    if (data.description !== undefined) set.description = data.description?.trim() ?? null;
    if (data.subject !== undefined) set.subject = data.subject?.trim() ?? null;
    if (data.isPublic !== undefined) set.is_public = data.isPublic;

    const { error } = await context.db.from("lists").update(set).eq("id", data.listId);
    if (error) throw new Error(error.message);

    const { data: row, error: readErr } = await context.db
      .from("lists")
      .select("id, user_id, name, description, subject, is_public, created_at, updated_at")
      .eq("id", data.listId)
      .single();
    if (readErr) throw new Error(readErr.message);
    return mapList(row);
  });

export const deleteList = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator((input: { listId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.db
      .from("lists")
      .select("id")
      .eq("id", data.listId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!existing) throw new Error("List not found or not owned by you");

    await context.db.from("list_items").delete().eq("list_id", data.listId);
    const { error } = await context.db.from("lists").delete().eq("id", data.listId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyLists = createServerFn({ method: "GET" })
  .middleware([requireAuthDb])
  .handler(async ({ context }): Promise<EduList[]> => {
    const { data, error } = await context.db
      .from("lists")
      .select("id, user_id, name, description, subject, is_public, created_at, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const lists = (data ?? []).map(mapList);
    return attachItemCounts(context.db, lists);
  });

export const getMyListDetail = createServerFn({ method: "GET" })
  .middleware([requireAuthDb])
  .inputValidator((input: { listId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.db
      .from("lists")
      .select("id, user_id, name, description, subject, is_public, created_at, updated_at")
      .eq("id", data.listId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("List not found");

    const { data: items, error: itemsErr } = await context.db
      .from("list_items")
      .select("id, list_id, tmdb_id, media_type, title, poster, year, rating, note, created_at")
      .eq("list_id", data.listId)
      .order("created_at", { ascending: false });
    if (itemsErr) throw new Error(itemsErr.message);

    return {
      list: mapList(row),
      items: (items ?? []).map(mapItem),
      isOwner: true,
    };
  });

// --- list items ---

export const addListItem = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator(
    (input: {
      listId: string;
      tmdbId: number;
      mediaType: "movie" | "tv";
      title: string;
      poster?: string | null;
      year?: string | null;
      rating?: number | null;
      note?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { data: list } = await context.db
      .from("lists")
      .select("id, user_id")
      .eq("id", data.listId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!list) throw new Error("List not found or not owned by you");

    const { error } = await context.db.from("list_items").upsert(
      {
        list_id: data.listId,
        tmdb_id: data.tmdbId,
        media_type: data.mediaType,
        title: data.title,
        poster: data.poster ?? null,
        year: data.year ?? null,
        rating: data.rating ?? null,
        note: data.note?.trim() ?? null,
      },
      { onConflict: "list_id,tmdb_id,media_type" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeListItem = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator((input: { listId: string; itemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: list } = await context.db
      .from("lists")
      .select("id")
      .eq("id", data.listId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!list) throw new Error("List not found or not owned by you");

    const { error } = await context.db.from("list_items").delete().eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyFollowing = createServerFn({ method: "GET" })
  .middleware([requireAuthDb])
  .handler(async ({ context }): Promise<string[]> => {
    const { data, error } = await context.db
      .from("follows")
      .select("following_id")
      .eq("follower_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.following_id as string);
  });


// --- public discovery ---

export const listPublicLists = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { subject?: string; limit?: number; following?: string[] } = {}) => input,
  )
  .handler(async ({ data }): Promise<ListWithOwner[]> => {
    const db = createMongoDb();
    let query = db
      .from("lists")
      .select("id, user_id, name, description, subject, is_public, created_at, updated_at")
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (data.subject) query = query.eq("subject", data.subject);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    let lists = (rows ?? []).map(mapList);

    if (data.following && data.following.length > 0) {
      lists = lists.filter((l) => data.following!.includes(l.userId));
    }

    lists = await attachItemCounts(db, lists);
    const owners = await fetchOwners(
      db,
      lists.map((l) => l.userId),
    );
    return lists.map((l) => ({ ...l, owner: owners.get(l.userId) ?? { id: l.userId, displayName: null, email: null } }));
  });

export const getPublicListDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { listId: string }) => input)
  .handler(async ({ data }) => {
    const db = createMongoDb();
    const { data: row, error } = await db
      .from("lists")
      .select("id, user_id, name, description, subject, is_public, created_at, updated_at")
      .eq("id", data.listId)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("List not found");

    const { data: items, error: itemsErr } = await db
      .from("list_items")
      .select("id, list_id, tmdb_id, media_type, title, poster, year, rating, note, created_at")
      .eq("list_id", data.listId)
      .order("created_at", { ascending: false });
    if (itemsErr) throw new Error(itemsErr.message);

    const owners = await fetchOwners(db, [row.user_id]);
    return {
      list: mapList(row),
      items: (items ?? []).map(mapItem),
      owner: owners.get(row.user_id) ?? { id: row.user_id, displayName: null, email: null },
    };
  });

// --- follows ---

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }): Promise<{ following: boolean }> => {
    if (data.userId === context.userId) throw new Error("You cannot follow yourself");

    const { data: existing } = await context.db
      .from("follows")
      .select("id")
      .eq("follower_id", context.userId)
      .eq("following_id", data.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await context.db
        .from("follows")
        .delete()
        .eq("follower_id", context.userId)
        .eq("following_id", data.userId);
      if (error) throw new Error(error.message);
      return { following: false };
    }

    const { error } = await context.db.from("follows").insert({
      follower_id: context.userId,
      following_id: data.userId,
    });
    if (error) throw new Error(error.message);
    return { following: true };
  });

export const getFollowCounts = createServerFn({ method: "GET" })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }): Promise<{ followers: number; following: number }> => {
    const db = createMongoDb();
    const [followersRes, followingRes] = await Promise.all([
      db.count("follows", { following_id: data.userId }),
      db.count("follows", { follower_id: data.userId }),
    ]);
    return { followers: followersRes, following: followingRes };
  });

export const getMyFollowStatus = createServerFn({ method: "GET" })
  .middleware([requireAuthDb])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }): Promise<{ following: boolean }> => {
    const { data: row } = await context.db
      .from("follows")
      .select("id")
      .eq("follower_id", context.userId)
      .eq("following_id", data.userId)
      .maybeSingle();
    return { following: !!row };
  });

export const getUserProfile = createServerFn({ method: "GET" })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }) => {
    const db = createMongoDb();
    const { data: profile, error } = await db
      .from("profiles")
      .select("id, display_name, email")
      .eq("id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("User not found");

    const { data: lists, error: listsErr } = await db
      .from("lists")
      .select("id, user_id, name, description, subject, is_public, created_at, updated_at")
      .eq("user_id", data.userId)
      .eq("is_public", true)
      .order("updated_at", { ascending: false });
    if (listsErr) throw new Error(listsErr.message);

    const mappedLists = await attachItemCounts(db, (lists ?? []).map(mapList));
    const counts = await getFollowCounts({ data: { userId: data.userId } });

    return {
      profile: { id: profile.id, displayName: profile.display_name ?? null, email: profile.email ?? null },
      lists: mappedLists,
      counts,
    };
  });
