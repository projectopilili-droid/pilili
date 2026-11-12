import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import { downloadBlob, printHtml } from "../utils.ts";

type Shot = { dataUrl: string; w: number; h: number };

function clean(value: string): string {
  return value.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-");
}

export function htmlToPlain(html: string): string {
  return clean(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(h1|h2|h3|p|div|tr|li)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/[ \t]+\n/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n"),
  ).trim();
}

export function whatsappText(title: string, body: string): string {
  const text = clean(body)
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_`#]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return clean(title);
  if (text.startsWith(clean(title))) return text;
  return `${clean(title)}\n\n${text}`;
}

function fileBase(title: string): string {
  const name = clean(title)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return name || "documento";
}

function linesOf(title: string, body: string): string[] {
  const text = clean(body).trim();
  const rows = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (!rows.length) return [clean(title)];
  if (rows[0] === clean(title)) return rows;
  return [clean(title), ...rows];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("imagem"));
    img.src = src;
  });
}

async function shotOf(url: string): Promise<Shot | null> {
  if (!url || typeof document === "undefined") return null;
  try {
    let src = url;
    if (!url.startsWith("data:")) {
      const res = await fetch(url);
      if (!res.ok) return null;
      src = URL.createObjectURL(await res.blob());
    }
    const img = await loadImage(src);
    const max = 1200;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (src !== url) URL.revokeObjectURL(src);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}

export function imageSources(html?: string, images?: string[]): string[] {
  const found = [...(images ?? [])];
  if (html) {
    const re = /<img\b[^>]*src=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html))) found.push(match[1] ?? "");
  }
  return [...new Set(found.filter((url) => /^https?:|^data:image\//i.test(url)))].slice(0, 3);
}

export async function downloadDocumentPdf(title: string, body: string, html: string, images: string[]): Promise<"pdf" | "print"> {
  const shots: Shot[] = [];
  for (const url of images) {
    const shot = await shotOf(url);
    if (shot) shots.push(shot);
  }
  try {
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    pdf.setProperties({ title: clean(title), creator: "PILILI" });
    let y = 18;
    const rows = linesOf(title, body);
    rows.forEach((line, index) => {
      const bullet = /^[-•]\s+/.test(line);
      const heading = index === 0 || (!bullet && line.length < 72 && !/[.!?]$/.test(line));
      const size = index === 0 ? 18 : heading ? 13 : 11;
      const font = heading ? "bold" : "normal";
      pdf.setFont("helvetica", font);
      pdf.setFontSize(size);
      pdf.setTextColor(index === 0 ? 22 : 40, index === 0 ? 18 : 36, index === 0 ? 12 : 32);
      const width = bullet ? 164 : 178;
      const x = bullet ? 22 : 16;
      const wrapped = pdf.splitTextToSize(bullet ? line.replace(/^[-•]\s+/, "- ") : line, width) as string[];
      const need = wrapped.length * (size * 0.45) + 3;
      if (y + need > 282) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(wrapped, x, y);
      y += need;
    });
    for (const shot of shots) {
      const width = 170;
      const height = Math.min(90, (width * shot.h) / shot.w);
      if (y + height > 282) {
        pdf.addPage();
        y = 18;
      }
      pdf.addImage(shot.dataUrl, "JPEG", 16, y, width, height);
      y += height + 6;
    }
    const raw = pdf.output("arraybuffer");
    const bytes = new Uint8Array(raw);
    const head = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0, bytes[4] ?? 0);
    if (head !== "%PDF-") throw new Error("pdf");
    downloadBlob(`${fileBase(title)}.pdf`, "application/pdf", new Blob([bytes], { type: "application/pdf" }));
    return "pdf";
  } catch {
    printHtml(title, html || `<h1>${clean(title)}</h1><p>${clean(body).replace(/\n/g, "<br/>")}</p>`);
    return "print";
  }
}

export async function downloadDocumentWord(title: string, body: string, images: string[]): Promise<void> {
  const shots: Shot[] = [];
  for (const url of images) {
    const shot = await shotOf(url);
    if (shot) shots.push(shot);
  }
  const rows = linesOf(title, body);
  const children: Paragraph[] = [];
  rows.forEach((line, index) => {
    const bullet = /^[-•]\s+/.test(line);
    children.push(
      new Paragraph({
        heading: index === 0 ? HeadingLevel.HEADING_1 : undefined,
        bullet: bullet ? { level: 0 } : undefined,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: bullet ? line.replace(/^[-•]\s+/, "") : line,
            bold: index === 0 || (!bullet && line.length < 72 && !/[.!?]$/.test(line)),
          }),
        ],
      }),
    );
  });
  for (const shot of shots) {
    const b64 = shot.dataUrl.split(",")[1] ?? "";
    const bin = atob(b64);
    const data = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) data[i] = bin.charCodeAt(i);
    const width = 480;
    const height = Math.max(40, Math.round((width * shot.h) / shot.w));
    children.push(
      new Paragraph({
        children: [new ImageRun({ type: "jpg", data, transformation: { width, height } })],
      }),
    );
  }
  const doc = new Document({
    creator: "PILILI",
    title: clean(title),
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(`${fileBase(title)}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", blob);
}
