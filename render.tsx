import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Download, Play, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/md";
import type { Artifact, ArtifactType, Json, LibraryItem } from "@/lib/pilili/types";
import { downloadBlob, downloadHtml, escapeHtml, formatKz, printHtml } from "@/lib/utils";
import { downloadDocumentPdf, downloadDocumentWord, htmlToPlain, imageSources, whatsappText } from "@/lib/client/doc-files";
import { cvDocument, cvPlainText, CV_STYLES, readCv, resolveCvStyle, type CvStyle } from "@/lib/pilili/cv";
import { downloadCvPdf } from "@/lib/client/cv-pdf";
import { groupChecklist, plainChecklist, splitBlocks } from "@/lib/pilili/artifact-text";
import { withoutLongDash } from "@/lib/pilili/format-answer";
import { MediaSketch } from "@/components/chat/MediaSketch";
import { parseTaskList, taskProgress } from "@/lib/pilili/tasks";
import { getVideoStatus, saveChecklistProgress, fetchVideoFile, publishToNetlify, getLibraryMedia } from "@/lib/server/functions";
import { useQueryClient } from "@tanstack/react-query";

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asObj(v: unknown): { [key: string]: Json } {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as { [key: string]: Json }) : {};
}
function asStrList(v: unknown): string[] {
  return asArr(v).map((x) => (typeof x === "string" ? x : String(x ?? "")));
}
function kz(v: unknown): string {
  const n = Number(v);
  if (Number.isFinite(n) && n !== 0) return formatKz(n);
  return asString(v);
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
  "proposal",
  "presentation",
]);

export function artifactFromLibrary(item: LibraryItem): Artifact {
  if ((item.kind === "vida_plan" || item.kind === "executar_plan") && item.body) {
    const parsed = parseTaskList(item.body);
    if (parsed) {
      return {
        id: item.id,
        type: "checklist",
        title: item.title,
        payload: {
          title: parsed.title,
          items: parsed.tasks.map((task) => ({ text: task.text, done: task.done })),
        },
      };
    }
  }
  const type = ARTIFACT_TYPES.has(item.kind) ? (item.kind as ArtifactType) : "note";
  let payload: { [key: string]: Json } = {};
  const body = item.body;
  if (body) {
    if (body.startsWith("data:image") || /^https?:\/\//i.test(body)) {
      payload = { url: body, alt: item.title };
    } else {
      try {
        const parsed = JSON.parse(body) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          payload = parsed as { [key: string]: Json };
        } else if (typeof parsed === "string") {
          payload = { body: parsed };
        } else {
          payload = { body };
        }
      } catch {
        payload = { body };
      }
    }
  }
  if (item.imageUrl && !payload.url) payload.url = item.imageUrl;
  return { id: item.id, type, title: item.title, payload };
}

function Card({
  title,
  kicker,
  children,
  onDownload,
  downloadLabel,
  text,
  html,
  images,
  printBlocked,
  printable = true,
  office = true,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
  onDownload?: () => void;
  downloadLabel?: string;
  text?: string;
  html?: string;
  images?: string[];
  printBlocked?: string;
  printable?: boolean;
  office?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [waCopied, setWaCopied] = useState(false);
  const [printNote, setPrintNote] = useState("");
  const plain = (text?.trim() || (html ? htmlToPlain(html) : "")).trim();
  const officeOn = office && plain.length > 0;

  async function copy(value: string, mark: (ok: boolean) => void) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      ok = document.execCommand("copy");
      el.remove();
    }
    mark(ok);
    if (ok) window.setTimeout(() => mark(false), 1600);
  }

  async function savePdf() {
    setPrintNote("A preparar o PDF...");
    const result = await downloadDocumentPdf(title, plain, html || "", imageSources(html, images));
    setPrintNote(result === "pdf" ? "" : "Não foi possível criar o PDF neste aparelho. Abri a impressão para guardares como PDF.");
  }

  async function saveWord() {
    setPrintNote("A preparar o Word...");
    try {
      await downloadDocumentWord(title, plain, imageSources(html, images));
      setPrintNote("");
    } catch {
      setPrintNote("Não consegui criar o Word neste aparelho.");
    }
  }

  return (
    <section className="mt-3 overflow-hidden rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {kicker ? <p className="text-[11px] uppercase tracking-[0.16em] text-gold">{kicker}</p> : null}
          <h3 className="break-words font-display text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {plain ? (
            <Button variant="ghost" size="icon" className="size-11" onClick={() => void copy(plain, setCopied)} aria-label={copied ? "Copiado" : "Copiar"} title={copied ? "Copiado" : "Copiar"}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          ) : null}
          {officeOn ? (
            <Button variant="ghost" size="icon" className="size-11" onClick={() => void savePdf()} aria-label="Descarregar PDF" title="Descarregar PDF">
              <Download className="size-4" />
            </Button>
          ) : onDownload ? (
            <Button variant="ghost" size="icon" className="size-11" onClick={onDownload} aria-label={downloadLabel ?? "Descarregar"} title={downloadLabel ?? "Descarregar"}>
              <Download className="size-4" />
            </Button>
          ) : null}
          {printable ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            onClick={() => {
              if (!html) {
                window.print();
                return;
              }
              const result = printHtml(title, html);
              setPrintNote(result === "printed" ? "" : (printBlocked ?? "A janela de impressão foi bloqueada. Descarrega o PDF e imprime a partir daí."));
            }}
            aria-label="Imprimir este resultado"
            title="Imprimir"
          >
            <Printer className="size-4" />
          </Button>
          ) : null}
        </div>
      </header>
      {officeOn ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-full bg-elevated px-3 text-sm" onClick={() => void saveWord()}>
            Descarregar Word
          </button>
          <button type="button" className="min-h-11 rounded-full bg-elevated px-3 text-sm" onClick={() => void copy(whatsappText(title, plain), setWaCopied)}>
            {waCopied ? "Copiado" : "Copiar para WhatsApp"}
          </button>
        </div>
      ) : null}
      {printNote ? <p className="mb-3 text-xs text-subtle">{printNote}</p> : null}
      {children}
    </section>
  );
}

function bodyToHtml(body: string): string {
  const clean = withoutLongDash(body);
  const lines = clean
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const bullets = lines.filter((line) => /^[-•]\s+/.test(line));
  if (lines.length && bullets.length === lines.length) {
    return `<ul>${bullets.map((line) => `<li>${escapeHtml(line.replace(/^[-•]\s+/, ""))}</li>`).join("")}</ul>`;
  }
  return `<p>${escapeHtml(clean).replace(/\n/g, "<br/>")}</p>`;
}

function SectionBody({ body }: { body: string }) {
  const blocks = splitBlocks(withoutLongDash(body));
  if (!blocks.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {blocks.map((block, index) =>
        block.type === "list" ? (
          <ul key={index} className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
            {block.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p key={index} className="text-sm leading-relaxed text-muted">
            {block.lines.join(" ")}
          </p>
        ),
      )}
    </div>
  );
}

function BrandKit({ a }: { a: Artifact }) {
  const p = a.payload;
  const palette = asArr(p.palette);
  const typo = asObj(p.typography);
  const html = [
    `<h1>${escapeHtml(asString(p.name, a.title))}</h1>`,
    `<p class="gold">${escapeHtml(asString(p.tagline))}</p>`,
    `<p>${escapeHtml(asString(p.positioning))}</p>`,
    `<p>Público: ${escapeHtml(asString(p.audience))}</p>`,
    `<p>Voz: ${escapeHtml(asString(p.voice))}</p>`,
    palette.length
      ? `<h2>Paleta</h2><ul>${palette
          .map((c) => {
            const o = asObj(c);
            return `<li>${escapeHtml(asString(o.name))} · ${escapeHtml(asString(o.hex))}</li>`;
          })
          .join("")}</ul>`
      : "",
  ].join("\n");
  const text = [
    asString(p.name, a.title),
    asString(p.tagline),
    asString(p.positioning),
    asString(p.audience) ? `Público: ${asString(p.audience)}` : "",
    asString(p.voice) ? `Voz: ${asString(p.voice)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <Card
      title={asString(p.name, a.title)}
      kicker="Identidade"
      text={text}
      html={html}
      onDownload={() => downloadHtml(`${a.title}.html`, asString(p.name, a.title), html)}
    >
      <p className="text-gold">{asString(p.tagline)}</p>
      <p className="mt-2 text-sm text-muted">{asString(p.positioning)}</p>
      <p className="mt-2 text-sm">
        <span className="text-subtle">Público · </span>
        {asString(p.audience)}
      </p>
      <p className="mt-1 text-sm">
        <span className="text-subtle">Voz · </span>
        {asString(p.voice)}
      </p>
      {asString(typo.display) || asString(typo.body) ? (
        <p className="mt-1 text-sm">
          <span className="text-subtle">Tipo · </span>
          {asString(typo.display)}
          {asString(typo.display) && asString(typo.body) ? " / " : ""}
          {asString(typo.body)}
        </p>
      ) : null}
      {asString(p.logoDirection) ? (
        <p className="mt-1 text-sm">
          <span className="text-subtle">Logo · </span>
          {asString(p.logoDirection)}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {palette.map((c, i) => {
          const o = asObj(c);
          const hex = asString(o.hex, "#888");
          return (
            <div key={i} className="w-[88px]">
              <div className="h-12 rounded-lg" style={{ background: hex }} />
              <p className="mt-1 text-[11px] text-muted">{asString(o.name)}</p>
              <p className="font-mono text-[10px] text-subtle">{hex}</p>
            </div>
          );
        })}
      </div>
      {asStrList(p.contentIdeas).length ? (
        <ul className="mt-4 list-disc space-y-1 pl-4 text-sm text-muted">
          {asStrList(p.contentIdeas).map((idea) => (
            <li key={idea}>{idea}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-subtle">Lançamento</p>
        <ul className="mt-2 space-y-1 text-sm">
          {asArr(p.launchPlan).map((d, i) => {
            const o = asObj(d);
            return (
              <li key={i}>
                <span className="text-gold">{asString(o.day)} · </span>
                {asString(o.action)}
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

function CvPackage({ a }: { a: Artifact }) {
  const data = readCv(a.payload, a.title);
  const [style, setStyle] = useState<CvStyle>(() => resolveCvStyle(a.payload.template));
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setStyle(resolveCvStyle(a.payload.template));
  }, [a.id, a.payload.template]);
  const html = cvDocument(data, style);
  const text = cvPlainText(data, style);
  const [pdfNote, setPdfNote] = useState("");
  function savePdf() {
    setPdfNote("A preparar o PDF...");
    void downloadCvPdf(a.title, data, style).then((result) => {
      setPdfNote(result === "pdf" ? "" : "Não foi possível criar o PDF neste aparelho. Abri a impressão para guardares como PDF.");
    });
  }
  const styles = (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Estilo do CV">
      {CV_STYLES.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={style === item.id}
          className={`min-h-11 rounded-full px-3 text-left text-sm ${style === item.id ? "bg-gold-soft text-gold-bright" : "bg-elevated text-muted"}`}
          onClick={() => setStyle(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
  return (
    <Card title={a.title} kicker="Candidatura" text={text} html={html} office={false} printable={false}>
      <div
        role="button"
        tabIndex={0}
        className="block w-full text-left"
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        aria-label="Abrir o CV"
      >
        <iframe
          title={`CV ${CV_STYLES.find((item) => item.id === style)?.label ?? "Clássico Limpo"}`}
          className="pointer-events-none h-64 w-full rounded-xl bg-white"
          srcDoc={html}
          sandbox=""
        />
      </div>
      <Stage
        open={open}
        title={a.title}
        fill
        onClose={() => setOpen(false)}
        footer={
          <>
            {styles}
            <button type="button" className="min-h-11 text-sm text-gold" onClick={savePdf}>
              Descarregar PDF
            </button>
          </>
        }
      >
        <iframe title={a.title} className="h-full w-full bg-white" srcDoc={html} sandbox="" />
      </Stage>
      <p className="mt-2 text-xs text-subtle">Toca no CV para abrir. Só entram os dados que deste.</p>
      {pdfNote ? <p className="mt-1 text-xs text-subtle">{pdfNote}</p> : null}
    </Card>
  );
}

function AgriPlan({ a }: { a: Artifact }) {
  const p = a.payload;
  const html = [
    `<h1>${escapeHtml(a.title)}</h1>`,
    `<p>${escapeHtml(asString(p.location))} · ${escapeHtml(String(p.hectares ?? ""))} ha · ${escapeHtml(asString(p.crop))}</p>`,
    `<p class="gold">ESTIMATIVA</p>`,
    "<h2>Calendário</h2>",
    "<ul>",
    ...asArr(p.calendar).map((c) => {
      const o = asObj(c);
      return `<li><strong>${escapeHtml(asString(o.month))}</strong>: ${escapeHtml(String(o.tasks ?? ""))}</li>`;
    }),
    "</ul>",
    asArr(p.inputs).length
      ? `<h2>Insumos</h2><ul>${asArr(p.inputs)
          .map((x) => {
            const o = asObj(x);
            return `<li>${escapeHtml(asString(o.item))} · ${escapeHtml(asString(o.qty))}</li>`;
          })
          .join("")}</ul>`
      : "",
    asString(p.disclaimer) ? `<p>${escapeHtml(asString(p.disclaimer))}</p>` : "",
  ].join("\n");
  return (
    <Card
      title={a.title}
      kicker="Plano da lavra"
      html={html}
      text={htmlToPlain(html)}
      onDownload={() => downloadHtml(`${a.title}.html`, a.title, html)}
    >
      <p className="text-sm">
        {asString(p.location)} · {String(p.hectares ?? "")} ha · {asString(p.crop)}
      </p>
      <Badge className="mt-2 text-warn">ESTIMATIVA</Badge>
      <div className="mt-4 grid gap-2">
        {asArr(p.calendar).map((c, i) => {
          const o = asObj(c);
          return (
            <div key={i} className="flex gap-3 rounded-xl bg-elevated px-3 py-2">
              <span className="w-20 shrink-0 text-gold">{asString(o.month)}</span>
              <span className="text-sm text-muted">{String(o.tasks ?? "")}</span>
            </div>
          );
        })}
      </div>
      {asArr(p.inputs).length ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.14em] text-subtle">Insumos</p>
          <ul className="mt-2 space-y-1 text-sm">
            {asArr(p.inputs).map((x, i) => {
              const o = asObj(x);
              return (
                <li key={i}>
                  {asString(o.item)} · {asString(o.qty)}{" "}
                  <span className="text-subtle">{asString(o.note)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {asArr(p.costs).length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-subtle">
              <tr>
                <th className="py-1 font-medium">Custo</th>
                <th className="py-1 font-medium">Kz</th>
              </tr>
            </thead>
            <tbody>
              {asArr(p.costs).map((c, i) => {
                const o = asObj(c);
                return (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2">
                      {asString(o.item)}
                      {asString(o.note) ? <span className="block text-xs text-subtle">{asString(o.note)}</span> : null}
                    </td>
                    <td className="py-2 font-mono text-gold">{kz(o.kz)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {asObj(p.production).qty != null || asString(asObj(p.production).note) ? (
        <p className="mt-3 text-sm">
          Produção estimada · {String(asObj(p.production).qty ?? "")} {asString(asObj(p.production).unit)}{" "}
          <span className="text-subtle">{asString(asObj(p.production).note)}</span>
        </p>
      ) : null}
      {asStrList(p.market).length ? (
        <p className="mt-2 text-sm text-muted">Mercado · {asStrList(p.market).join(" · ")}</p>
      ) : null}
      {asStrList(p.risks).length ? (
        <p className="mt-2 text-sm text-warn">Riscos · {asStrList(p.risks).join(" · ")}</p>
      ) : null}
      <p className="mt-3 text-xs text-subtle">
        {asString(p.disclaimer, "Números são estimativa. Não há garantia de colheita nem de preço.")}
      </p>
    </Card>
  );
}

function BuildPlan({ a }: { a: Artifact }) {
  const p = a.payload;
  const html = [
    `<h1>${escapeHtml(a.title)}</h1>`,
    `<p class="gold">CONCEITO PRELIMINAR</p>`,
    `<p>${escapeHtml(asString(p.site))} · ${escapeHtml(asString(p.plot))}</p>`,
    `<p>${escapeHtml(asString(p.concept))}</p>`,
    "<h2>Programa</h2><ul>",
    ...asArr(p.program).map((s) => {
      const o = asObj(s);
      return `<li>${escapeHtml(asString(o.space))}: ${escapeHtml(String(o.areaM2 ?? ""))} m²</li>`;
    }),
    "</ul>",
    asString(p.disclaimer) ? `<p>${escapeHtml(asString(p.disclaimer))}</p>` : "",
  ].join("\n");
  return (
    <Card
      title={a.title}
      kicker="Constrói"
      html={html}
      text={htmlToPlain(html)}
      onDownload={() => downloadHtml(`${a.title}.html`, a.title, html)}
    >
      <Badge className="text-warn">CONCEITO PRELIMINAR</Badge>
      <p className="mt-2 text-sm text-muted">
        {asString(p.site)} · {asString(p.plot)}
      </p>
      <p className="mt-2 text-sm">{asString(p.concept)}</p>
      {asString(p.layoutNotes) ? <p className="mt-2 text-sm text-muted">{asString(p.layoutNotes)}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {asArr(p.program).map((s, i) => {
          const o = asObj(s);
          return (
            <div key={i} className="rounded-xl bg-elevated px-3 py-2">
              <p className="text-sm">{asString(o.space)}</p>
              <p className="font-mono text-xs text-gold">{String(o.areaM2 ?? "")} m²</p>
            </div>
          );
        })}
      </div>
      {asStrList(p.materials).length ? (
        <p className="mt-3 text-sm text-muted">Materiais · {asStrList(p.materials).join(" · ")}</p>
      ) : null}
      <ul className="mt-4 space-y-1 text-sm">
        {asArr(p.phases).map((ph, i) => {
          const o = asObj(ph);
          return (
            <li key={i}>
              <span className="text-gold">{asString(o.name)} · </span>
              {String(o.tasks ?? "")}
            </li>
          );
        })}
      </ul>
      {asArr(p.costBands).length ? (
        <div className="mt-4 overflow-x-auto">
          <p className="text-xs uppercase tracking-[0.14em] text-subtle">Faixas de custo (estimativa)</p>
          <table className="mt-2 w-full text-left text-sm">
            <tbody>
              {asArr(p.costBands).map((c, i) => {
                const o = asObj(c);
                return (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2">{asString(o.item)}</td>
                    <td className="py-2 font-mono text-gold">
                      {kz(o.kzMin)} – {kz(o.kzMax)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-subtle">
        {asString(p.disclaimer, "Conceito preliminar. Não substitui arquitecto, engenheiro nem licenças.")}
      </p>
    </Card>
  );
}

function DjSet({ a }: { a: Artifact }) {
  const p = a.payload;
  const arc = asArr(p.arc);
  const html = [
    `<h1>${escapeHtml(a.title)}</h1>`,
    `<p>${escapeHtml(asString(p.occasion))} · ${escapeHtml(asString(p.audience))} · ${escapeHtml(asString(p.start))}</p>`,
    `<p>${escapeHtml(asStrList(p.genres).join(" · "))}</p>`,
    ...arc.map((seg) => {
      const o = asObj(seg);
      return `<h2>${escapeHtml(asString(o.phase))} · ${escapeHtml(String(o.minutes ?? ""))} min</h2><p>${escapeHtml(asString(o.notes))}</p><p>${escapeHtml(asArr(o.references).map(String).join(" · "))}</p>`;
    }),
    `<p>Sessão e referências.</p>`,
  ].join("\n");
  return (
    <Card
      title={a.title}
      kicker="DJ PILILÍ"
      html={html}
      text={htmlToPlain(html)}
      onDownload={() => downloadHtml(`${a.title}.html`, a.title, html)}
    >
      <p className="text-sm text-muted">
        {asString(p.occasion)} · {asString(p.audience)} · {asString(p.start)}
      </p>
      <p className="mt-1 text-sm">{asStrList(p.genres).join(" · ")}</p>
      {asStrList(p.exclusions).length ? (
        <p className="mt-1 text-xs text-subtle">Não tocar · {asStrList(p.exclusions).join(" · ")}</p>
      ) : null}
      <div className="mt-4 flex items-end gap-2">
        {arc.map((seg, i) => {
          const o = asObj(seg);
          const energy = Math.min(10, Math.max(1, Number(o.energy) || 5));
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="energy-bar w-full rounded-t-md bg-gold"
                style={{ height: `${10 + energy * 10}px`, opacity: 0.35 + energy / 15 }}
              />
              <span className="text-[10px] uppercase tracking-wide text-subtle">{asString(o.phase)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 space-y-3">
        {arc.map((seg, i) => {
          const o = asObj(seg);
          return (
            <div key={i} className="rounded-xl bg-elevated p-3">
              <p className="text-sm font-medium capitalize">
                {asString(o.phase)} · {String(o.minutes ?? "")} min · {asString(o.style)}
              </p>
              <p className="mt-1 text-sm text-muted">{asString(o.notes)}</p>
              <p className="mt-1 text-xs text-subtle">{asArr(o.references).map(String).join(" · ")}</p>
            </div>
          );
        })}
      </div>
      {asStrList(p.controls).length ? (
        <ul className="mt-4 space-y-1 text-sm text-muted">
          {asStrList(p.controls).map((c) => (
            <li key={c}>· {c}</li>
          ))}
        </ul>
      ) : null}
      {asArr(p.tracks).length ? (
        <ol className="mt-4 space-y-2 text-sm">
          {asArr(p.tracks).map((item, index) => {
            const track = asObj(item);
            return (
              <li key={`${asString(track.name)}-${index}`}>
                {asString(track.name)}
                {asString(track.artists) ? ` · ${asString(track.artists)}` : ""}
              </li>
            );
          })}
        </ol>
      ) : null}
      {asString(p.spotifyUrl) ? (
        <a href={asString(p.spotifyUrl)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm text-gold">
          Abrir no Spotify
        </a>
      ) : null}
      <p className="mt-3 text-xs text-subtle">Sessão e referências.</p>
    </Card>
  );
}

function WebsiteSpec({ a }: { a: Artifact }) {
  const p = a.payload;
  const html = asString(p.html);
  const preview = asString(p.preview);
  const shot = asString(p.shot);
  const code = asString(p.code) || html;
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [shotOk, setShotOk] = useState(true);
  function openSite() {
    if (preview) {
      window.open(preview, "_blank", "noopener,noreferrer");
      return;
    }
    if (!html) return;
    const page = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(page);
    window.open(url, "_blank", "noopener,noreferrer");
  }
  async function publish() {
    if (!html || busy) return;
    setBusy(true);
    setNote("");
    setLink("");
    try {
      const result = await publishToNetlify({ data: { html, name: asString(p.name, a.title) } });
      if (result.ok && result.url) {
        setLink(result.url);
        setNote("Publicado.");
      } else {
        setLink("");
        setNote(result.ok ? "Publicado no Netlify." : result.message);
      }
    } catch {
      setNote("A publicação no Netlify ainda não está configurada.");
    } finally {
      setBusy(false);
    }
  }
  const visual =
    shot && shotOk ? (
      <img
        src={shot}
        alt="Pré-visualização do site"
        className="max-h-64 w-full rounded-xl bg-black object-cover"
        onError={() => setShotOk(false)}
      />
    ) : null;
  return (
    <Card title={asString(p.name, a.title)} kicker="Digital" office={false} printable={false}>
      {visual ? (
        <button type="button" className="block w-full text-left" onClick={openSite} aria-label="Abrir o site">
          {visual}
          <span className="mt-2 block text-xs text-subtle">Toca para abrir</span>
        </button>
      ) : preview ? null : (
        <p className="text-sm text-muted">O site ainda não está pronto.</p>
      )}
      {preview || html ? (
        <div className="mt-3 space-y-2">
          <Button type="button" className="w-full" onClick={openSite}>
            Ver site
          </Button>
          {html ? (
            <Button type="button" className="w-full" disabled={busy} onClick={() => void publish()}>
              {busy ? "A publicar..." : "Publicar"}
            </Button>
          ) : null}
          {code ? (
            <Button type="button" variant="ghost" className="w-full" onClick={() => setShowCode((open) => !open)}>
              {showCode ? "Esconder código" : "Ver código"}
            </Button>
          ) : null}
          {showCode && code ? (
            <pre className="max-h-64 overflow-auto rounded-xl bg-elevated p-3 text-xs text-muted">{code}</pre>
          ) : null}
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-gold">
              {link}
            </a>
          ) : null}
          {note ? <p className="text-sm text-muted">{note}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}

function Campaign({ a }: { a: Artifact }) {
  const p = a.payload;
  const html = [
    `<h1>${escapeHtml(a.title)}</h1>`,
    `<p>${escapeHtml(asString(p.objective))}</p>`,
    `<p>Público: ${escapeHtml(asString(p.audience))}</p>`,
    asStrList(p.messages).length
      ? `<h2>Mensagens</h2><ul>${asStrList(p.messages)
          .map((m) => `<li>${escapeHtml(m)}</li>`)
          .join("")}</ul>`
      : "",
    asStrList(p.captions).length
      ? `<h2>Legendas</h2>${asStrList(p.captions)
          .map((c) => `<p>${escapeHtml(c).replace(/\n/g, "<br/>")}</p>`)
          .join("")}`
      : "",
  ].join("\n");
  const text = [
    a.title,
    asString(p.objective),
    asString(p.audience) ? `Público: ${asString(p.audience)}` : "",
    ...asStrList(p.messages),
    ...asStrList(p.captions),
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <Card
      title={a.title}
      kicker="Campanha"
      text={text}
      html={html}
      onDownload={() => downloadHtml(`${a.title}.html`, a.title, html)}
    >
      <p className="text-sm">{asString(p.objective)}</p>
      <p className="mt-1 text-sm text-muted">Público · {asString(p.audience)}</p>
      {asStrList(p.channels).length ? (
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-gold">{asStrList(p.channels).join(" · ")}</p>
      ) : null}
      {asStrList(p.messages).length ? (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-sm">
          {asStrList(p.messages).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : null}
      {asArr(p.calendar).length ? (
        <div className="mt-4 space-y-2">
          {asArr(p.calendar).map((d, i) => {
            const o = asObj(d);
            return (
              <div key={i} className="flex gap-3 rounded-xl bg-elevated px-3 py-2 text-sm">
                <span className="w-16 shrink-0 text-gold">{asString(o.day)}</span>
                <span>
                  {asString(o.asset)}
                  {asString(o.channel) ? <span className="text-subtle"> · {asString(o.channel)}</span> : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
      {asStrList(p.captions).length ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs uppercase tracking-[0.14em] text-subtle">Legendas</p>
          {asStrList(p.captions).map((c, i) => (
            <p key={i} className="rounded-xl bg-elevated px-3 py-2 text-sm whitespace-pre-wrap">
              {c}
            </p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function Proposal({ a }: { a: Artifact }) {
  const p = a.payload;
  const html = [
    `<p class="gold">${escapeHtml(asString(p.client))}</p>`,
    `<h1>${escapeHtml(asString(p.title, a.title))}</h1>`,
    ...asArr(p.sections).map((s) => {
      const o = asObj(s);
      return `<h2>${escapeHtml(asString(o.heading))}</h2>${bodyToHtml(asString(o.body))}`;
    }),
    asString(p.investmentNote) ? `<h2>Investimento</h2><p>${escapeHtml(asString(p.investmentNote))}</p>` : "",
    asString(p.nextStep) ? `<p><strong>A seguir.</strong> ${escapeHtml(asString(p.nextStep))}</p>` : "",
  ].join("\n");
  const text = [
    asString(p.client),
    asString(p.title, a.title),
    ...asArr(p.sections).map((s) => {
      const o = asObj(s);
      return `${asString(o.heading)}\n${asString(o.body)}`;
    }),
    asString(p.investmentNote),
    asString(p.nextStep) ? `A seguir: ${asString(p.nextStep)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <Card
      title={asString(p.title, a.title)}
      kicker={asString(p.client, "Proposta")}
      text={text}
      html={html}
      onDownload={() => downloadHtml(`${a.title}.html`, asString(p.title, a.title), html)}
    >
      {asArr(p.sections).map((s, i) => {
        const o = asObj(s);
        return (
          <section key={i} className="mt-4 border-t border-line pt-3 first:mt-0 first:border-t-0 first:pt-0">
            <h4 className="text-xs uppercase tracking-[0.14em] text-gold">
              {String(i + 1).padStart(2, "0")} · {asString(o.heading)}
            </h4>
            <SectionBody body={asString(o.body)} />
          </section>
        );
      })}
      {asString(p.investmentNote) ? (
        <p className="mt-4 rounded-xl bg-elevated px-3 py-2 text-sm">{asString(p.investmentNote)}</p>
      ) : null}
      {asString(p.nextStep) ? <p className="mt-3 text-sm text-gold">A seguir · {asString(p.nextStep)}</p> : null}
    </Card>
  );
}

function Presentation({ a }: { a: Artifact }) {
  const p = a.payload;
  const slides = asArr(p.slides);
  const html = [
    `<h1>${escapeHtml(asString(p.title, a.title))}</h1>`,
    asString(p.subtitle) ? `<p>${escapeHtml(asString(p.subtitle))}</p>` : "",
    ...slides.map((s, i) => {
      const o = asObj(s);
      const bullets = asStrList(o.bullets)
        .map((b) => `<li>${escapeHtml(b)}</li>`)
        .join("");
      return `<div class="slide"><p class="gold">0${i + 1}</p><h2>${escapeHtml(asString(o.title))}</h2><ul>${bullets}</ul>${asString(o.note) ? `<p>${escapeHtml(asString(o.note))}</p>` : ""}</div>`;
    }),
  ].join("\n");
  return (
    <Card
      title={asString(p.title, a.title)}
      kicker="Apresentação"
      html={html}
      text={htmlToPlain(html)}
      onDownload={() => downloadHtml(`${a.title}.html`, asString(p.title, a.title), html)}
    >
      {asString(p.subtitle) ? <p className="text-sm text-muted">{asString(p.subtitle)}</p> : null}
      <div className="mt-4 space-y-3">
        {slides.map((s, i) => {
          const o = asObj(s);
          return (
            <article key={i} className="rounded-xl bg-elevated p-4">
              <p className="font-mono text-[11px] text-gold">{String(i + 1).padStart(2, "0")}</p>
              <h4 className="mt-1 font-display text-lg">{asString(o.title)}</h4>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">
                {asStrList(o.bullets).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              {asString(o.note) ? <p className="mt-2 text-xs text-subtle">{asString(o.note)}</p> : null}
            </article>
          );
        })}
      </div>
    </Card>
  );
}

function DocumentInsight({ a }: { a: Artifact }) {
  const p = a.payload;
  const html = [
    `<h1>${escapeHtml(a.title)}</h1>`,
    `<p>${escapeHtml(asString(p.summary))}</p>`,
    asStrList(p.keyPoints).length
      ? `<h2>O que importa</h2><ul>${asStrList(p.keyPoints)
          .map((x) => `<li>${escapeHtml(x)}</li>`)
          .join("")}</ul>`
      : "",
    asStrList(p.actions).length
      ? `<h2>Acções</h2><ul>${asStrList(p.actions)
          .map((x) => `<li>${escapeHtml(x)}</li>`)
          .join("")}</ul>`
      : "",
  ].join("\n");
  const block = (label: string, items: string[]) =>
    items.length ? (
      <div className="mt-4 border-t border-line pt-3">
        <p className="text-xs uppercase tracking-[0.14em] text-gold">{label}</p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-muted">
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    ) : null;
  return (
    <Card
      title={a.title}
      kicker="Leitura"
      text={[asString(p.summary), ...asStrList(p.keyPoints), ...asStrList(p.actions)].filter(Boolean).join("\n")}
      html={html}
      onDownload={() => downloadHtml(`${a.title}.html`, a.title, html)}
    >
      {asString(p.summary) ? <p className="text-sm leading-relaxed">{asString(p.summary)}</p> : null}
      {block("O que importa", asStrList(p.keyPoints))}
      {block("Valores", asStrList(p.amounts))}
      {block("Datas", asStrList(p.dates))}
      {block("Acções", asStrList(p.actions))}
      {block("Incerto: confirmar", asStrList(p.uncertainties))}
    </Card>
  );
}

function StudyPack({ a }: { a: Artifact }) {
  const p = a.payload;
  const [open, setOpen] = useState(false);
  const html = [
    `<h1>${escapeHtml(asString(p.topic, a.title))}</h1>`,
    asString(p.explanation) ? `<p>${escapeHtml(asString(p.explanation))}</p>` : "",
    asStrList(p.plan).length
      ? `<h2>Plano</h2><ol>${asStrList(p.plan)
          .map((x) => `<li>${escapeHtml(x)}</li>`)
          .join("")}</ol>`
      : "",
    asArr(p.exercises).length
      ? `<h2>Exercícios</h2>${asArr(p.exercises)
          .map((ex) => {
            const o = asObj(ex);
            return `<p><strong>${escapeHtml(asString(o.q))}</strong></p><p>${escapeHtml(asString(o.a))}</p>`;
          })
          .join("")}`
      : "",
  ].join("\n");
  return (
    <Card
      title={asString(p.topic, a.title)}
      kicker="Estuda"
      text={[asString(p.topic, a.title), asString(p.explanation), ...asStrList(p.plan), asString(p.summary)]
        .filter(Boolean)
        .join("\n")}
      html={html}
      onDownload={() => downloadHtml(`${a.title}.html`, asString(p.topic, a.title), html)}
    >
      {asString(p.explanation) ? (
        <section>
          <h4 className="text-xs uppercase tracking-[0.14em] text-gold">Explicação</h4>
          <div className="mt-2 text-sm leading-relaxed">
            <Markdown text={asString(p.explanation)} />
          </div>
        </section>
      ) : null}
      {asStrList(p.plan).length ? (
        <section className="mt-4 border-t border-line pt-3">
          <h4 className="text-xs uppercase tracking-[0.14em] text-gold">Plano de estudo</h4>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted">
            {asStrList(p.plan).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </section>
      ) : null}
      {asArr(p.exercises).length ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.14em] text-gold">Exercícios</p>
          <ol className="mt-2 space-y-3">
            {asArr(p.exercises).map((ex, i) => {
              const o = asObj(ex);
              return (
                <li key={i} className="rounded-xl bg-elevated p-3 text-sm">
                  <p>{asString(o.q)}</p>
                  {open && asString(o.a) ? (
                    <p className="mt-2 text-gold">{asString(o.a)}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <button type="button" className="mt-3 min-h-11 text-sm text-gold" onClick={() => setOpen((v) => !v)}>
            {open ? "Esconder soluções" : "Mostrar soluções"}
          </button>
        </div>
      ) : null}
      {asString(p.summary) ? (
        <section className="mt-4 border-t border-line pt-3">
          <h4 className="text-xs uppercase tracking-[0.14em] text-gold">Resumo</h4>
          <p className="mt-2 text-sm leading-relaxed text-muted">{asString(p.summary)}</p>
        </section>
      ) : null}
    </Card>
  );
}

function Checklist({ a }: { a: Artifact }) {
  const p = a.payload;
  const items = asArr(p.items).map((it, index) => {
    const o = asObj(it);
    return {
      text: asString(o.text),
      note: asString(o.note),
      group: asString(o.group),
      done: Boolean(o.done),
      index,
    };
  });
  const title = asString(p.title, a.title);
  const [checks, setChecks] = useState<boolean[]>(() => items.map((item) => item.done));
  const [saveNote, setSaveNote] = useState("");
  const qc = useQueryClient();
  const live = items.map((item) => ({ ...item, done: checks[item.index] ?? false }));
  const groups = groupChecklist(live);
  const text = plainChecklist(title, groups);
  const doneCount = live.filter((item) => item.done).length;
  const html = [
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>${escapeHtml(taskProgress(doneCount, live.length))}</p>`,
    ...groups.map((group) => {
      const heading = group.title ? `<h2>${escapeHtml(group.title)}</h2>` : "";
      const list = `<ol>${group.items
        .map(
          (item) =>
            `<li>${item.done ? "Feito: " : ""}${escapeHtml(item.text)}${item.note ? ` <span class="gold">${escapeHtml(item.note)}</span>` : ""}</li>`,
        )
        .join("")}</ol>`;
      return heading + list;
    }),
  ].join("\n");

  async function toggle(index: number) {
    const next = checks.map((flag, i) => (i === index ? !flag : flag));
    setChecks(next);
    setSaveNote("A guardar…");
    try {
      const result = await saveChecklistProgress({ data: { id: a.id, done: next } });
      if (!result.ok) {
        setSaveNote(result.error);
        return;
      }
      setSaveNote("Guardado na tua conta. Não foi enviado para lado nenhum.");
      await qc.invalidateQueries({ queryKey: ["account-items"] });
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
    } catch {
      setSaveNote("O visto ficou neste ecrã. Entra para o guardar na conta.");
    }
  }

  return (
    <Card title={title} kicker="Lista" text={text} html={html} onDownload={() => downloadHtml(`${a.title}.html`, title, html)}>
      <p className="text-sm text-gold">{taskProgress(doneCount, live.length)}</p>
      <p className="mt-1 text-xs text-subtle">Marcar feito fica na conta. Não envia a tarefa para lado nenhum.</p>
      {groups.map((group) => (
        <section key={group.title || "lista"} className="mt-4 border-t border-line pt-3 first:mt-0 first:border-t-0 first:pt-0">
          {group.title ? <h4 className="text-xs uppercase tracking-[0.14em] text-gold">{group.title}</h4> : null}
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            {group.items.map((item) => {
              const on = checks[item.index] ?? false;
              return (
                <li key={`${item.index}-${item.text}`} className="text-sm leading-relaxed">
                  <label className="flex min-h-11 items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-5 accent-gold"
                      checked={on}
                      aria-label={on ? "Marcar como por fazer" : "Marcar como feito"}
                      onChange={() => void toggle(item.index)}
                    />
                    <span>
                      <span className={on ? "text-subtle line-through" : ""}>{item.text}</span>
                      <span className="mt-0.5 block text-[11px] uppercase tracking-[0.12em] text-subtle">
                        {on ? "Feito" : "Por fazer"}
                      </span>
                      {item.note ? <span className="mt-0.5 block text-xs text-subtle">{item.note}</span> : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {saveNote ? <p className="mt-3 text-xs text-subtle">{saveNote}</p> : null}
    </Card>
  );
}

function DataTable({ a }: { a: Artifact }) {
  const p = a.payload;
  const headers = asStrList(p.headers);
  const rows = asArr(p.rows);
  const caption = asString(p.caption, a.title);
  const html = `<h1>${escapeHtml(caption)}</h1><table><thead><tr>${headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${asArr(r).map((c) => `<td>${escapeHtml(String(c ?? ""))}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
  const text = [caption, headers.join(" | "), ...rows.map((r) => asArr(r).map((c) => String(c ?? "")).join(" | "))].join("\n");
  return (
    <Card
      title={caption}
      kicker="Tabela"
      text={text}
      html={html}
      onDownload={() => {
        const csv = [headers.join(";"), ...rows.map((r) => asArr(r).map((c) => String(c ?? "")).join(";"))].join(
          "\n",
        );
        downloadBlob(`${a.title}.csv`, "text/csv;charset=utf-8", csv);
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-64 text-left text-sm">
          {headers.length ? (
            <thead>
              <tr className="text-xs uppercase tracking-wide text-subtle">
                {headers.map((h) => (
                  <th key={h} className="py-2 pr-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                {asArr(r).map((c, j) => (
                  <td key={j} className="py-2 pr-3 text-muted">
                    {String(c ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function NoteArt({ a }: { a: Artifact }) {
  return <TextCard a={a} kicker="Nota" />;
}

function AudioArt({ a }: { a: Artifact }) {
  const url = asString(a.payload.audioUrl);
  if (a.payload.file === true) {
    return (
      <section className="mt-3 overflow-hidden rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="text-[11px] uppercase tracking-[0.16em] text-gold">Áudio</p>
        <h3 className="font-display text-lg font-semibold tracking-tight">{a.title}</h3>
        {url ? <audio className="mt-3 w-full" controls src={url} /> : null}
        {url ? (
          <a className="mt-3 inline-flex min-h-11 items-center text-sm text-gold" href={url} download="pilili-audio.mp3">
            Descarregar áudio
          </a>
        ) : null}
      </section>
    );
  }
  return <TextCard a={a} kicker="Áudio" />;
}

function TextCard({ a, kicker }: { a: Artifact; kicker: string }) {
  const sections = asArr(a.payload.sections)
    .map(asObj)
    .filter((section) => asString(section.heading) || asString(section.body));
  const body = asString(a.payload.body) || asString(a.payload.raw);
  const html = asString(a.payload.html) || `<h1>${escapeHtml(a.title)}</h1><p>${escapeHtml(body).replace(/\n/g, "<br/>")}</p>`;
  return (
    <Card
      title={a.title}
      kicker={kicker}
      text={body}
      html={html}
      onDownload={body ? () => downloadHtml(`${a.title}.html`, a.title, html) : undefined}
    >
      {sections.length ? (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <section key={`${asString(section.heading)}-${index}`}>
              {asString(section.heading) ? <h4 className="text-sm font-medium">{asString(section.heading)}</h4> : null}
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{asString(section.body)}</p>
            </section>
          ))}
        </div>
      ) : body ? (
        <Markdown text={body} />
      ) : (
        <p className="text-sm text-muted">Sem conteúdo.</p>
      )}
    </Card>
  );
}

function Stage({
  open,
  title,
  onClose,
  children,
  footer,
  fill = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  fill?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="truncate text-sm text-fg">{title}</p>
        <button type="button" className="min-h-11 px-3 text-sm text-gold" onClick={onClose}>
          Fechar
        </button>
      </div>
      <div className={fill ? "min-h-0 flex-1" : "flex min-h-0 flex-1 items-center justify-center px-4"}>{children}</div>
      {footer ? <div className="flex flex-wrap gap-3 px-4 py-4">{footer}</div> : null}
    </div>
  );
}

function VideoArt({ a }: { a: Artifact }) {
  const initialUrl = asString(a.payload.url);
  const status = asString(a.payload.status);
  const requestId = asString(a.payload.requestId);
  const stored = a.payload.stored === true;
  const finished = ["done", "completed", "succeeded", "failed", "expired"].includes(status);
  const [live, setLive] = useState({ url: initialUrl, status, busy: false, err: "" });
  const [gone, setGone] = useState(false);
  const [probing, setProbing] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [open, setOpen] = useState(false);
  const replaced = useRef(false);
  const urlRef = useRef(initialUrl);
  urlRef.current = live.url;

  useEffect(() => {
    if (initialUrl || (!stored && !finished)) return;
    let stop = false;
    setProbing(true);
    getLibraryMedia({ data: { id: a.id } })
      .then((r) => {
        if (stop) return;
        const next = r.ok ? r.url : "";
        if (next) {
          setGone(false);
          setLive((s) => ({ ...s, url: next }));
        } else setGone(true);
      })
      .catch(() => {
        if (!stop) setGone(true);
      })
      .finally(() => {
        if (!stop) setProbing(false);
      });
    return () => {
      stop = true;
    };
  }, [a.id, initialUrl, stored, finished]);

  async function onBroken() {
    if (replaced.current) {
      setProbing(false);
      setGone(true);
      return;
    }
    replaced.current = true;
    setProbing(true);
    try {
      const r = await getLibraryMedia({ data: { id: a.id } });
      const next = r.ok ? r.url : "";
      if (next && next !== urlRef.current) {
        setGone(false);
        setLive((s) => ({ ...s, url: next }));
      } else setGone(true);
    } catch {
      setGone(true);
    } finally {
      setProbing(false);
    }
  }

  async function refresh() {
    if (!requestId) return;
    setLive((s) => ({ ...s, busy: true, err: "" }));
    const r = await getVideoStatus({ data: { requestId } });
    if (r.ok) {
      if (r.url) setGone(false);
      setLive({ url: r.url ?? live.url, status: r.status, busy: false, err: "" });
    } else setLive((s) => ({ ...s, busy: false, err: r.error }));
  }
  async function saveFile() {
    if (!live.url) return;
    setSaveNote("");
    try {
      await downloadVideo(live.url, a.title);
    } catch {
      setSaveNote("Não consegui guardar o ficheiro de vídeo.");
    }
  }
  const showPlayer = Boolean(live.url) && !gone && !probing;
  const showGone = gone && !probing;
  return (
    <Card title={a.title} kicker="Vídeo" printable={false}>
      {showPlayer ? (
        <button type="button" className="relative block w-full" onClick={() => setOpen(true)} aria-label="Reproduzir o vídeo">
          <video
            key={live.url}
            muted
            playsInline
            preload="metadata"
            className="pointer-events-none block min-h-48 w-full rounded-xl bg-black object-contain"
            src={live.url}
            onError={() => void onBroken()}
          />
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid size-16 place-items-center rounded-full bg-black/60 text-white ring-2 ring-white/85">
              <Play className="ml-1 size-7 fill-white" />
            </span>
          </span>
        </button>
      ) : showGone ? (
        <p className="text-sm text-muted">Este vídeo já não está disponível.</p>
      ) : (
        <MediaSketch kind="video" />
      )}
      <Stage
        open={open}
        title={a.title}
        onClose={() => setOpen(false)}
        footer={
          showPlayer ? (
            <button type="button" className="min-h-11 text-sm text-gold" onClick={() => void saveFile()}>
              Descarregar MP4
            </button>
          ) : null
        }
      >
        {showPlayer ? (
          <video
            key={live.url}
            controls
            playsInline
            className="max-h-[70vh] w-full"
            src={live.url}
            onError={() => void onBroken()}
          />
        ) : null}
      </Stage>
      {requestId && !showPlayer ? (
        <button type="button" className="mt-3 min-h-11 text-sm text-gold" onClick={() => void refresh()} disabled={live.busy}>
          {live.busy ? "A verificar…" : "Verificar o vídeo"}
        </button>
      ) : null}
      {live.err ? <p className="mt-2 text-xs text-danger">{live.err}</p> : null}
      {saveNote ? <p className="mt-2 text-xs text-danger">{saveNote}</p> : null}
    </Card>
  );
}

function Generic({ a, kicker }: { a: Artifact; kicker: string }) {
  const body = asString(a.payload.body);
  return (
    <Card
      title={a.title}
      kicker={kicker}
      onDownload={() => downloadBlob(`${a.title}.json`, "application/json", JSON.stringify(a.payload, null, 2))}
    >
      {body ? (
        <Markdown text={body} />
      ) : (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap font-sans text-sm text-muted">
          {JSON.stringify(a.payload, null, 2)}
        </pre>
      )}
    </Card>
  );
}

function ImageArt({ a }: { a: Artifact }) {
  const url = asString(a.payload.url);
  const stored = a.payload.stored === true;
  const [live, setLive] = useState(url);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (live || !stored || failed) return;
    let stop = false;
    getLibraryMedia({ data: { id: a.id } })
      .then((r) => {
        if (stop) return;
        if (r.ok && r.url) setLive(r.url);
        else setFailed(true);
      })
      .catch(() => {
        if (!stop) setFailed(true);
      });
    return () => {
      stop = true;
    };
  }, [a.id, stored, live, failed]);
  if (!live) {
    if (failed) {
      return (
        <Card title={a.title} kicker="Imagem" printable={false}>
          <p className="text-sm text-muted">Não consegui abrir esta imagem.</p>
        </Card>
      );
    }
    return <MediaSketch kind="imagem" />;
  }
  const alt = asString(a.payload.alt, a.title);
  return (
    <Card title={a.title} kicker="Imagem" printable={false}>
      <button type="button" className="block w-full" onClick={() => setOpen(true)} aria-label="Abrir a imagem">
        <img src={live} alt={alt} className="max-h-64 w-full rounded-xl bg-black object-cover" />
      </button>
      <Stage
        open={open}
        title={a.title}
        onClose={() => setOpen(false)}
        footer={
          <button type="button" className="min-h-11 text-sm text-gold" onClick={() => void downloadImage(live, a.title)}>
            Descarregar
          </button>
        }
      >
        <img src={live} alt={alt} className="max-h-[70vh] w-full object-contain" />
      </Stage>
    </Card>
  );
}

function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function downloadVideo(url: string, title: string) {
  const name = `${title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 48) || "video-curto"}.mp4`;
  if (url.startsWith("data:video")) {
    const comma = url.indexOf(",");
    const bytes = bytesFromBase64(url.slice(comma + 1));
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    downloadBlob(name, "video/mp4", new Blob([copy], { type: "video/mp4" }));
    return;
  }
  const got = await fetchVideoFile({ data: { url } });
  if (!got.ok) throw new Error(got.error);
  const bytes = bytesFromBase64(got.base64);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  downloadBlob(name, "video/mp4", new Blob([copy], { type: "video/mp4" }));
}

async function downloadImage(url: string, title: string) {
  const name = `${title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 48) || "imagem"}.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("imagem");
    const blob = await res.blob();
    downloadBlob(name, blob.type || "image/png", blob);
  } catch {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

export function ArtifactView({ artifact }: { artifact: Artifact }) {
  switch (artifact.type) {
    case "brand_kit":
      return <BrandKit a={artifact} />;
    case "cv_package":
      return <CvPackage a={artifact} />;
    case "agri_plan":
      return <AgriPlan a={artifact} />;
    case "build_plan":
      return <BuildPlan a={artifact} />;
    case "dj_set":
      return <DjSet a={artifact} />;
    case "website_spec":
      return <WebsiteSpec a={artifact} />;
    case "campaign":
      return <Campaign a={artifact} />;
    case "proposal":
      return <Proposal a={artifact} />;
    case "presentation":
      return <Presentation a={artifact} />;
    case "document_insight":
      return <DocumentInsight a={artifact} />;
    case "study_pack":
      return <StudyPack a={artifact} />;
    case "checklist":
      return <Checklist a={artifact} />;
    case "table":
      return <DataTable a={artifact} />;
    case "note":
      return <NoteArt a={artifact} />;
    case "audio_brief":
      return <AudioArt a={artifact} />;
    case "image":
      return <ImageArt a={artifact} />;
    case "video":
      return <VideoArt a={artifact} />;
    default:
      return <Generic a={artifact} kicker="Entrega" />;
  }
}
