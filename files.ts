const SHEET = /\.(xlsx?|pptx?)$/i;
const AUDIO = /\.(m4a|mp3|wav|ogg)$/i;

export function isPdf(name: string, mime: string): boolean {
  return name.toLowerCase().endsWith(".pdf") || mime.toLowerCase() === "application/pdf";
}

export function isDocx(name: string, mime: string): boolean {
  const type = mime.toLowerCase();
  return name.toLowerCase().endsWith(".docx") || type.includes("wordprocessingml");
}

/** Spreadsheets, slides and old .doc files are not read. PDF and .docx go to local extraction. */
export function blockedAttachmentReason(name: string, mime: string): string | null {
  const type = mime.toLowerCase();
  const file = name.toLowerCase();
  if (isPdf(name, mime) || isDocx(name, mime) || type.startsWith("audio/") || AUDIO.test(file)) return null;
  if (file.endsWith(".doc") || type.includes("msword")) {
    return "Este Word antigo não é lido. Envia um ficheiro .docx.";
  }
  const blocked =
    SHEET.test(name) ||
    type.includes("spreadsheetml") ||
    type.includes("ms-excel") ||
    type.includes("presentationml") ||
    type.includes("ms-powerpoint");
  if (!blocked) return null;
  return "Este formato ainda não é lido. Envia PDF, Word (.docx), texto ou uma fotografia.";
}
