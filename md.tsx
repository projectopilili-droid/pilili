import { cn } from "@/lib/utils";
import { formatAnswerText } from "@/lib/pilili/format-answer";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function inline(s: string): string {
  let t = escapeHtml(s);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/_([^_]+)_/g, "<em>$1</em>");
  t = t.replace(
    /\[([^\]]+)\]\((https?:[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<)"']+)/g, (_, lead: string, url: string) => {
    const clean = url.replace(/[.,;:!?)]+$/g, "");
    const rest = url.slice(clean.length);
    return `${lead}<a href="${clean}" target="_blank" rel="noreferrer">${clean}</a>${rest}`;
  });
  return t;
}

function toHtml(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(`<h2>${inline(line.slice(2))}</h2>`);
      i += 1;
      continue;
    }
    if (line.trim().startsWith("|") && lines[i + 1]?.includes("---")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i]?.trim().startsWith("|")) {
        rows.push(lines[i] ?? "");
        i += 1;
      }
      const parseRow = (r: string) =>
        r
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
      const headers = parseRow(rows[0] ?? "");
      const body = rows.slice(2);
      out.push("<table><thead><tr>");
      headers.forEach((h) => out.push(`<th>${inline(h)}</th>`));
      out.push("</tr></thead><tbody>");
      body.forEach((r) => {
        out.push("<tr>");
        parseRow(r).forEach((c) => out.push(`<td>${inline(c)}</td>`));
        out.push("</tr>");
      });
      out.push("</tbody></table>");
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      out.push("<ul>");
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? "")) {
        out.push(`<li>${inline((lines[i] ?? "").replace(/^[-*]\s+/, ""))}</li>`);
        i += 1;
      }
      out.push("</ul>");
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      out.push("<ol>");
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? "")) {
        out.push(`<li>${inline((lines[i] ?? "").replace(/^\d+\.\s+/, ""))}</li>`);
        i += 1;
      }
      out.push("</ol>");
      continue;
    }
    const buf = [line];
    i += 1;
    while (i < lines.length && lines[i]?.trim() && !/^(#{1,3}\s|[-*]\s|\d+\.\s|\|)/.test(lines[i] ?? "")) {
      buf.push(lines[i] ?? "");
      i += 1;
    }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("");
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn("prose-pilili", className)}
      dangerouslySetInnerHTML={{ __html: toHtml(formatAnswerText(text)) }}
    />
  );
}
