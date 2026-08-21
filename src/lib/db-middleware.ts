import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createMongoDb } from "@/lib/mongo-db";

/**
 * Authentication stays with the existing login provider; all application data
 * lives in MongoDB. This middleware verifies the caller and hands handlers a
 * `db` client alongside `userId`.
 */
export const requireAuthDb = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next }) => next({ context: { db: createMongoDb() } }));
