/**
 * EduFlix MongoDB HTTP API
 *
 * A tiny trusted-server data gateway. The Lovable app (running on Cloudflare
 * Workers, where the native Mongo driver cannot open TCP sockets) calls this
 * over HTTPS with a shared secret. All authorization happens in the app's
 * server functions; this service only checks the API key.
 *
 * Env:
 *   MONGODB_URI   - Atlas connection string
 *   MONGODB_DB    - database name (default: eduflix)
 *   MONGO_API_KEY - shared secret required in the x-api-key header
 *   PORT          - listen port (default: 8787)
 */
import express from "express";
import { MongoClient } from "mongodb";

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "eduflix";
const API_KEY = process.env.MONGO_API_KEY;
const PORT = Number(process.env.PORT || 8787);

if (!URI) throw new Error("MONGODB_URI is required");
if (!API_KEY) throw new Error("MONGO_API_KEY is required");

const ALLOWED_COLLECTIONS = new Set([
  "profiles",
  "user_roles",
  "classes",
  "class_members",
  "class_invites",
  "assignments",
  "assignment_progress",
  "favorites",
  "assistant_threads",
  "assistant_messages",
]);

const client = new MongoClient(URI, { maxPoolSize: 10 });
const ready = client.connect().then(async () => {
  const db = client.db(DB_NAME);
  await Promise.all([
    db.collection("profiles").createIndex({ id: 1 }, { unique: true }),
    db.collection("user_roles").createIndex({ user_id: 1, role: 1 }, { unique: true }),
    db.collection("classes").createIndex({ id: 1 }, { unique: true }),
    db.collection("classes").createIndex({ teacher_id: 1 }),
    db.collection("class_members").createIndex({ class_id: 1, student_id: 1 }, { unique: true }),
    db.collection("class_invites").createIndex({ class_id: 1, email: 1 }, { unique: true }),
    db.collection("assignments").createIndex({ class_id: 1 }),
    db
      .collection("assignment_progress")
      .createIndex({ assignment_id: 1, student_id: 1 }, { unique: true }),
    db.collection("favorites").createIndex({ user_id: 1, media_type: 1, tmdb_id: 1 }, { unique: true }),
    db.collection("assistant_threads").createIndex({ user_id: 1 }),
    db.collection("assistant_messages").createIndex({ thread_id: 1 }),
  ]);
  console.log(`[mongo-api] connected to ${DB_NAME}`);
  return db;
});

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/v1", (req, res, next) => {
  const key = req.header("x-api-key");
  if (!key || key !== API_KEY) return res.status(401).json({ error: "unauthorized" });
  next();
});

function collectionOf(db, name) {
  if (!ALLOWED_COLLECTIONS.has(name)) throw new Error(`unknown collection: ${name}`);
  return db.collection(name);
}

const handler = (fn) => async (req, res) => {
  try {
    const db = await ready;
    const col = collectionOf(db, req.params.collection);
    res.json(await fn(col, req.body || {}));
  } catch (err) {
    console.error("[mongo-api]", err);
    res.status(400).json({ error: String(err?.message || err) });
  }
};

const clean = (docs) =>
  docs.map((d) => {
    const { _id, ...rest } = d;
    return rest;
  });

app.post(
  "/v1/:collection/find",
  handler(async (col, { filter = {}, projection, sort, limit }) => {
    let cursor = col.find(filter, projection ? { projection } : undefined);
    if (sort) cursor = cursor.sort(sort);
    if (limit) cursor = cursor.limit(limit);
    return { data: clean(await cursor.toArray()) };
  }),
);

app.post(
  "/v1/:collection/count",
  handler(async (col, { filter = {} }) => ({ count: await col.countDocuments(filter) })),
);

app.post(
  "/v1/:collection/insert",
  handler(async (col, { docs = [] }) => {
    if (docs.length === 0) return { data: [] };
    await col.insertMany(docs.map((d) => ({ ...d })), { ordered: true });
    return { data: clean(docs) };
  }),
);

app.post(
  "/v1/:collection/update",
  handler(async (col, { filter = {}, set = {}, many = true }) => {
    const op = { $set: set };
    const r = many ? await col.updateMany(filter, op) : await col.updateOne(filter, op);
    return { matched: r.matchedCount, modified: r.modifiedCount };
  }),
);

app.post(
  "/v1/:collection/upsert",
  handler(async (col, { filter = {}, set = {}, setOnInsert = {} }) => {
    const op = { $set: set };
    if (Object.keys(setOnInsert).length > 0) op.$setOnInsert = setOnInsert;
    const r = await col.updateOne(filter, op, { upsert: true });
    return { upsertedId: r.upsertedId ?? null, matched: r.matchedCount };
  }),
);

app.post(
  "/v1/:collection/delete",
  handler(async (col, { filter = {}, many = true }) => {
    const r = many ? await col.deleteMany(filter) : await col.deleteOne(filter);
    return { deleted: r.deletedCount };
  }),
);

app.listen(PORT, () => console.log(`[mongo-api] listening on :${PORT}`));
