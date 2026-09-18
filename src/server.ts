import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function isGooglePhotosHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "photos.app.goo.gl" || host === "photos.google.com" || host.endsWith(".googleusercontent.com");
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractGooglePhotosImageUrls(html: string): string[] {
  const candidates: string[] = [];
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image(?::src)?)["'][^>]*>/gi,
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      if (match[1]) candidates.push(decodeHtmlAttribute(match[1]));
    }
  }

  const normalized = html.replace(/\\u003d/g, "=").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  for (const match of normalized.matchAll(/https:\/\/lh3\.googleusercontent\.com\/[^"'<>\s]+/g)) {
    candidates.push(decodeHtmlAttribute(match[0]));
  }
  return [...new Set(candidates)];
}

function dataUrlResponse(value: string): Response | null {
  const match = value.match(/^data:(image\/(?:png|jpe?g|webp|gif|avif));base64,(.+)$/is);
  if (!match) return null;
  try {
    const bytes = Buffer.from(match[2], "base64");
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": match[1],
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return null;
  }
}

async function fetchGooglePhoto(value: string): Promise<Response | null> {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (!isGooglePhotosHost(parsed.hostname)) return null;

  const first = await fetch(parsed, {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; AtlasPlanetario/1.0)",
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });
  const contentType = first.headers.get("content-type") ?? "";
  if (first.ok && contentType.toLowerCase().startsWith("image/")) {
    return new Response(first.body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
      },
    });
  }

  if (!first.ok || !contentType.toLowerCase().includes("text/html")) return null;
  const html = await first.text();
  const candidates = extractGooglePhotosImageUrls(html);
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (!isGooglePhotosHost(url.hostname)) continue;
      const imageResponse = await fetch(url, {
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; AtlasPlanetario/1.0)",
          accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });
      const imageType = imageResponse.headers.get("content-type") ?? "";
      if (imageResponse.ok && imageType.toLowerCase().startsWith("image/")) {
        return new Response(imageResponse.body, {
          status: 200,
          headers: {
            "content-type": imageType,
            "cache-control": "public, max-age=3600",
          },
        });
      }
    } catch {
      // tenta o próximo candidato
    }
  }
  return null;
}

async function mediaResponse(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/media") return null;

  const entityId = url.searchParams.get("entityId")?.trim() ?? "";
  const submissionId = url.searchParams.get("submissionId")?.trim() ?? "";
  const previewUrl = url.searchParams.get("url")?.trim() ?? "";
  let source = previewUrl;

  if (entityId) {
    const { queryOne } = await import("@/lib/turso/client.server");
    const row = await queryOne<{ image_url: string | null }>(
      "SELECT image_url FROM entities WHERE id=? AND status='published' LIMIT 1",
      [entityId],
    );
    source = row?.image_url?.trim() ?? "";
  } else if (submissionId) {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    await requireReviewer();
    const { queryOne } = await import("@/lib/turso/client.server");
    const row = await queryOne<{ image_url: string | null }>(
      "SELECT image_url FROM submissions WHERE id=? LIMIT 1",
      [submissionId],
    );
    source = row?.image_url?.trim() ?? "";
  }

  if (!source) return new Response("Imagem não encontrada.", { status: 404 });

  if (source.startsWith("data:image/")) {
    return dataUrlResponse(source) ?? new Response("Imagem inválida.", { status: 415 });
  }

  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    return new Response("URL de imagem inválida.", { status: 400 });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new Response("Protocolo de imagem inválido.", { status: 400 });
  }

  if (isGooglePhotosHost(parsed.hostname)) {
    try {
      const resolved = await fetchGooglePhoto(source);
      if (resolved) return resolved;
    } catch (error) {
      console.error("Falha ao resolver imagem do Google Photos", error);
    }
    return new Response("Não foi possível obter a imagem compartilhada do Google Photos.", { status: 404 });
  }

  return Response.redirect(source, 302);
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
      const media = await mediaResponse(request);
      if (media) return media;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      if (error instanceof Response) return error;
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
