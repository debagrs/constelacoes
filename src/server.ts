import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

const DATA_IMAGE_RE = /^data:(image\/(?:avif|gif|jpe?g|png|svg\+xml|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i;

function decodeBase64Image(value: string): { contentType: string; body: Uint8Array } | null {
  const match = value.match(DATA_IMAGE_RE);
  if (!match) return null;
  try {
    const binary = atob(match[2].replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return { contentType: match[1].toLowerCase(), body: bytes };
  } catch {
    return null;
  }
}

async function serveEntityMedia(request: Request): Promise<Response | null> {
  const requestUrl = new URL(request.url);
  if (requestUrl.pathname !== "/api/media") return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Método não permitido.", { status: 405, headers: { allow: "GET, HEAD" } });
  }

  const entityId = requestUrl.searchParams.get("entityId")?.trim();
  if (!entityId) return new Response("Imagem não informada.", { status: 400 });

  const { queryOne } = await import("./lib/turso/client.server");
  const row = await queryOne<{ image_url: string | null }>(
    "SELECT image_url FROM entities WHERE id=? AND status='published' LIMIT 1",
    [entityId],
  );
  const imageUrl = row?.image_url?.trim() ?? "";
  if (!imageUrl) return new Response("Imagem não encontrada.", { status: 404 });

  const inline = decodeBase64Image(imageUrl);
  if (inline) {
    const headers = {
      "content-type": inline.contentType,
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      "x-content-type-options": "nosniff",
    };
    return new Response(request.method === "HEAD" ? null : inline.body, { status: 200, headers });
  }

  if (/^https?:\/\//i.test(imageUrl)) return Response.redirect(imageUrl, 302);
  return new Response("Formato de imagem não suportado.", { status: 415 });
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const mediaResponse = await serveEntityMedia(request);
      if (mediaResponse) return mediaResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
