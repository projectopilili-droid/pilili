import type { Json } from "./types";

export const MAX_IMAGE_CHARS = 160_000;
export const LIST_IMAGE_CHARS = MAX_IMAGE_CHARS + 20_000;
const MAX_VIDEO_BYTES = 8_000_000;

export const LIBRARY_MISS =
  "Não consegui guardar este resultado na Biblioteca. O resultado foi entregue, mas pode não aparecer na conta quando entrares outra vez.";

export function visibleImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("data:video")) return null;
  if (url.startsWith("data:") && url.length > LIST_IMAGE_CHARS) return null;
  return url;
}

export function slimArtifact<T extends { payload: { [key: string]: Json } }>(art: T): T {
  const payload = { ...art.payload };
  let changed = false;
  const url = payload.url;
  if (typeof url === "string" && url.startsWith("data:") && url.length > 400) {
    payload.url = "";
    changed = true;
  }
  for (const key of ["photo", "shot"] as const) {
    const value = payload[key];
    if (typeof value === "string" && value.startsWith("data:") && value.length > MAX_IMAGE_CHARS) {
      payload[key] = "";
      changed = true;
    }
  }
  if (!changed) return art;
  payload.stored = true;
  return { ...art, payload } as T;
}

function xaiHost(host: string): boolean {
  return host === "vidgen.x.ai" || host.endsWith(".x.ai");
}

export async function keepVideoFile(url: string): Promise<string | null> {
  if (!url.startsWith("https://")) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!xaiHost(parsed.hostname)) return null;
  try {
    const res = await fetch(parsed.toString(), { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const finalHost = new URL(res.url).hostname;
    if (!xaiHost(finalHost)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 32 || buf.byteLength > MAX_VIDEO_BYTES) return null;
    if (buf.subarray(4, 8).toString("ascii") !== "ftyp") return null;
    return `data:video/mp4;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function bodyMedia(body: string | null): string | null {
  if (!body) return null;
  const trimmed = body.trim();
  if (trimmed.startsWith("data:image") || trimmed.startsWith("data:video")) return trimmed;
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as { url?: unknown; photo?: unknown };
    if (typeof parsed.url === "string" && (parsed.url.startsWith("data:") || parsed.url.startsWith("https://"))) {
      return parsed.url;
    }
    if (typeof parsed.photo === "string" && parsed.photo.startsWith("data:image")) return parsed.photo;
  } catch {
    return null;
  }
  return null;
}

export function mediaFromStored(imageUrl: string | null | undefined, body: string | null | undefined): string | null {
  const fromBody = bodyMedia(body ?? null);
  if (imageUrl?.startsWith("data:")) return imageUrl;
  if (fromBody?.startsWith("data:")) return fromBody;
  if (imageUrl) return imageUrl;
  return fromBody;
}
