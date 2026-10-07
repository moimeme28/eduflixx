import { createFileRoute } from "@tanstack/react-router";

/**
 * Keep-alive endpoint for Render free-tier.
 *
 * Pings the MongoDB gateway's /health endpoint to prevent it from
 * spinning down after 15 minutes of inactivity. Call this from a
 * free uptime monitor (UptimeRobot, cron-job.org) every 10 minutes.
 *
 * GET /api/public/keep-alive
 * → 200 if the gateway responded within 60s (or was already up)
 * → 502 if the gateway didn't respond in time
 */
export const Route = createFileRoute("/api/public/keep-alive")({
  server: {
    handlers: {
      GET: async () => {
        const url = (process.env["MONGO_API_URL"] || "").replace(/\/$/, "");
        const key = process.env["MONGO_API_KEY"] || "";

        if (!url) {
          return new Response(
            JSON.stringify({ ok: false, error: "MONGO_API_URL not set" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }

        const healthUrl = `${url}/health`;
        const start = Date.now();

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 60_000);
          const res = await fetch(healthUrl, {
            headers: { "x-api-key": key },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          const body = await res.text();
          const elapsed = Date.now() - start;
          return new Response(
            JSON.stringify({
              ok: res.ok,
              gateway: url,
              status: res.status,
              body: body.slice(0, 200),
              elapsedMs: elapsed,
              timestamp: new Date().toISOString(),
            }),
            { status: res.ok ? 200 : 502, headers: { "content-type": "application/json" } },
          );
        } catch (err) {
          const elapsed = Date.now() - start;
          return new Response(
            JSON.stringify({
              ok: false,
              gateway: url,
              error: err instanceof Error ? err.message : String(err),
              elapsedMs: elapsed,
              timestamp: new Date().toISOString(),
            }),
            { status: 502, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
