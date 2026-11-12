import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function formatKz(value: number): string {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 0,
  }).format(value);
}

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `há ${d} d`;
  return new Date(iso).toLocaleDateString("pt-AO", {
    day: "numeric",
    month: "short",
  });
}

export function downloadBlob(filename: string, mime: string, data: string | Blob) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function artifactDocument(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:Georgia,"Times New Roman",serif;max-width:720px;margin:40px auto;padding:0 24px 32px;color:#16120c;background:#f7f3ea;line-height:1.55}
  h1{font-family:Segoe UI,sans-serif;font-size:32px;line-height:1.15;margin:8px 0 0}
  h2{font-family:Segoe UI,sans-serif;font-size:13px;letter-spacing:.14em;text-transform:uppercase;margin:28px 0 8px;padding-bottom:6px;border-bottom:1px solid #c6a15b}
  h3{font-family:Segoe UI,sans-serif;font-size:16px;margin:16px 0 4px}
  p{margin:8px 0}
  .gold{color:#8d7349;text-transform:uppercase;letter-spacing:.18em;font-size:11px}
  .meta{font-size:12px;color:#7a746b;margin-top:36px;border-top:1px solid #e6dfd2;padding-top:12px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{border-bottom:1px solid #e6dfd2;padding:8px;text-align:left;vertical-align:top}
  .slide{border:1px solid #e6dfd2;padding:20px;margin:16px 0;border-radius:12px;background:#fff}
  ol,ul{padding-left:1.2rem;margin:8px 0}
  li{margin:0.35rem 0}
  @media print{body{margin:16px;background:#fff}}
</style>
</head>
<body>
<p class="gold">PILILÍ</p>
${bodyHtml}
<p class="meta">Documento PILILÍ.</p>
</body>
</html>`;
}

function isFullDocument(html: string) {
  return /^\s*(<!DOCTYPE|<html\b)/i.test(html);
}

function presentHtml(title: string, bodyHtml: string) {
  return isFullDocument(bodyHtml) ? bodyHtml : artifactDocument(title, bodyHtml);
}
/** Honest HTML pack the user can open or print to PDF. Not a fake PDF generator. */
export function downloadHtml(filename: string, title: string, bodyHtml: string) {
  const name = filename.toLowerCase().endsWith(".html") ? filename : `${filename}.html`;
  downloadBlob(name, "text/html;charset=utf-8", presentHtml(title, bodyHtml));
}

/** Prints the artefact itself, not the rest of the application. */
export function printHtml(title: string, bodyHtml: string): "printed" | "blocked" {
  const page = window.open("", "_blank", "noopener,noreferrer");
  if (!page) return "blocked";
  page.document.write(presentHtml(title, bodyHtml));
  page.document.close();
  page.focus();
  page.print();
  return "printed";
}

export function isUnauthorized(err: unknown): boolean {
  if (err && typeof err === "object" && "message" in err) {
    return (err as { message: string }).message === "Unauthorized";
  }
  return false;
}
