import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mongo-diag")({
  server: {
    handlers: {
      GET: async () => {
        const url = (process.env["MONGO_API_URL"] || "").replace(/\/$/, "");
        const key = process.env["MONGO_API_KEY"] || "";
        const out: Record<string, unknown> = {
          host: url ? new URL(url).host : null,
          hasKey: Boolean(key),
        };
        for (const path of ["/health", "/v1/favorites/find"]) {
          try {
            const res = await fetch(url + path, {
              method: path === "/health" ? "GET" : "POST",
              headers: { "content-type": "application/json", "x-api-key": key },
              ...(path === "/health" ? {} : { body: JSON.stringify({ filter: {} }) }),
            });
            out[path] = { status: res.status, body: (await res.text()).slice(0, 300) };
          } catch (e) {
            out[path] = { error: String(e) };
          }
        }
        return new Response(JSON.stringify(out, null, 2), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
