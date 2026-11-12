import { jsPDF } from "jspdf";
import { cvDocument, cvPdfName, type CvData, type CvStyle } from "../pilili/cv.ts";
import { printHtml } from "../utils.ts";

export type CvDownload = "pdf" | "print";

type PrintFn = (title: string, html: string) => void;
type RGB = [number, number, number];

const GOLD: RGB = [198, 161, 91];
const GOLD2: RGB = [212, 179, 106];
const NAVY: RGB = [22, 50, 79];
const INK: RGB = [28, 25, 21];
const MUTED: RGB = [93, 107, 122];
const BEIGE: RGB = [246, 241, 232];
const WHITE: RGB = [255, 255, 255];

function setFill(pdf: jsPDF, color: RGB) {
  pdf.setFillColor(color[0], color[1], color[2]);
}

function setDraw(pdf: jsPDF, color: RGB) {
  pdf.setDrawColor(color[0], color[1], color[2]);
}

function lineHeight(size: number) {
  return size * 0.37;
}

function write(
  pdf: jsPDF,
  value: string,
  x: number,
  y: number,
  opts: { size: number; font: "times" | "helvetica"; weight?: "normal" | "bold"; color: RGB; width: number },
): number {
  const valueText = value.replace(/\s*\n+\s*/g, " ").trim();
  if (!valueText) return y;
  pdf.setFont(opts.font, opts.weight ?? "normal");
  pdf.setFontSize(opts.size);
  pdf.setTextColor(opts.color[0], opts.color[1], opts.color[2]);
  const lines = pdf.splitTextToSize(valueText, opts.width) as string[];
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight(opts.size);
}

function drawPhoto(pdf: jsPDF, data: CvData, x: number, y: number, size: number) {
  if (!data.photo) return;
  const kind = /image\/png/i.test(data.photo) ? "PNG" : "JPEG";
  const cx = x + size / 2;
  const cy = y + size / 2;
  const radius = size / 2;
  pdf.saveGraphicsState();
  pdf.circle(cx, cy, radius, null);
  pdf.clip();
  pdf.discardPath();
  pdf.addImage(data.photo, kind, x, y, size, size);
  pdf.restoreGraphicsState();
  setDraw(pdf, GOLD2);
  pdf.setLineWidth(0.5);
  pdf.circle(cx, cy, radius, "S");
}

function bits(values: string[]): string {
  return values.filter(Boolean).join(" · ");
}

function paintBar(pdf: jsPDF) {
  setFill(pdf, NAVY);
  pdf.rect(0, 0, 68, pdf.internal.pageSize.getHeight(), "F");
}

function paintBeige(pdf: jsPDF) {
  setFill(pdf, BEIGE);
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), "F");
}

function sectionTitle(pdf: jsPDF, title: string, x: number, y: number, width: number, color: RGB, rule: RGB): number {
  const next = write(pdf, title.toUpperCase(), x, y, { size: 10, font: "helvetica", weight: "bold", color, width });
  setDraw(pdf, rule);
  pdf.setLineWidth(0.25);
  pdf.line(x, next - 0.6, x + width, next - 0.6);
  return next + 1.6;
}

function jobs(pdf: jsPDF, items: CvData["experience"], x: number, y: number, width: number, style: CvStyle): number {
  for (const job of items) {
    if (y > pdf.internal.pageSize.getHeight() - 20) {
      pdf.addPage();
      if (style === "barra") paintBar(pdf);
      if (style === "claro") paintBeige(pdf);
      y = 14;
    }
    const meta = bits([job.org, job.dates]);
    y = write(pdf, job.title, x, y, { size: 11.5, font: style === "classico" ? "times" : "helvetica", weight: "bold", color: INK, width });
    if (meta) y = write(pdf, meta, x, y, { size: 9, font: "helvetica", color: MUTED, width });
    for (const bullet of job.bullets) {
      y = write(pdf, `- ${bullet}`, x, y, { size: 10, font: "helvetica", color: INK, width });
    }
    y += 1.4;
  }
  return y;
}

function stack(pdf: jsPDF, items: string[], x: number, y: number, width: number, font: "times" | "helvetica"): number {
  for (const item of items) {
    y = write(pdf, item, x, y, { size: 10, font, color: INK, width });
    y += 0.4;
  }
  return y;
}

function drawClassico(pdf: jsPDF, data: CvData): number {
  const photoSize = 26;
  const photoTop = 12;
  drawPhoto(pdf, data, 170, photoTop, photoSize);
  const headW = data.photo ? 148 : 182;
  let y = write(pdf, data.name, 14, 16, { size: 20, font: "times", color: INK, width: headW });
  if (data.role) y = write(pdf, data.role.toUpperCase(), 14, y + 0.4, { size: 9, font: "helvetica", color: GOLD, width: headW });
  const contacts = bits([data.email, data.phone, data.location]);
  if (contacts) {
    setDraw(pdf, GOLD);
    pdf.setLineWidth(0.25);
    pdf.line(14, y + 0.8, data.photo ? 162 : 196, y + 0.8);
    y = write(pdf, contacts, 14, y + 4, { size: 9, font: "helvetica", color: MUTED, width: headW });
  }
  y = Math.max(y + 2, data.photo ? photoTop + photoSize + 4 : y + 2);
  if (data.profile) y = write(pdf, data.profile, 14, y, { size: 10.5, font: "times", color: INK, width: 182 });
  if (data.experience.length) {
    y = sectionTitle(pdf, "Experiência", 14, y + 2.5, 182, NAVY, GOLD);
    y = jobs(pdf, data.experience, 14, y, 182, "classico");
  }
  if (data.projects.length) {
    y = sectionTitle(pdf, "Projecto", 14, y + 1, 182, NAVY, GOLD);
    y = jobs(pdf, data.projects, 14, y, 182, "classico");
  }
  if (data.skills.length) {
    y = sectionTitle(pdf, "Competências", 14, y + 1, 182, NAVY, GOLD);
    y = stack(pdf, data.skills, 14, y, 182, "helvetica");
  }
  if (data.education.length) {
    y = sectionTitle(pdf, "Formação", 14, y + 1, 182, NAVY, GOLD);
    y = stack(pdf, data.education, 14, y, 182, "times");
  }
  return y;
}

function drawBarra(pdf: jsPDF, data: CvData): number {
  paintBar(pdf);
  const photoSize = 28;
  drawPhoto(pdf, data, (68 - photoSize) / 2, 10, photoSize);
  let side = data.photo ? 44 : 14;
  side = write(pdf, data.name, 8, side, { size: 13, font: "helvetica", weight: "bold", color: WHITE, width: 52 });
  if (data.role) side = write(pdf, data.role, 8, side + 0.4, { size: 8.5, font: "helvetica", color: GOLD2, width: 52 });
  const contacts = [data.email, data.phone, data.location].filter(Boolean);
  if (contacts.length) side += 2;
  for (const line of contacts) side = write(pdf, line, 8, side + 0.6, { size: 8, font: "helvetica", color: WHITE, width: 52 });
  if (data.skills.length) {
    side = write(pdf, "COMPETÊNCIAS", 8, side + 3, { size: 8, font: "helvetica", weight: "bold", color: GOLD2, width: 52 });
    for (const skill of data.skills) side = write(pdf, skill, 8, side + 0.5, { size: 8, font: "helvetica", color: WHITE, width: 52 });
  }

  let y = 14;
  if (data.profile) {
    y = write(pdf, "PERFIL", 76, y, { size: 10, font: "helvetica", weight: "bold", color: NAVY, width: 122 });
    y = write(pdf, data.profile, 76, y + 0.4, { size: 10, font: "helvetica", color: INK, width: 122 });
  }
  if (data.experience.length) {
    y = sectionTitle(pdf, "Experiência", 76, y + 2, 122, NAVY, GOLD2);
    y = jobs(pdf, data.experience, 76, y, 122, "barra");
  }
  if (data.projects.length) {
    y = sectionTitle(pdf, "Projecto", 76, y + 1, 122, NAVY, GOLD2);
    y = jobs(pdf, data.projects, 76, y, 122, "barra");
  }
  if (data.education.length) {
    y = sectionTitle(pdf, "Formação", 76, y + 1, 122, NAVY, GOLD2);
    y = stack(pdf, data.education, 76, y, 122, "helvetica");
  }
  return Math.max(side, y);
}

function drawClaro(pdf: jsPDF, data: CvData): number {
  paintBeige(pdf);
  const photoSize = 26;
  const photoTop = 12;
  drawPhoto(pdf, data, 170, photoTop, photoSize);
  const headW = data.photo ? 148 : 182;
  let y = write(pdf, data.name, 14, 16, { size: 20, font: "helvetica", weight: "bold", color: INK, width: headW });
  if (data.role) y = write(pdf, data.role, 14, y + 0.4, { size: 10, font: "helvetica", color: GOLD, width: headW });
  const contacts = bits([data.email, data.phone, data.location]);
  if (contacts) y = write(pdf, contacts, 14, y + 1, { size: 9, font: "helvetica", color: MUTED, width: headW });
  y = Math.max(y + 2, data.photo ? photoTop + photoSize + 4 : y + 2);
  if (data.profile) y = write(pdf, data.profile, 14, y, { size: 10.5, font: "helvetica", color: INK, width: 182 });
  if (data.experience.length) {
    y = sectionTitle(pdf, "Experiência", 14, y + 2.5, 182, INK, GOLD);
    y = jobs(pdf, data.experience, 14, y, 182, "claro");
  }
  if (data.projects.length) {
    y = sectionTitle(pdf, "Projecto", 14, y + 1, 182, INK, GOLD);
    y = jobs(pdf, data.projects, 14, y, 182, "claro");
  }
  if (data.skills.length) {
    y = sectionTitle(pdf, "Competências", 14, y + 1, 182, INK, GOLD);
    y = stack(pdf, data.skills, 14, y, 182, "helvetica");
  }
  if (data.education.length) {
    y = sectionTitle(pdf, "Formação", 14, y + 1, 182, INK, GOLD);
    y = stack(pdf, data.education, 14, y, 182, "helvetica");
  }
  return y;
}

function paintCv(pdf: jsPDF, data: CvData, style: CvStyle): number {
  pdf.setLineHeightFactor(1.05);
  if (style === "barra") return drawBarra(pdf, data);
  if (style === "claro") return drawClaro(pdf, data);
  return drawClassico(pdf, data);
}

export function renderCvPdf(data: CvData, style: CvStyle): jsPDF {
  const probe = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const end = paintCv(probe, data, style);
  if (probe.getNumberOfPages() > 1) {
    probe.setProperties({ title: data.name || "CV", subject: style, creator: "PILILI" });
    return probe;
  }
  const height = Math.min(297, Math.max(Math.ceil(end + 10), 211));
  const pdf = new jsPDF({ unit: "mm", format: [210, height], orientation: "portrait", compress: true });
  pdf.setProperties({ title: data.name || "CV", subject: style, creator: "PILILI" });
  paintCv(pdf, data, style);
  return pdf;
}

function pdfBlob(pdf: jsPDF): Blob {
  const raw = pdf.output("arraybuffer");
  const bytes = new Uint8Array(raw);
  const head = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0, bytes[4] ?? 0);
  if (head !== "%PDF-") throw new Error("cv");
  return new Blob([bytes], { type: "application/pdf" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("photo"));
    img.src = src;
  });
}

/** Same attached photo, framed like the CV on screen. Not a new picture. */
export async function photoForPdf(src: string): Promise<string> {
  if (!src || typeof document === "undefined") return src;
  const img = await loadImage(src);
  const size = 480;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}

export async function downloadCvPdf(title: string, data: CvData, style: CvStyle, print: PrintFn = printHtml): Promise<CvDownload> {
  let ready = data;
  if (data.photo && typeof document !== "undefined") {
    try {
      ready = { ...data, photo: await photoForPdf(data.photo) };
    } catch {
      ready = data;
    }
  }
  try {
    const blob = pdfBlob(renderCvPdf(ready, style));
    const name = cvPdfName(title);
    if (!name.endsWith(".pdf") || blob.type !== "application/pdf") throw new Error("cv");
    if (typeof document === "undefined") {
      print(title, cvDocument(data, style));
      return "print";
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.rel = "noopener";
    link.type = "application/pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    return "pdf";
  } catch {
    if (typeof print === "function") print(title, cvDocument(data, style));
    return "print";
  }
}
