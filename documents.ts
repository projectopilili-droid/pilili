import { PDFParse } from "pdf-parse";
import { createRequire } from "node:module";
import { isDocx, isPdf } from "../pilili/files";

const require = createRequire(import.meta.url);
const mammoth = require("mammoth") as {
  extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string; messages: Array<{ message?: string }> }>;
};

const MAX_CHARS = 20000;
export const PARTIAL_NOTE = "O ficheiro é complexo. O texto foi extraído parcialmente.";

export async function extractOfficeText(input: {
  name: string;
  mime: string;
  base64: string;
}): Promise<
  | { ok: true; text: string; partial: boolean; warning?: string }
  | { ok: false; message: string }
> {
  const name = input.name.slice(0, 180);
  const mime = input.mime.slice(0, 120);
  if (!isPdf(name, mime) && !isDocx(name, mime)) {
    return { ok: false, message: "Envia um PDF ou um Word (.docx)." };
  }
  let bytes: Buffer;
  try {
    bytes = Buffer.from(input.base64, "base64");
  } catch {
    return { ok: false, message: "Não consegui ler este ficheiro." };
  }
  if (bytes.length < 8 || bytes.length > 6_000_000) {
    return { ok: false, message: "O ficheiro é grande demais. Envia até 6 MB ou uma fotografia das páginas." };
  }
  try {
    if (isPdf(name, mime)) return await readPdf(bytes);
    return await readDocx(bytes);
  } catch {
    return { ok: false, message: "Não consegui ler este ficheiro. Envia uma fotografia das páginas ou cola o texto." };
  }
}

function pack(full: string, partial: boolean) {
  const clean = full
    .replace(/\u0000/g, "")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/\n*--\s+\d+\s+of\s+\d+\s+--\s*/g, "\n")
    .trim();
  const cut = clean.length > MAX_CHARS;
  const text = clean.slice(0, MAX_CHARS);
  if (text.length < 2) {
    return { ok: false as const, message: "Não encontrei texto neste ficheiro. Envia uma fotografia das páginas." };
  }
  const incomplete = partial || cut;
  return {
    ok: true as const,
    text,
    partial: incomplete,
    warning: incomplete ? PARTIAL_NOTE : undefined,
  };
}

async function readPdf(bytes: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    const result = await parser.getText();
    const pages = result.total || result.pages.length;
    const thin = pages > 2 && result.text.trim().length < 80;
    return pack(result.text, thin);
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function readDocx(bytes: Buffer) {
  const result = await mammoth.extractRawText({ buffer: bytes });
  const notes = (result.messages ?? []).some((item) => item.message);
  return pack(result.value ?? "", notes);
}
