import type { Json } from "./types";
import { MAX_IMAGE_CHARS, keepVideoFile } from "./library-media.ts";

export async function fitImageDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image") || dataUrl.length <= MAX_IMAGE_CHARS) return dataUrl;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return dataUrl;
  const bytes = Buffer.from(dataUrl.slice(comma + 1), "base64");
  if (!bytes.length) return dataUrl;
  try {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");
    const img = await loadImage(bytes);
    let edge = 1280;
    let quality = 72;
    let out = dataUrl;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const scale = Math.min(1, edge / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = createCanvas(w, h);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const buf = canvas.toBuffer("image/jpeg", quality);
      out = `data:image/jpeg;base64,${buf.toString("base64")}`;
      if (out.length <= MAX_IMAGE_CHARS) return out;
      edge = Math.round(edge * 0.72);
      quality = Math.max(42, quality - 10);
    }
    if (out.length > MAX_IMAGE_CHARS) throw new Error("imagem grande");
    return out;
  } catch (err) {
    if (dataUrl.length <= MAX_IMAGE_CHARS) return dataUrl;
    throw err instanceof Error ? err : new Error("imagem grande");
  }
}

async function shrinkField(value: string): Promise<string> {
  if (!value.startsWith("data:image") || value.length <= MAX_IMAGE_CHARS) return value;
  try {
    return await fitImageDataUrl(value);
  } catch {
    return value;
  }
}

export async function shapeLibraryRecord(
  kind: string,
  payload: { [key: string]: Json },
): Promise<{
  live: { [key: string]: Json };
  body: string;
  imageUrl: string | null;
  mime: string;
}> {
  const live: { [key: string]: Json } = { ...payload };
  if (typeof live.photo === "string") live.photo = await shrinkField(live.photo);
  if (typeof live.shot === "string") live.shot = await shrinkField(live.shot);
  let imageUrl: string | null = null;
  let mime = "application/json";
  if (kind === "image" && typeof live.url === "string" && live.url) {
    const fitted = live.url.startsWith("data:image") ? await shrinkField(live.url) : live.url;
    live.url = fitted;
    imageUrl = fitted;
    mime = fitted.startsWith("data:image/jpeg") ? "image/jpeg" : "image/png";
  }
  if (kind === "video") {
    const remote = typeof live.url === "string" ? live.url : "";
    const kept = remote.startsWith("https://") ? await keepVideoFile(remote) : null;
    if (kept) {
      imageUrl = kept;
      live.stored = true;
    } else if (remote) {
      imageUrl = remote;
      live.stored = false;
    }
    mime = "video/mp4";
  }
  const storedBody: { [key: string]: Json } = { ...live };
  if (typeof storedBody.url === "string" && storedBody.url.startsWith("data:")) {
    storedBody.url = "";
    storedBody.stored = true;
  }
  if (typeof storedBody.photo === "string" && storedBody.photo.length > MAX_IMAGE_CHARS) storedBody.photo = "";
  if (typeof storedBody.shot === "string" && storedBody.shot.length > MAX_IMAGE_CHARS) storedBody.shot = "";
  return { live, body: JSON.stringify(storedBody), imageUrl, mime };
}
