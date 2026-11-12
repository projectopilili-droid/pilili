import type { Json } from "./types";

function esc(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;");
}

export function readField(raw: string, key: string): string {
  const quoted = raw.match(new RegExp(`["']?${key}["']?\\s*:\\s*"([^"]*)"`, "i"));
  if (quoted?.[1]?.trim()) return quoted[1].trim();
  const plain = raw.match(new RegExp(`["']?${key}["']?\\s*:\\s*([^,}\\n]+)`, "i"));
  return plain?.[1]?.replace(/^["']|["']$/g, "").trim() ?? "";
}

import { renderTemplate } from "./site-layouts.ts";

export const SITE_TEMPLATES = [
  { id: "roupa", label: "Loja / Roupa", note: "Título grande, foto ao lado e três pontos." },
  { id: "servicos", label: "Serviços", note: "Fundo escuro, prova de confiança e serviços." },
  { id: "entregas", label: "Entregas", note: "Título forte, o que tratamos e os passos." },
  { id: "restaurante", label: "Restaurante / Comida", note: "Prato em destaque e três escolhas." },
] as const;

export type SiteTemplateId = (typeof SITE_TEMPLATES)[number]["id"];

export function resolveSiteTemplate(text: string): SiteTemplateId {
  const named = text.toLowerCase().match(/modelo do site:\s*(roupa|loja|servicos|servi[cç]os|entregas|restaurante|comida)/);
  const id = named?.[1] ?? "";
  if (id === "loja" || id === "roupa") return "roupa";
  if (id.startsWith("servic")) return "servicos";
  if (id === "comida" || id === "restaurante") return "restaurante";
  if (id === "entregas") return "entregas";
  const t = text.toLowerCase();
  if (/roupa|moda|vestu|boutique|cabide/.test(t)) return "roupa";
  if (/restaurante|comida|padaria|pastelaria|prato|menu/.test(t)) return "restaurante";
  if (/entrega|transport|mota|envio|estafeta/.test(t)) return "entregas";
  if (/cl[ií]nica|sal[aã]o|beleza|consult|servi[cç]o/.test(t)) return "servicos";
  return "entregas";
}

export function userAskedColors(text: string): boolean {
  return /preto|branco|dourad|ouro|azul|verde|vermelh|rosa|bege|castanh|laranja|roxo|amarelo|paleta|cor |cores |fundo escuro|fundo claro/i.test(text);
}

export function smallSiteEdit(message: string): boolean {
  const t = message.toLowerCase();
  if (/do zero|site novo|cria um site|criar um site|nova landing|novo site/.test(t)) return false;
  return /whatsapp|n[uú]mero|telefone|cor\b|texto|t[ií]tulo|sec[cç][aã]o|frase|contacto/.test(t);
}

export function applySmallSiteEdit(html: string, message: string): string | null {
  if (!html || html.length < 40) return null;
  let next = html;
  let changed = false;
  const phone = message.match(/(?:\+?\s*244[\s.-]*)?9\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/);
  if (/whatsapp|n[uú]mero|telefone|contacto/.test(message.toLowerCase()) && phone) {
    const digits = phone[0].replace(/\D/g, "");
    const local = digits.startsWith("244") ? digits.slice(3) : digits;
    const shown = local.length === 9 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : local;
    const wa = `https://wa.me/244${local}`;
    if (/wa\.me\/\d+/i.test(next)) {
      next = next.replace(/https?:\/\/wa\.me\/\d+/gi, wa);
      changed = true;
    }
    if (/href=["']tel:/i.test(next)) {
      next = next.replace(/href=["']tel:[^"']+/gi, `href="tel:+244${local}`);
      changed = true;
    }
    if (!changed) {
      const found = next.match(/\b9\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/);
      if (found) {
        next = next.replace(found[0], shown);
        changed = true;
      }
    } else if (/\b9\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/.test(next)) {
      next = next.replace(/\b9\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/, shown);
    }
  }
  const colorName = Object.keys(SITE_COLORS).find((name) => message.toLowerCase().includes(name));
  if (colorName && /cor\b|fundo|bot[aã]o/.test(message.toLowerCase())) {
    const hex = SITE_COLORS[colorName];
    const accent = [...next.matchAll(/#(?:[0-9a-fA-F]{6})/g)].map((item) => item[0]).find((item) => !neutralColor(item));
    if (accent && accent.toLowerCase() !== hex) {
      next = next.replace(new RegExp(accent, "gi"), hex);
      changed = true;
    }
  }
  const quoted = message.match(/["“]([^"”]{2,80})["”]\s*(?:para|por)\s*["“]([^"”]{2,80})["”]/);
  if (quoted && next.includes(quoted[1])) {
    next = next.split(quoted[1]).join(quoted[2]);
    changed = true;
  }
  const title = message.match(/(?:t[ií]tulo|frase)\s+(?:para|por)\s+["“]?([^"”.\n]{2,80})/i);
  if (title) {
    const value = title[1].trim();
    const h1 = next.match(/<h1[^>]*>[^<]+<\/h1>/i);
    if (h1 && value) {
      next = next.replace(h1[0], h1[0].replace(/>[^<]+</, `>${esc(value)}<`));
      changed = true;
    }
  }
  const section = message.match(/(?:adiciona|acrescenta)\s+uma\s+sec[cç][aã]o(?:\s+sobre|\s+de)?\s+(.+)/i);
  if (section) {
    const heading = section[1].replace(/[.。]$/, "").trim().slice(0, 80);
    if (heading) {
      const block = `<section><h2>${esc(heading)}</h2><p>${esc(heading)}</p></section>`;
      next = next.includes("</body>") ? next.replace("</body>", `${block}</body>`) : `${next}${block}`;
      changed = true;
    }
  }
  return changed && next !== html ? next : null;
}

const SITE_COLORS: Record<string, string> = {
  preto: "#111111",
  branco: "#ffffff",
  dourad: "#d4b07a",
  ouro: "#d4b07a",
  azul: "#1d4e89",
  verde: "#1f7a4d",
  vermelh: "#9b2335",
  rosa: "#c45c7a",
  bege: "#e6d7c3",
  castanh: "#6b4f3a",
  laranja: "#d86b2a",
  roxo: "#5c4d8a",
  amarelo: "#e0b43a",
};

function neutralColor(hex: string): boolean {
  const n = hex.slice(1);
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return Math.max(r, g, b) - Math.min(r, g, b) < 18;
}

export function continuesSite(message: string, hasSite: boolean): boolean {
  if (isSiteRequest(message)) return true;
  if (!hasSite) return false;
  return /muda|altera|acrescent|adicion|troca|cor\b|texto|imagem|foto|produto|sec[cç]|menu|hero|contacto|pre[cç]o|t[ií]tulo|bot[aã]o/i.test(message);
}

export function isSiteRequest(text: string): boolean {
  const t = text.toLowerCase();
  const copyOnly = /estrat[eé]gia digital|redes sociais|conte[uú]dos para redes/.test(t);
  const site = /site|landing|loja|website|p[aá]gina/.test(t);
  if (copyOnly && !site) return false;
  return site;
}

export function siteReply(text: string): string {
  const clean = text.replace(/\u2014/g, "-").replace(/\s+/g, " ").trim();
  const asks = (clean.match(/\?/g) ?? []).length > 0 || /qual é|qual o|como se chama|diz-me|envia o|manda o|preciso do|falta o/i.test(clean);
  if (!clean || asks || clean.length > 180 || /p[aá]gina/i.test(clean)) return "O site profissional ficou pronto.";
  return clean;
}

export function draftSitePayload(message: string): { [key: string]: Json } {
  const text = message.replace(/\s+/g, " ").trim();
  const named = text.match(/(?:chamad[oa]|de nome)\s+([\p{Lu}][\p{L}\d]{1,24})/u);
  const kind = text.match(
    /(?:minha|meu|uma|um)\s+((?:loja|padaria|oficina|cl[ií]nica|restaurante|escola|sal[aã]o|farm[aá]cia|empresa|marca|neg[oó]cio)(?:\s+de\s+[\p{L}]+){0,2})/iu,
  );
  const rawName = named?.[1] || kind?.[1] || "O negócio";
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const place = placeOf(text);
  const about = place && !hasPlace(name, place) ? `${name} em ${place}.` : `${name}.`;
  return {
    name,
    copy: { hero: impactTitle(text), about, cta: "Falar no WhatsApp" },
    whatsappCta: "Falar no WhatsApp",
    sections: draftSections(text, name),
  };
}

function impactTitle(text: string): string {
  const t = text.toLowerCase();
  if (/roupa|moda|vestu|boutique/.test(t)) return "Roupa com presença.";
  if (/perfume|fragr/.test(t)) return "Uma assinatura que fica.";
  if (/sal[aã]o|cabelo|beleza|barbear/.test(t)) return "Cuidado com critério.";
  if (/cl[ií]nica|sa[uú]de|consult/.test(t)) return "Atendimento com clareza.";
  if (/padaria|p[aã]o|pastelaria/.test(t)) return "Pão fresco, todos os dias.";
  if (/restaurante|comida|caf[eé]/.test(t)) return "A mesa, feita com gosto.";
  if (/carro|viatura|autom/.test(t)) return "Escolhe com calma.";
  if (/escola|forma[cç]/.test(t)) return "Aprender com um plano.";
  return "Trabalho claro. Resultado visível.";
}

function draftSections(text: string, name: string): Section[] {
  const t = text.toLowerCase();
  if (/roupa|moda|vestu|boutique/.test(t)) {
    return [
      { heading: "A selecção", text: "Roupa para o dia a dia e para sair. Podes experimentar na loja antes de decidir." },
      { heading: "Na loja", text: "Os artigos estão organizados para veres o corte, o tecido e o que te fica bem." },
      { heading: "Como comprar", text: "Escreve pelo WhatsApp para saber o que está disponível. O número fica a indicar." },
    ];
  }
  if (/sal[aã]o|cabelo|beleza|barbear/.test(t)) {
    return [
      { heading: "O atendimento", text: `${name} recebe com hora marcada e um trabalho feito com calma.` },
      { heading: "O que pedes", text: "Cabelo, tratamento ou arranjo. Diz o serviço e o dia que te dá jeito." },
      { heading: "Marcar", text: "O WhatsApp fica a indicar. A resposta confirma a hora." },
    ];
  }
  if (/cl[ií]nica|sa[uú]de|consult/.test(t)) {
    return [
      { heading: "A consulta", text: `${name} explica o que se passa e o que fazer a seguir, em linguagem clara.` },
      { heading: "Antes de vir", text: "Traz o que já tens e diz o que te preocupa. O resto fica a indicar se ainda não souberes." },
      { heading: "Marcar", text: "Fala pelo WhatsApp. O número fica a indicar." },
    ];
  }
  if (/padaria|p[aã]o|pastelaria/.test(t)) {
    return [
      { heading: "O que sai do forno", text: "Pão e doces feitos no dia. O que estiver disponível confirma-se no momento." },
      { heading: "Encomenda", text: "Pede pelo WhatsApp se quiseres reservar. O número fica a indicar." },
      { heading: "A casa", text: `${name} serve quem quer pão fresco sem complicar.` },
    ];
  }
  if (/restaurante|comida/.test(t)) {
    return [
      { heading: "A mesa", text: `${name} cozinha para quem quer comer bem, sem pressa.` },
      { heading: "O prato", text: "O menu do dia confirma-se na casa." },
      { heading: "Reservar", text: "Escreve pelo WhatsApp. O número fica a indicar." },
    ];
  }
  return [
    { heading: "O que está incluído", text: `${name} diz o que faz, o prazo e o próximo passo.` },
    { heading: "Como começa", text: "Dizes o que precisas. Recebes uma resposta directa." },
    { heading: "Falar", text: "O WhatsApp fica a indicar." },
  ];
}

export function userWantsCustomImages(text: string): boolean {
  return /imagens?\s+personaliz|fotos?\s+personaliz|gera(?:r)?\s+(?:as\s+)?(?:fotos|imagens)|cria(?:r)?\s+(?:as\s+)?imagens/i.test(text);
}

export function userWantsSiteVideo(text: string): boolean {
  return /(?:com|quero|inclui(?:r)?|p[oõ]e|acrescenta)\s+(?:um\s+)?v[ií]deo/i.test(text);
}

export function userWantsPeople(text: string): boolean {
  return /com pessoas|com gente|modelo|retrato|\bhomem\b|\bmulher\b|senhor|senhora|foto de uma|foto de um/i.test(text);
}

export function siteHeroPrompt(message: string): string {
  const people = userWantsPeople(message)
    ? "One well-dressed Black professional in a clean studio or shop, only because the user asked for a person."
    : "Do not include any people, faces, hands or bodies.";
  const subject = message.replace(/\s+/g, " ").trim().slice(0, 280);
  return `Premium wide photo of the real business in this request, not a generic template and not another industry. No text, no logo, no watermark, no letters. ${people} Subject: ${subject}`;
}

const STUDIO_WOMAN = "photo-1758613654186-6ce234bf94ab";
const SUIT_WOMAN = "photo-1769764615012-c0dc97167695";
const STUDIO_MAN = "photo-1531384441138-2736e62e0919";
const PORTRAIT = "photo-1531123897727-8f129e1688ce";
const RACK = "photo-1558769132-cb1aea458c5e";
const HANGERS = "photo-1490481651871-ab68de25d43d";
const SALON = "photo-1560066984-138dadb4c035";
const TOOLS = "photo-1527799820374-dcf8d9d4a388";
const CLINIC = "photo-1519494026892-80bbd2d6fd0d";
const OFFICE = "photo-1497366216548-37526070297c";
const BREAD = "photo-1509440159596-0249088772ff";
const LOAF = "photo-1549931319-a545dcf3bc73";
const COUNTER = "photo-1517433670267-08bbd4be890f";
const GARAGE = "photo-1492144534655-ae79c964c9d7";
const ROAD = "photo-1503376780353-7e6692767b70";

function stockUrl(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;
}

type Section = { heading: string; text: string };

type SiteCopy = {
  name: string;
  title: string;
  about: string;
  cta: string;
  sections: Section[];
};

function stockIds(message: string): string[] {
  const t = message.toLowerCase();
  const men = /\bhomens?\b|masculin/.test(t);
  const women = /mulher|senhoras?|feminin/.test(t);
  if (/perfume|perfumaria|fragr/.test(t)) return [PORTRAIT, SUIT_WOMAN, STUDIO_WOMAN];
  if (/carro|autom|viatura|stand\b/.test(t)) return [GARAGE, ROAD, OFFICE];
  if (/padaria|p[aã]o|pastelaria|restaurante|comida|caf[eé]/.test(t)) return [COUNTER, BREAD, LOAF];
  if (/sal[aã]o|cabelo|beleza|barbear/.test(t)) return [SALON, TOOLS, PORTRAIT];
  if (/cl[ií]nica|m[eé]dic|sa[uú]de|consult/.test(t)) return [CLINIC, SUIT_WOMAN, OFFICE];
  if (/roupa|moda|vestu|boutique|cabide/.test(t)) return men && !women ? [STUDIO_MAN, RACK, HANGERS] : [STUDIO_WOMAN, PORTRAIT, RACK];
  if (/loja/.test(t)) return [RACK, STUDIO_WOMAN, HANGERS];
  return [SUIT_WOMAN, OFFICE, STUDIO_MAN];
}

export function stockImages(message: string): string[] {
  return [...new Set(stockIds(message))].map(stockUrl);
}

export function siteShots(message: string): { prompt: string; alt: string }[] {
  const subject = message.replace(/\s+/g, " ").trim().slice(0, 240);
  const rule =
    "Photorealistic picture of a Black professional, well dressed, inside a clean shop or photo studio. Not outdoors, not a street, not a sidewalk. No white people. No text, no logo, no watermark, no empty frame.";
  const shots = [
    {
      alt: "Hero do site",
      prompt: `Wide shot with the place visible around the subject. Not a close-up and not cropped tight. ${rule} Subject: ${subject}`,
    },
  ];
  if (/loja|produto|cat[aá]logo|roupa|perfume|carro|servi[cç]o|card[aá]pio|menu|pe[cç]a/i.test(message)) {
    shots.push(
      {
        alt: "Produto 1",
        prompt: `One real item from this business, recognizable, with a little space around it. ${rule} Subject: ${subject}`,
      },
      {
        alt: "Produto 2",
        prompt: `A different real item from the same business, recognizable, with a little space around it. ${rule} Subject: ${subject}`,
      },
      {
        alt: "Produto 3",
        prompt: `Another different real item or the service being done, recognizable. ${rule} Subject: ${subject}`,
      },
    );
  }
  return shots;
}

export function siteVideoPrompt(message: string): string {
  const subject = message.replace(/\s+/g, " ").trim().slice(0, 240);
  return `Wide 6 second shot inside a clean shop or studio. The person or the product stays in frame, not cropped tight. Not a sidewalk and not a street. No text, no logo. Subject: ${subject}`;
}

type Palette = { bg: string; fg: string; muted: string; accent: string; on: string };

const NEUTRAL: Palette = { bg: "#f6f4f1", fg: "#1f1a17", muted: "#5c534c", accent: "#1f1a17", on: "#ffffff" };

export function paletteFrom(text: string): Palette {
  const t = text.toLowerCase();
  const dark = /preto|escuro|negro/.test(t);
  const gold = /dourad|ouro/.test(t);
  const blue = /azul/.test(t);
  const green = /verde/.test(t);
  const red = /vermelh|borgonh/.test(t);
  if (dark && gold) return { bg: "#16130f", fg: "#f7f1e6", muted: "#d9cbb6", accent: "#d4b07a", on: "#1a140c" };
  if (dark && blue) return { bg: "#101820", fg: "#f4f7fb", muted: "#c5d0dc", accent: "#7eb6e6", on: "#101820" };
  if (dark) return { bg: "#161616", fg: "#f5f5f5", muted: "#c8c8c8", accent: "#f5f5f5", on: "#161616" };
  if (blue) return { bg: "#f4f7fb", fg: "#142033", muted: "#4d5d73", accent: "#1d4e89", on: "#ffffff" };
  if (green) return { bg: "#f3f7f2", fg: "#17241b", muted: "#4e6254", accent: "#1f6b45", on: "#ffffff" };
  if (red) return { bg: "#fbf6f4", fg: "#2a1614", muted: "#6b4c48", accent: "#8d2f2f", on: "#ffffff" };
  if (gold) return { bg: "#fbf7f0", fg: "#2a2118", muted: "#6d5c49", accent: "#8a6a32", on: "#ffffff" };
  return NEUTRAL;
}

function plain(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\u2014/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function chunks(html: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const text = plain(match[1]);
    if (text) out.push(text);
  }
  return out;
}

function placeOf(text: string): string {
  const places = ["Talatona", "Luanda", "Benguela", "Lubango", "Huambo", "Cabinda", "Kilamba", "Viana", "Lobito", "Malanje"];
  return places.find((place) => new RegExp(place, "i").test(text)) ?? "";
}

function hasPlace(text: string, place: string): boolean {
  return Boolean(place) && new RegExp(place, "i").test(text);
}

function angolan(text: string): string {
  return text
    .replace(/\u2014/g, "-")
    .replace(/\bpeças\b/gi, (word) => (word[0] === "P" ? "Artigos" : "artigos"))
    .replace(/\bpeça\b/gi, (word) => (word[0] === "P" ? "Artigo" : "artigo"))
    .replace(/\bartigos novas\b/gi, "artigos novos")
    .replace(/\bartigo nova\b/gi, "artigo novo")
    .replace(/\bprova na loja\b/gi, "experimentar na loja")
    .replace(/\bprovar\b/gi, "experimentar")
    .replace(/\bprova\b/gi, "experimentar");
}

function footerLine(name: string, place: string, already: boolean): string {
  if (!place || already || hasPlace(name, place)) return name;
  return `${name} - ${place}`;
}

function phoneOf(text: string): string {
  const match = text.match(/(?:\+?\s*244[\s-]?)?(9\d{2})[\s.-]?(\d{3})[\s.-]?(\d{3})/);
  return match ? `+244 ${match[1]} ${match[2]} ${match[3]}` : "";
}

function waHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#contacto";
}

function readSections(value: Json | undefined): Section[] {
  if (!Array.isArray(value)) return [];
  const out: Section[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      out.push({ heading: angolan(item.trim()), text: "" });
      continue;
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as { [key: string]: Json };
    const heading = typeof row.heading === "string" ? row.heading : typeof row.title === "string" ? row.title : "";
    const text = typeof row.text === "string" ? row.text : typeof row.body === "string" ? row.body : "";
    if (heading.trim() || text.trim()) out.push({ heading: angolan(heading.trim()), text: angolan(text.trim()) });
  }
  return out.filter((section) => section.heading || section.text).slice(0, 6);
}

function contentFromHtml(html: string): SiteCopy {
  const name = chunks(html, "title")[0] || chunks(html, "h1")[0] || "";
  const title = chunks(html, "h1")[0] || name;
  const about = chunks(html, "p").find((item) => item.length > 12 && !/^whatsapp:/i.test(item)) ?? "";
  const parts = html.split(/<h2\b[^>]*>/i).slice(1);
  const sections: Section[] = [];
  for (const part of parts) {
    const heading = plain(part.split(/<\/h2>/i)[0] || "");
    if (/^contacto$/i.test(heading)) continue;
    const text = [...chunks(part, "p"), ...chunks(part, "li")]
      .filter((line) => line && !/^whatsapp:/i.test(line))
      .join(" ");
    if (!heading && !text) continue;
    sections.push({ heading: angolan(heading), text: angolan(text) });
  }
  return { name: angolan(name), title: angolan(title), about: angolan(about), cta: "", sections: sections.slice(0, 6) };
}

function contentFromPayload(payload: { [key: string]: Json }): SiteCopy {
  const raw = typeof payload.raw === "string" ? payload.raw : "";
  const copy = asRecord(payload.copy);
  const name = (typeof payload.name === "string" && payload.name.trim()) || readField(raw, "name") || "";
  const title = (typeof copy.hero === "string" && copy.hero.trim()) || readField(raw, "hero") || "";
  const about = (typeof copy.about === "string" && copy.about.trim()) || readField(raw, "about") || "";
  const cta =
    (typeof copy.cta === "string" && copy.cta.trim()) ||
    (typeof payload.whatsappCta === "string" && payload.whatsappCta.trim()) ||
    readField(raw, "cta") ||
    readField(raw, "whatsappCta") ||
    "";
  return {
    name: angolan(name),
    title: angolan(title),
    about: angolan(about),
    cta: angolan(cta),
    sections: readSections(payload.sections),
  };
}

function mergeCopy(primary: SiteCopy, fallback: SiteCopy): SiteCopy {
  return {
    name: primary.name || fallback.name,
    title: primary.title || fallback.title,
    about: primary.about || fallback.about,
    cta: primary.cta || fallback.cta,
    sections: primary.sections.length ? primary.sections : fallback.sections,
  };
}

function withoutPlace(text: string, place: string): string {
  if (!place) return text;
  return text
    .replace(new RegExp(`\\s*[-,]?\\s*\\b${place}\\b`, "gi"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupePlace(copy: SiteCopy, place: string): SiteCopy {
  if (!place) return copy;
  let used = false;
  const take = (text: string) => {
    if (!hasPlace(text, place)) return text;
    if (!used) {
      used = true;
      return text;
    }
    return withoutPlace(text, place);
  };
  return {
    name: take(copy.name),
    title: take(copy.title),
    about: take(copy.about),
    cta: copy.cta,
    sections: copy.sections.map((section) => ({ heading: take(section.heading), text: take(section.text) })),
  };
}

function usableName(name: string, title: string): string {
  const candidate = name.trim() || title.trim();
  if (!candidate || /^(loja|p[aá]gina|site|landing|a loja)$/i.test(candidate)) return "A loja";
  return candidate;
}

function renderSite(copy: SiteCopy, ask: string, images: string[], video?: string): string {
  const place = placeOf(`${ask} ${copy.name} ${copy.title} ${copy.about} ${copy.sections.map((section) => `${section.heading} ${section.text}`).join(" ")}`);
  const named = usableName(copy.name, copy.title);
  const clean = dedupePlace(
    {
      name: angolan(named),
      title: angolan(copy.title.trim() || named),
      about: angolan(copy.about.trim()),
      cta: angolan(copy.cta.trim() || "Falar no WhatsApp"),
      sections: copy.sections
        .slice(0, 6)
        .map((section) => ({ heading: angolan(section.heading.trim()), text: angolan(section.text.trim()) }))
        .filter((section) => section.heading || section.text),
    },
    place,
  );
  const already =
    hasPlace(clean.name, place) ||
    hasPlace(clean.title, place) ||
    hasPlace(clean.about, place) ||
    clean.sections.some((section) => hasPlace(section.heading, place) || hasPlace(section.text, place));
  const footer = footerLine(clean.name, place, already);
  const phone = phoneOf(`${ask} ${clean.about}`);
  const colors = userAskedColors(ask);
  const dark = colors && /preto|escuro|negro|noite/.test(ask.toLowerCase());
  const gold = colors && dark && /dourad|ouro/.test(ask.toLowerCase());
  const template = resolveSiteTemplate(ask);
  const bg = dark ? (gold ? "#16130f" : "#161616") : "#f6f3ee";
  const fg = dark ? "#f7f1e6" : "#1c1917";
  const muted = dark ? "#d9cbb6" : "#57534e";
  const accent = gold ? "#d4b07a" : template === "entregas" ? "#1f8a4c" : "#1c1917";
  const given = images.filter(Boolean);
  const library = given.length ? given : stockImages(`${ask} ${clean.name} ${clean.title}`);
  const heroShot = library[0];
  const photos = given.length ? given.slice(1, 4) : library.slice(1, 4);
  let html = renderTemplate({
    template,
    name: clean.name,
    title: clean.title,
    about: clean.about,
    cta: clean.cta,
    phone,
    footer,
    sections: clean.sections,
    hero: heroShot,
    photos,
    bg,
    fg,
    muted,
    accent,
    onAccent: gold ? "#1c1917" : "#ffffff",
  });
  if (video) {
    html = html.replace(
      `<img src="${esc(heroShot)}" alt="">`,
      `<video src="${esc(video)}" poster="${esc(heroShot)}" autoplay muted loop playsinline></video>`,
    );
  }
  return html;
}

export function landingHtml(input: { name: string; hero: string; about: string; cta: string; ask?: string }): string {
  return renderSite(
    {
      name: input.name.trim() || "A loja",
      title: input.hero.trim(),
      about: input.about.trim(),
      cta: input.cta.trim() || "Falar no WhatsApp",
      sections: [],
    },
    input.ask ?? "",
    [],
  );
}

function asRecord(value: unknown): { [key: string]: Json } {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as { [key: string]: Json }) : {};
}

export function htmlReady(html: string): boolean {
  return /<html[\s>]/i.test(html) && /<\/html>/i.test(html) && !html.trim().endsWith("html:");
}

export function ensureWebsitePayload(payload: { [key: string]: Json }): { [key: string]: Json } {
  const current = typeof payload.html === "string" ? payload.html : "";
  if (htmlReady(current)) return payload;
  const merged = mergeCopy(contentFromPayload(payload), contentFromHtml(current));
  const name = merged.name || "Site";
  const cta = merged.cta || "Falar no WhatsApp";
  const raw = typeof payload.raw === "string" ? payload.raw : "";
  return {
    ...payload,
    name,
    copy: { hero: merged.title || name, cta, about: merged.about },
    sections: merged.sections,
    html: renderSite({ ...merged, name, cta }, `${raw} ${merged.about}`, []),
  };
}

export function styleWebsite(
  html: string,
  ask: string,
  media: { image?: string; video?: string; images?: string[] } = {},
  payload?: { [key: string]: Json },
): string {
  const given = [...(media.images ?? []), media.image ?? ""].map((item) => item.trim()).filter(Boolean);
  const fromPayload = payload ? contentFromPayload(payload) : { name: "", title: "", about: "", cta: "", sections: [] };
  const merged = mergeCopy(fromPayload, contentFromHtml(html));
  return renderSite(merged, ask, [...new Set(given)], media.video?.trim() || undefined);
}
