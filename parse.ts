import { uid } from "@/lib/utils";
import { dedupeTextAgainstArtifacts, withoutLongDash, withoutLongDashValue } from "./format-answer";
import type { Artifact, ArtifactType, Json, PowerId } from "./types";
import { POWER_IDS } from "./types";
import { ensureWebsitePayload } from "./website";

export type ParsedPilili = {
  text: string;
  meta: {
    power: PowerId | "geral";
    title: string;
    needs_search: boolean;
    needs_image: boolean;
    needs_video: boolean;
    needs_edit: boolean;
  } | null;
  artifacts: Artifact[];
  images: { prompt: string; alt: string; edit?: boolean }[];
  videos: { prompt: string; duration: number }[];
  next: string | null;
  memory: { key: string; value: string; kind: string }[];
};

function strip(s: string) {
  return s.trim();
}

function parseJsonSafe(raw: string): { [key: string]: Json } {
  const t = raw.trim();
  if (!t) return {};
  try {
    return JSON.parse(t) as { [key: string]: Json };
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1)) as { [key: string]: Json };
      } catch {
        return { raw: t };
      }
    }
    return { raw: t };
  }
}

const ARTIFACT_TYPES = new Set<string>([
  "brand_kit",
  "cv_package",
  "agri_plan",
  "build_plan",
  "dj_set",
  "campaign",
  "website_spec",
  "document_insight",
  "study_pack",
  "checklist",
  "table",
  "image",
  "video",
  "note",
  "audio_brief",
  "proposal",
  "presentation",
]);

export function unpackStoredArtifacts(raw: string | null | undefined): {
  artifacts: Artifact[];
  nextStep?: string;
} {
  if (!raw) return { artifacts: [] };
  try {
    const v = JSON.parse(raw) as unknown;
    if (Array.isArray(v)) return { artifacts: (v as Artifact[]).map(cleanArtifact) };
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as { artifacts?: unknown; nextStep?: unknown };
      const artifacts = Array.isArray(o.artifacts) ? (o.artifacts as Artifact[]).map(cleanArtifact) : [];
      const nextStep = typeof o.nextStep === "string" && o.nextStep.trim() ? withoutLongDash(o.nextStep) : undefined;
      return { artifacts, nextStep };
    }
  } catch {
    /* ignore */
  }
  return { artifacts: [] };
}

export function parsePililiOutput(raw: string): ParsedPilili {
  const images: { prompt: string; alt: string; edit?: boolean }[] = [];
  const videos: { prompt: string; duration: number }[] = [];
  const artifacts: Artifact[] = [];
  let next: string | null = null;
  let memory: { key: string; value: string; kind: string }[] = [];
  let meta: ParsedPilili["meta"] = null;

  let text = raw;

  const metaM = text.match(/<pilili_meta>([\s\S]*?)<\/pilili_meta>/i);
  if (metaM) {
    const j = parseJsonSafe(metaM[1] ?? "");
    if (j) {
      const powerRaw = String(j.power ?? "geral");
      const power = (POWER_IDS as readonly string[]).includes(powerRaw)
        ? (powerRaw as PowerId)
        : "geral";
      meta = {
        power,
        title: String(j.title ?? "Conversa"),
        needs_search: Boolean(j.needs_search),
        needs_image: Boolean(j.needs_image),
        needs_video: Boolean(j.needs_video),
        needs_edit: Boolean(j.needs_edit),
      };
    }
    text = text.replace(metaM[0], "");
  }

  const pushImage = (prompt: string, alt: string | undefined, edit?: boolean) => {
    images.push({ prompt, alt: alt || "Imagem PILILÍ", edit: Boolean(edit) });
    return "";
  };

  text = text.replace(
    /<pilili_image\s+prompt="([^"]*)"(?:\s+alt="([^"]*)")?(?:\s+edit="(true|false)")?\s*\/>/gi,
    (_w, prompt: string, alt?: string, edit?: string) => pushImage(prompt, alt, edit === "true"),
  );
  text = text.replace(
    /<pilili_image\s+prompt="([^"]*)"(?:\s+alt="([^"]*)")?(?:\s+edit="(true|false)")?\s*>\s*<\/pilili_image>/gi,
    (_w, prompt: string, alt?: string, edit?: string) => pushImage(prompt, alt, edit === "true"),
  );
  text = text.replace(
    /<pilili_edit\s+prompt="([^"]*)"(?:\s+alt="([^"]*)")?\s*\/>/gi,
    (_w, prompt: string, alt?: string) => pushImage(prompt, alt, true),
  );

  text = text.replace(
    /<pilili_video\s+prompt="([^"]*)"(?:\s+duration="(\d+)")?\s*\/>/gi,
    (_w, prompt: string, duration?: string) => {
      videos.push({ prompt, duration: Math.min(15, Math.max(5, Number(duration) || 6)) });
      return "";
    },
  );

  const artRe = /<pilili_artifact\b([^>]*)>([\s\S]*?)<\/pilili_artifact>/gi;
  text = text.replace(artRe, (_w, attrs: string, body: string) => {
    pushArtifact(attrs, body, artifacts);
    return "";
  });
  const openAt = text.search(/<pilili_artifact\b/i);
  if (openAt >= 0) {
    const rest = text.slice(openAt);
    const head = /^<pilili_artifact\b([^>]*)>/i.exec(rest);
    if (head) pushArtifact(head[1] ?? "", rest.slice(head[0].length), artifacts);
    text = text.slice(0, openAt);
  }

  const nextM = text.match(/<pilili_next>([\s\S]*?)<\/pilili_next>/i);
  if (nextM) {
    next = strip(nextM[1] ?? "");
    text = text.replace(nextM[0], "");
  }

  const memM = text.match(/<pilili_memory>([\s\S]*?)<\/pilili_memory>/i);
  if (memM) {
    try {
      const parsed = JSON.parse(memM[1] ?? "[]") as unknown;
      if (Array.isArray(parsed)) {
        memory = parsed
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const o = x as Record<string, unknown>;
            if (!o.key || !o.value) return null;
            return {
              key: String(o.key).slice(0, 80),
              value: String(o.value).slice(0, 500),
              kind: String(o.kind ?? "preference").slice(0, 32),
            };
          })
          .filter(Boolean) as typeof memory;
      }
    } catch {
      /* ignore */
    }
    text = text.replace(memM[0], "");
  }

  return {
    text: withoutLongDash(
      dedupeTextAgainstArtifacts(
        text.replace(/<video_pending>[\s\S]*?<\/video_pending>/gi, "").replace(/<\/?video_pending>/gi, "").replace(/\n{3,}/g, "\n\n").trim(),
        artifacts,
      ),
    ),
    meta: meta ? { ...meta, title: withoutLongDash(meta.title) } : null,
    artifacts,
    images: images.map((item) => ({
      ...item,
      prompt: withoutLongDash(item.prompt),
      alt: withoutLongDash(item.alt),
    })),
    videos: videos.map((item) => ({ ...item, prompt: withoutLongDash(item.prompt) })),
    next: next ? withoutLongDash(next) : null,
    memory: memory.map((item) => ({
      ...item,
      key: withoutLongDash(item.key),
      value: withoutLongDash(item.value),
    })),
  };
}

function attrValue(attrs: string, name: string): string {
  const quoted = attrs.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  if (quoted?.[1]) return quoted[1].trim();
  const plain = attrs.match(new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return plain?.[1]?.trim() ?? "";
}

function pushArtifact(attrs: string, body: string, artifacts: Artifact[]) {
  const typeName = attrValue(attrs, "type");
  const t = ARTIFACT_TYPES.has(typeName) ? (typeName as ArtifactType) : "note";
  let payload = parseJsonSafe(body);
  if (t === "website_spec") payload = ensureWebsitePayload(payload);
  const title = attrValue(attrs, "title") || (typeof payload.name === "string" ? payload.name : "") || "Resultado";
  artifacts.push(cleanArtifact({
    id: uid(),
    type: t,
    title,
    payload,
  }));
}

function cleanArtifact(artifact: Artifact): Artifact {
  return {
    ...artifact,
    title: withoutLongDash(artifact.title),
    payload: withoutLongDashValue(artifact.payload),
  };
}

const STRUCTURED = new Set<ArtifactType>([
  "checklist",
  "table",
  "proposal",
  "study_pack",
  "document_insight",
  "presentation",
  "cv_package",
]);

/** A list, table or document the user can use even when the prose was stripped. */
export function hasStructuredDeliverable(artifacts: Artifact[]): boolean {
  return artifacts.some((art) => {
    if (!STRUCTURED.has(art.type)) return false;
    if (art.type !== "checklist") return true;
    const items = art.payload.items;
    return Array.isArray(items) && items.length > 0;
  });
}
