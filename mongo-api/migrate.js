/**
 * One-shot migration: Postgres -> MongoDB.
 *
 * POSTGRES_URL="postgres://..." MONGODB_URI="mongodb+srv://..." node migrate.js
 */
import pg from "pg";
import { MongoClient } from "mongodb";

const TABLES = [
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
];

const iso = (v) => (v instanceof Date ? v.toISOString() : v);

const main = async () => {
  const pgClient = new pg.Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });
  await pgClient.connect();

  const mongo = new MongoClient(process.env.MONGODB_URI);
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DB || "eduflix");

  for (const table of TABLES) {
    let rows;
    try {
      ({ rows } = await pgClient.query(`select * from public.${table}`));
    } catch (err) {
      console.warn(`skip ${table}: ${err.message}`);
      continue;
    }
    if (rows.length === 0) {
      console.log(`${table}: 0 rows`);
      continue;
    }
    const docs = rows.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, iso(v)])),
    );
    await db.collection(table).deleteMany({});
    await db.collection(table).insertMany(docs);
    console.log(`${table}: ${docs.length} rows migrated`);
  }

  await pgClient.end();
  await mongo.close();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
