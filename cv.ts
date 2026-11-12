import type { Json } from "./types.ts";
import { escapeHtml } from "../utils.ts";

export type CvStyle = "classico" | "barra" | "claro";

export const CV_STYLES: { id: CvStyle; label: string }[] = [
  { id: "classico", label: "Clássico Limpo" },
  { id: "barra", label: "Moderno com Barra Lateral" },
  { id: "claro", label: "Moderno Claro" },
];

const BLANK = /^a indicar$/i;

function given(value: string): string {
  const cleanValue = value.trim();
  if (!cleanValue || BLANK.test(cleanValue)) return "";
  return cleanValue;
}

export type CvJob = { title: string; org: string; dates: string; bullets: string[] };

export type CvData = {
  name: string;
  role: string;
  profile: string;
  email: string;
  phone: string;
  location: string;
  photo: string;
  experience: CvJob[];
  projects: CvJob[];
  skills: string[];
  education: string[];
  coverLetter: string;
  interview: string[];
  gaps: string[];
};

function clean(value: string): string {
  return value
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/[★☆✦✧✓✔✕✖•●◦▪→]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function text(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (/^data:image\//i.test(trimmed)) return trimmed;
  return clean(trimmed);
}

function obj(value: unknown): { [key: string]: Json } {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as { [key: string]: Json }) : {};
}

function safePhoto(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) return value;
  return "";
}

function jobs(value: unknown): CvJob[] {
  if (!Array.isArray(value)) {
    const single = text(value);
    return single && !BLANK.test(single) ? [{ title: single, org: "", dates: "", bullets: [] }] : [];
  }
  return value
    .map((item) => {
      if (typeof item === "string") {
        const title = given(text(item));
        return title ? { title, org: "", dates: "", bullets: [] } : null;
      }
      const row = obj(item);
      const title = given(text(row.title) || text(row.name) || text(row.role));
      const org = given(text(row.org) || text(row.company) || text(row.empresa));
      const dates = given(text(row.dates) || text(row.date) || text(row.periodo));
      const bullets = (Array.isArray(row.bullets) ? row.bullets : [])
        .map((bullet) => given(text(bullet)))
        .filter(Boolean);
      const note = given(text(row.descricao) || text(row.description) || text(row.resumo));
      if (note && !bullets.includes(note)) bullets.push(note);
      if (!title && !org && !dates && bullets.length === 0) return null;
      return {
        title: title || org,
        org: title ? org : "",
        dates,
        bullets,
      };
    })
    .filter((item): item is CvJob => item !== null);
}

function lines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return given(text(item));
        const row = obj(item);
        return [given(text(row.title) || text(row.name) || text(row.degree)), given(text(row.org) || text(row.school)), given(text(row.dates))]
          .filter(Boolean)
          .join(", ");
      })
      .filter(Boolean);
  }
  const single = text(value);
  return single && !BLANK.test(single) ? [single] : [];
}

function keptJobs(value: unknown): CvJob[] {
  return jobs(value);
}

export function skipGeneratedCvImage(power: string | null | undefined, message: string): boolean {
  const aboutCv = power === "emprego" || /\bcv\b|curr[ií]culo|candidatura/i.test(message);
  if (!aboutCv) return false;
  return !/logo|cartaz|instagram|campanha|conceito visual/i.test(message);
}

export function attachCvPhoto(payload: { [key: string]: Json }, dataUrl: string | undefined): boolean {
  if (!dataUrl || !/^data:image\/[a-z0-9.+-]+;base64,/i.test(dataUrl)) return false;
  payload.photo = dataUrl;
  return true;
}

export function resolveCvStyle(value: unknown): CvStyle {
  const raw = text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!raw) return "classico";
  if (raw.includes("barra") || raw.includes("lateral") || raw.includes("sidebar")) return "barra";
  if (raw.includes("claro") || raw.includes("bege") || raw === "moderno") return "claro";
  return "classico";
}

function looseText(payload: { [key: string]: Json }): string {
  const raw = [payload.raw, payload.body, payload.text, payload.content, payload.markdown]
    .map((item) => text(item))
    .find((item) => item && !/^data:image\//i.test(item)) ?? "";
  if (!raw) return "";
  if (raw.startsWith("{") || raw.startsWith("[")) {
    const bits = [...raw.matchAll(/"[^"]+"\s*:\s*"((?:\\.|[^"\\])*)"/g)]
      .map((match) => match[1]?.replace(/\\n/g, "\n").replace(/\\"/g, '"').trim() ?? "")
      .filter((item) => item && !/^data:image\//i.test(item) && !BLANK.test(item) && item.length < 500);
    if (bits.length) return [...new Set(bits)].join("\n").slice(0, 4000);
    return "";
  }
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
}

function nameFromTitle(title: string): string {
  const clean = given(title).replace(/^cv\b[\s·:|-]*/i, "").trim();
  if (!clean || clean.split(/\s+/).length < 2 || clean.length > 80) return "";
  return clean;
}

export function readCv(payload: { [key: string]: Json }, title = ""): CvData {
  const nested = obj(payload.dados ?? payload.cv ?? payload.data);
  const src = { ...nested, ...payload };
  const contacts = obj(src.contacts ?? src.contacto ?? src.contact);
  const skills = lines(src.skills ?? src.competencias ?? src.habilidades);
  const education = lines(src.education ?? src.formacao ?? src.educacao);
  const experience = keptJobs(src.experience ?? src.experiencia ?? src.experiencias ?? src.historico ?? src.empregos);
  const projects = keptJobs(src.projects ?? src.projectos ?? src.project ?? src.projecto);
  const profile = given(text(src.profile) || text(src.resumo) || text(src.sobre));
  const filled = Boolean(profile || experience.length || education.length || skills.length);
  return {
    name: given(text(src.name) || text(src.nome)) || nameFromTitle(title),
    role: given(text(src.role) || text(src.cargo) || text(src.funcao)),
    profile: profile || (filled ? "" : looseText(src)),
    email: given(text(src.email) || text(contacts.email)),
    phone: given(text(src.phone) || text(src.telefone) || text(src.telemovel) || text(contacts.phone) || text(contacts.telefone)),
    location: given(text(src.location) || text(src.localizacao) || text(src.cidade) || text(contacts.location) || text(contacts.localizacao)),
    photo: safePhoto(text(src.photo) || text(src.foto)),
    experience,
    projects,
    skills: skills.filter((item) => !BLANK.test(item)),
    education: education.filter((item) => !BLANK.test(item)),
    coverLetter: given(text(src.coverLetter) || text(src.carta)),
    interview: lines(src.interviewAngles ?? src.entrevista),
    gaps: lines(src.gaps ?? src.faltas),
  };
}

export function hydrateCvPayload(payload: { [key: string]: Json }, title: string, message: string): void {
  const data = readCv(payload, title);
  if (!given(text(payload.name) || text(payload.nome)) && data.name) payload.name = data.name;
  const filled = Boolean(
    data.profile || data.role || data.email || data.phone || data.experience.length || data.education.length || data.skills.length,
  );
  if (filled) return;
  const note = message.replace(/\s+/g, " ").trim();
  if (note.length < 12) return;
  payload.profile = note.slice(0, 4000);
}

function styleLabel(style: CvStyle): string {
  return CV_STYLES.find((item) => item.id === style)?.label ?? "Clássico Limpo";
}

function jobBlock(job: CvJob): string {
  const bits = [job.org, job.dates].filter(Boolean);
  const meta = bits.length ? `<p class="meta">${escapeHtml(bits.join(" · "))}</p>` : "";
  const bullets = job.bullets.length
    ? `<ul>${job.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`
    : "";
  return `<article class="item"><h3>${escapeHtml(job.title)}</h3>${meta}${bullets}</article>`;
}

function section(title: string, inner: string): string {
  if (!inner.trim()) return "";
  return `<section class="block"><h2>${escapeHtml(title)}</h2>${inner}</section>`;
}

function contactBits(data: CvData): string[] {
  return [data.email, data.phone, data.location].filter(Boolean);
}

function contactList(data: CvData): string {
  const bits = contactBits(data);
  if (!bits.length) return "";
  const rows = [
    data.email ? `<li>${icon("mail")}<span>${escapeHtml(data.email)}</span></li>` : "",
    data.phone ? `<li>${icon("phone")}<span>${escapeHtml(data.phone)}</span></li>` : "",
    data.location ? `<li>${icon("pin")}<span>${escapeHtml(data.location)}</span></li>` : "",
  ].filter(Boolean);
  return `<ul class="contacts">${rows.join("")}</ul>`;
}

function icon(kind: "mail" | "phone" | "pin"): string {
  const paths = {
    mail: "M3 6h18v12H3V6zm0 0 9 7 9-7",
    phone: "M7 3h4l1 4-2 1a12 12 0 0 0 6 6l1-2 4 1v4c0 1-1 2-2 2C10 19 5 14 5 5c0-1 1-2 2-2z",
    pin: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  };
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[kind]}"/></svg>`;
}

function photo(data: CvData): string {
  if (!data.photo) return "";
  return `<span class="avatar"><img src="${escapeHtml(data.photo)}" alt=""/></span>`;
}

function extra(data: CvData): string {
  const parts = [
    data.coverLetter ? section("Carta", `<p>${escapeHtml(data.coverLetter)}</p>`) : "",
    data.interview.length ? section("Entrevista", `<ul>${data.interview.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`) : "",
    data.gaps.length ? section("O que falta", `<p>${escapeHtml(data.gaps.join(" · "))}</p>`) : "",
  ].filter(Boolean);
  return parts.length ? `<div class="extra">${parts.join("")}</div>` : "";
}

function sheet(style: CvStyle, data: CvData): string {
  const experience = data.experience.map(jobBlock).join("");
  const projects = data.projects.map(jobBlock).join("");
  const skills = data.skills.length
    ? `<ul class="tags">${data.skills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join("")}</ul>`
    : "";
  const education = data.education.length
    ? `<ul>${data.education.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  const profile = data.profile ? `<p>${escapeHtml(data.profile)}</p>` : "";
  const lead = data.profile ? `<p class="lead">${escapeHtml(data.profile)}</p>` : "";
  const contacts = contactBits(data).join(" · ");
  if (style === "barra") {
    return `<div class="sheet barra">
      <aside>
        ${photo(data)}
        <p class="side-name">${escapeHtml(data.name)}</p>
        ${data.role ? `<p class="side-role">${escapeHtml(data.role)}</p>` : ""}
        ${contactList(data)}
        ${section("Competências", skills)}
      </aside>
      <main>
        ${section("Perfil", profile)}
        ${section("Experiência", experience)}
        ${section("Projecto", projects)}
        ${section("Formação", education)}
      </main>
    </div>${extra(data)}`;
  }
  if (style === "claro") {
    return `<div class="sheet claro">
      <header>
        <div>
          ${data.location ? `<p class="kicker">${icon("pin")}<span>${escapeHtml(data.location)}</span></p>` : ""}
          <h1>${escapeHtml(data.name)}</h1>
          ${data.role ? `<p class="role">${escapeHtml(data.role)}</p>` : ""}
          ${contactList(data)}
        </div>
        ${photo(data)}
      </header>
      ${lead}
      <div class="cols">
        <div>
          ${section("Experiência", experience)}
          ${section("Projecto", projects)}
        </div>
        <div>
          ${section("Competências", skills)}
          ${section("Formação", education)}
        </div>
      </div>
    </div>${extra(data)}`;
  }
  return `<div class="sheet classico">
    <header>
      <div>
        <h1>${escapeHtml(data.name)}</h1>
        ${data.role ? `<p class="role">${escapeHtml(data.role)}</p>` : ""}
        ${contacts ? `<p class="line">${escapeHtml(contacts)}</p>` : ""}
      </div>
      ${photo(data)}
    </header>
    ${lead}
    ${section("Experiência", experience)}
    ${section("Projecto", projects)}
    ${section("Competências", data.skills.length ? `<p class="skills">${escapeHtml(data.skills.join(" · "))}</p>` : "")}
    ${section("Formação", education)}
  </div>${extra(data)}`;
}

const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; color: #1c1915; line-height: 1.35; }
  h1, h2, h3, p, ul { margin: 0; }
  ul { padding-left: 1rem; }
  li { margin: 0.12rem 0; }
  .ico { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.7; flex: none; }
  .contacts { list-style: none; padding: 0; }
  .contacts li { display: flex; gap: 8px; align-items: center; margin: 4px 0; }
  .avatar { width: 92px; height: 92px; border-radius: 50%; overflow: hidden; display: block; flex: none; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
  .item { margin-top: 6px; }
  .item h3 { font-size: 16px; }
  .meta { font-size: 12px; margin-top: 2px; }
  .tags { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; padding: 0; }
  .tags li { margin: 0; border-radius: 999px; padding: 4px 10px; font-size: 13px; }
  .extra { max-width: 860px; margin: 8px auto 16px; padding: 0 28px 16px; }
  .sheet.classico { max-width: 800px; margin: 0 auto; padding: 18px 22px 16px; background: #fff; font-family: Palatino, "Palatino Linotype", Georgia, serif; }
  .classico header, .claro header { display: flex; justify-content: space-between; align-items: center; gap: 18px; }
  .classico h1 { font-size: 32px; font-weight: 500; letter-spacing: 0.02em; }
  .classico .role { margin-top: 4px; font-family: "Segoe UI", sans-serif; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #7a6240; }
  .classico .line { margin-top: 8px; padding-top: 8px; border-top: 1px solid #c6a15b; font-family: "Segoe UI", sans-serif; font-size: 13px; }
  .classico .lead { margin-top: 8px; }
  .classico h2 { margin-top: 10px; padding-bottom: 3px; border-bottom: 1px solid #c6a15b; font-family: "Segoe UI", sans-serif; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; }
  .classico .skills { margin-top: 6px; font-family: "Segoe UI", sans-serif; }
  .sheet.barra { display: flex; max-width: 920px; margin: 0 auto; background: #fff; font-family: "Segoe UI", sans-serif; }
  .barra aside { width: 34%; background: #16324f; color: #f5f7fa; padding: 16px 14px; }
  .barra .avatar { margin: 0 auto; border: 2px solid #d4b36a; }
  .barra .side-name { margin-top: 8px; font-size: 22px; line-height: 1.15; text-align: center; }
  .barra .side-role { margin-top: 2px; color: #d4b36a; font-size: 13px; text-align: center; }
  .barra .contacts { margin-top: 10px; font-size: 13px; }
  .barra h2 { margin-top: 10px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #d4b36a; }
  .barra .tags li { background: rgba(255,255,255,0.1); }
  .barra main { width: 66%; padding: 16px 18px 14px; }
  .barra main h2 { margin-top: 10px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #16324f; border-bottom: 1px solid #d5dde6; padding-bottom: 3px; }
  .barra main .block:first-child h2 { margin-top: 0; }
  .barra .meta { color: #5d6b7a; }
  .sheet.claro { max-width: 880px; margin: 0 auto; padding: 18px 22px 16px; background: #f6f1e8; color: #241f18; font-family: "Segoe UI", sans-serif; }
  .claro header { display: flex; justify-content: space-between; align-items: center; gap: 18px; }
  .claro .kicker { display: flex; gap: 6px; align-items: center; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; }
  .claro h1 { margin-top: 4px; font-size: 32px; font-weight: 650; }
  .claro .role { margin-top: 2px; }
  .claro .contacts { font-size: 14px; }
  .claro .lead { margin: 8px 0 2px; }
  .claro .cols { display: block; }
  .claro h2 { display: flex; gap: 8px; align-items: center; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; }
  .claro .block { margin-top: 8px; }
  .claro .tags li { background: #fff; }
  .claro .item { background: rgba(255,255,255,0.55); border-radius: 12px; padding: 8px 10px; }
  @media (max-width: 720px) {
    .sheet.classico, .sheet.claro { padding: 16px 14px; }
    .sheet.barra { flex-direction: column; }
    .barra aside, .barra main { width: 100%; }
    .claro header, .claro .cols { display: block; }
  }
  @media print {
    body { background: #fff; }
    .sheet.barra aside, .sheet.claro { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  .pdf .sheet.barra { display: table; width: 794px; }
  .pdf .sheet.barra > aside, .pdf .sheet.barra > main { display: table-cell; vertical-align: top; }
  .pdf .sheet.barra > aside { width: 270px; }
  .pdf .sheet.classico, .pdf .sheet.claro { width: 794px; }
  .pdf .claro .cols { display: block; }
`;

export function cvPdfName(title: string): string {
  const base = title
    .replace(/\u2014/g, "-")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "cv"}.pdf`;
}

export function cvPdfSource(html: string): string {
  if (html.includes("<body class=\"pdf\">")) return html;
  return html.replace("<body>", "<body class=\"pdf\">");
}

export function cvDocument(data: CvData, style: CvStyle): string {
  const bg = style === "claro" ? "#f6f1e8" : style === "barra" ? "#e8eef3" : "#fff";
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(data.name || "CV")}</title>
<style>body{background:${bg}}${CSS}</style>
</head>
<body>
${sheet(style, data)}
</body>
</html>`;
}

export function cvPlainText(data: CvData, style: CvStyle): string {
  const jobText = (job: CvJob) =>
    [job.title, [job.org, job.dates].filter(Boolean).join(" · "), ...job.bullets.map((bullet) => `- ${bullet}`)]
      .filter(Boolean)
      .join("\n");
  const contacts = [data.email, data.phone, data.location].filter(Boolean).join(" · ");
  return [
    `CV · ${styleLabel(style)}`,
    data.name,
    data.role,
    contacts,
    data.profile,
    data.experience.length ? `Experiência\n${data.experience.map(jobText).join("\n")}` : "",
    data.projects.length ? `Projecto\n${data.projects.map(jobText).join("\n")}` : "",
    data.skills.length ? `Competências: ${data.skills.join(", ")}` : "",
    data.education.length ? `Formação: ${data.education.join(", ")}` : "",
    data.coverLetter ? `Carta\n${data.coverLetter}` : "",
    data.interview.length ? `Entrevista\n${data.interview.map((item) => `- ${item}`).join("\n")}` : "",
    data.gaps.length ? `O que falta: ${data.gaps.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/\u2014/g, "-");
}
