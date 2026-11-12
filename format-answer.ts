function isSiteMarkup(body: string): boolean {
  return /<!DOCTYPE|<html\b|<style\b|<head\b/i.test(body);
}

/** Drop page source from the chat. Short lists inside a fence stay. */
function withoutSiteSource(raw: string): string {
  const withoutTags = raw
    .replace(/<pilili_[a-z0-9_]*\b[^>]*>[\s\S]*?<\/pilili_[a-z0-9_]*>/gi, "")
    .replace(/<pilili_[\s\S]*$/i, "");
  const closed = withoutTags
    .replace(/```css[^\n]*\n?[\s\S]*?```/gi, "")
    .replace(/```(?:html)?[^\n]*\n?([\s\S]*?)```/gi, (all, body: string) => (isSiteMarkup(body) ? "" : all))
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<!DOCTYPE\s+html[\s\S]*?<\/html>/gi, "")
    .replace(/<html\b[\s\S]*?<\/html>/gi, "");
  const fence = /```(?:html|css)\b/i.exec(closed);
  const withoutFence =
    fence && fence.index != null && !closed.slice(fence.index + 3).includes("```")
      ? closed.slice(0, fence.index)
      : closed;
  const open = /<!DOCTYPE\s+html|<html\b|<style\b/i.exec(withoutFence);
  if (!open || open.index == null) return withoutFence;
  return withoutFence.slice(0, open.index);
}

function listFromHtml(body: string): string | null {
  if (!/<\s*(ol|ul|li)\b/i.test(body)) return null;
  const ordered = /<\s*ol\b/i.test(body);
  const items: string[] = [];
  const re = /<\s*li\b[^>]*>([\s\S]*?)<\s*\/\s*li\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body))) {
    const text = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) items.push(text);
  }
  if (items.length === 0) return null;
  return items.map((item, i) => (ordered ? `${i + 1}. ${item}` : `- ${item}`)).join("\n");
}

function partialChecklist(raw: string): string {
  const start = raw.search(/<pilili_artifact\s+type="checklist"/i);
  if (start < 0) return "";
  const slice = raw.slice(start);
  const items: string[] = [];
  const re = /"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(slice))) {
    const text = match[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
    if (text) items.push(`- ${text}`);
  }
  return items.join("\n");
}

/** Show the prose already received. Hide closed control blocks and an unfinished tail. */
export function visibleStreamText(raw: string): string {
  const withoutClosed = raw
    .replace(/<video_pending>[\s\S]*?<\/video_pending>/gi, "")
    .replace(/<pilili_[a-z0-9_]*\b[^>]*>[\s\S]*?<\/pilili_[a-z0-9_]*>/gi, "");
  const withoutTail = withoutClosed.replace(/<(?:pilili_|video_pending)[\s\S]*$/i, "");
  const prose = formatAnswerText(withoutTail);
  const list = partialChecklist(raw);
  if (!list) return prose;
  if (!prose) return list;
  return `${prose}\n\n${list}`;
}
export function formatAnswerText(raw: string): string {
  const unfenced = withoutSiteSource(raw)
    .replace(/\r/g, "")
    .replace(/<video_pending>[\s\S]*?<\/video_pending>/gi, "")
    .replace(/<\/?video_pending>/gi, "")
    .replace(/```(?:html|markdown|md|text)?[^\n]*\n?([\s\S]*?)```/gi, (_all, body: string) => {
    const inner = String(body ?? "").trim();
    return listFromHtml(inner) ?? inner.replace(/<[^>]+>/g, " ").replace(/[ \t]+\n/g, "\n").trim();
  });
  return withoutLongDash(unfenced.replace(/\n{3,}/g, "\n\n").trim());
}

function cleanSymbols(value: string): string {
  return value
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/[★☆✦✧✓✔✕✖※]/g, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/^[ \t]*[•●◦▪▸►]\s*/gm, "- ")
    .replace(/^[ \t]*\*\s+/gm, "- ")
    .replace(/[•●◦▪▸►→➔]/g, "-")
    .replace(/[*“”«»„"'‘’`]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n");
}

export function withoutLongDash(value: string): string {
  if (/^data:/i.test(value.trim()) || /^https?:\/\//i.test(value.trim())) return value;
  if (/<[a-z!/][^>]*>/i.test(value)) {
    return value.replace(/(^|>)([^<]*)/g, (_all, lead: string, text: string) => `${lead}${cleanSymbols(text)}`);
  }
  return cleanSymbols(value);
}

export function withoutLongDashValue<T>(value: T): T {
  if (typeof value === "string") return withoutLongDash(value) as T;
  if (Array.isArray(value)) return value.map((item) => withoutLongDashValue(item)) as T;
  if (value && typeof value === "object") {
    const out: { [key: string]: unknown } = {};
    for (const [key, item] of Object.entries(value)) out[key] = withoutLongDashValue(item);
    return out as T;
  }
  return value;
}

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function artifactLines(artifacts: { type: string; payload?: { items?: unknown } }[]): Set<string> {
  const lines = new Set<string>();
  for (const art of artifacts) {
    if (art.type !== "checklist") continue;
    const items = art.payload?.items;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (typeof item === "string") lines.add(norm(item));
      else if (item && typeof item === "object" && "text" in item) lines.add(norm(String((item as { text: unknown }).text)));
    }
  }
  return lines;
}

/** Keep the introduction. Drop list lines that the checklist artefact already shows. */
export function dedupeTextAgainstArtifacts(
  text: string,
  artifacts: { type: string; payload?: { items?: unknown } }[],
): string {
  const formatted = formatAnswerText(text);
  const covered = artifactLines(artifacts);
  if (covered.size === 0) return formatted;
  const kept = formatted.split("\n").filter((line) => {
    if (!/^(\d+\.|[-*])\s+/.test(line)) return true;
    const item = line.replace(/^(\d+\.|[-*])\s+/, "");
    return !covered.has(norm(item));
  });
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
