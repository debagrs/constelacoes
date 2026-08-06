import { createFileRoute } from "@tanstack/react-router";
import { aiHealthCheck } from "@/lib/ai/functions/healthcheck.functions";

export const Route = createFileRoute("/api/ai/health")({
  server: {
    handlers: {
      GET: async () => {
        const result = await aiHealthCheck();
        return Response.json(result, { status: result.ok ? 200 : 503 });
      },
    },
  },
});
