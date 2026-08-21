/**
 * MongoDB data layer.
 *
 * The app runs on a Workers runtime that cannot open raw TCP sockets, so the
 * native Mongo driver lives in the companion service under `mongo-api/`.
 * This module speaks to that service over HTTPS and exposes a small
 * PostgREST-shaped query builder so call sites read the same as before.
 *
 * Server-only: every method reads MONGO_API_URL / MONGO_API_KEY from
 * process.env at call time. Never import this from browser code.
 */

export type Row = Record<string, any>;
export interface Result<T = Row[]> {
  data: T;
  error: { message: string } | null;
}

type Filter = Record<string, any>;

function endpoint(): { url: string; key: string } {
  const url = process.env["MONGO_API_URL"];
  const key = process.env["MONGO_API_KEY"];
  if (!url || !key) {
    throw new Error(
      "MongoDB is not configured. Set MONGO_API_URL and MONGO_API_KEY (see mongo-api/README.md).",
    );
  }
  return { url: url.replace(/\/$/, ""), key };
}

async function call(collection: string, op: string, body: Row): Promise<any> {
  const { url, key } = endpoint();
  const res = await fetch(`${url}/v1/${collection}/${op}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Mongo API ${op} failed (${res.status})`);
  return json;
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function projectionFrom(select: string | undefined): Row | undefined {
  if (!select || select.trim() === "*" || select.includes("(")) return undefined;
  const projection: Row = { _id: 0 };
  for (const raw of select.split(",")) {
    const col = raw.trim().split(":").pop()!.trim();
    if (col) projection[col] = 1;
  }
  return projection;
}

class Query implements PromiseLike<Result<Row[]>> {
  private filter: Filter = {};
  private selectCols: string | undefined;
  private sort: Row | undefined;
  private limitN: number | undefined;
  private mode: "find" | "insert" | "upsert" | "update" | "delete" = "find";
  private payload: Row[] = [];
  private conflict: string[] = [];
  private singleMode: "none" | "single" | "maybe" = "none";

  constructor(private collection: string) {}

  select(cols?: string) {
    this.selectCols = cols;
    return this;
  }

  eq(col: string, value: unknown) {
    this.filter[col] = value;
    return this;
  }

  neq(col: string, value: unknown) {
    this.filter[col] = { $ne: value };
    return this;
  }

  in(col: string, values: unknown[]) {
    this.filter[col] = { $in: values };
    return this;
  }

  is(col: string, value: unknown) {
    this.filter[col] = value;
    return this;
  }

  ilike(col: string, pattern: string) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
    this.filter[col] = { $regex: `^${escaped}$`, $options: "i" };
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.sort = { [col]: opts?.ascending === false ? -1 : 1 };
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  insert(values: Row | Row[]) {
    this.mode = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }

  upsert(values: Row | Row[], opts?: { onConflict?: string }) {
    this.mode = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    this.conflict = (opts?.onConflict ?? "id").split(",").map((c) => c.trim());
    return this;
  }

  update(values: Row) {
    this.mode = "update";
    this.payload = [values];
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  single(): PromiseLike<Result<Row>> {
    this.singleMode = "single";
    return this as unknown as PromiseLike<Result<Row>>;
  }

  maybeSingle(): PromiseLike<Result<Row | null>> {
    this.singleMode = "maybe";
    return this as unknown as PromiseLike<Result<Row | null>>;
  }

  private async run(): Promise<Result<Row[]>> {
    switch (this.mode) {
      case "insert": {
        const docs = this.payload.map((d) => ({
          id: d["id"] ?? newId(),
          created_at: nowIso(),
          updated_at: nowIso(),
          ...d,
        }));
        const res = await call(this.collection, "insert", { docs });
        return { data: this.shape(res.data ?? docs), error: null };
      }
      case "upsert": {
        const out: Row[] = [];
        for (const doc of this.payload) {
          const filter: Filter = {};
          for (const key of this.conflict) filter[key] = doc[key];
          const set = { ...doc, updated_at: nowIso() };
          await call(this.collection, "upsert", {
            filter,
            set,
            setOnInsert: { id: doc["id"] ?? newId(), created_at: nowIso() },
          });
          out.push(doc);
        }
        return { data: this.shape(out), error: null };
      }
      case "update": {
        await call(this.collection, "update", {
          filter: this.filter,
          set: { ...this.payload[0], updated_at: nowIso() },
        });
        return { data: this.shape([]), error: null };
      }
      case "delete": {
        await call(this.collection, "delete", { filter: this.filter });
        return { data: this.shape([]), error: null };
      }
      default: {
        const res = await call(this.collection, "find", {
          filter: this.filter,
          projection: projectionFrom(this.selectCols),
          sort: this.sort,
          limit: this.limitN,
        });
        return { data: this.shape(res.data ?? []), error: null };
      }
    }
  }

  private shape(rows: Row[]): Row[] {
    if (this.singleMode === "none") return rows;
    return (rows[0] ?? null) as unknown as Row[];
  }

  then<TResult1 = Result<Row[]>, TResult2 = never>(
    onfulfilled?: ((value: Result<Row[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run()
      .then((value) => value)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        const data = (this.singleMode !== "none" ? null : []) as unknown as Row[];
        return { data, error: { message } };
      })
      .then(onfulfilled as never, onrejected as never);
  }
}

export interface MongoDb {
  from(collection: string): Query;
  rpc(name: string, args?: Row): Promise<Result<unknown>>;
  count(collection: string, filter?: Filter): Promise<number>;
}

export function createMongoDb(): MongoDb {
  return {
    from: (collection: string) => new Query(collection),
    count: async (collection, filter = {}) => {
      const res = await call(collection, "count", { filter });
      return res.count ?? 0;
    },
    rpc: async (name, _args) => {
      if (name === "admin_exists") {
        const res = await call("user_roles", "count", { filter: { role: "admin" } });
        return { data: (res.count ?? 0) > 0, error: null };
      }
      return { data: null, error: { message: `Unknown rpc: ${name}` } };
    },
  };
}
