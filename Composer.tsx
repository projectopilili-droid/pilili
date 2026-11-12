import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Paperclip, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePilili } from "@/lib/store";
import type { AttachmentMeta } from "@/lib/pilili/types";
import { cn } from "@/lib/utils";
import { isAudioFile } from "@/lib/pilili/audio";
import { blockedAttachmentReason, isDocx, isPdf } from "@/lib/pilili/files";
import { extractDocument } from "@/lib/server/functions";

function looksLikeText(s: string) {
  if (!s) return false;
  const sample = s.slice(0, 400);
  let bad = 0;
  for (let i = 0; i < sample.length; i += 1) {
    const c = sample.charCodeAt(i);
    if (c === 0 || (c < 9 && c !== 10 && c !== 13)) bad += 1;
  }
  return bad < 8 && /[\p{L}\p{N}]/u.test(sample);
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("ficheiro"));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

async function fileToAttachment(file: File): Promise<AttachmentMeta | null> {
  const blocked = blockedAttachmentReason(file.name, file.type);
  if (blocked) return null;
  if (isPdf(file.name, file.type) || isDocx(file.name, file.type)) {
    if (file.size > 6_000_000) {
      return {
        name: file.name,
        mime: file.type,
        size: file.size,
        kind: "unreadable",
        warning: "O ficheiro é grande demais. Envia até 6 MB ou uma fotografia das páginas.",
      };
    }
    const extracted = await extractDocument({
      data: { name: file.name, mime: file.type || (isPdf(file.name, file.type) ? "application/pdf" : ""), base64: await fileToBase64(file) },
    });
    if (!extracted.ok) {
      return {
        name: file.name,
        mime: file.type,
        size: file.size,
        kind: "unreadable",
        warning: extracted.message,
      };
    }
    return {
      name: file.name,
      mime: file.type,
      size: file.size,
      kind: "document",
      text: extracted.text,
      warning: extracted.warning,
    };
  }
  if (isAudioFile(file.name, file.type)) {
    if (file.size > 12_000_000) {
      return {
        name: file.name,
        mime: file.type,
        size: file.size,
        kind: "unreadable",
        warning: "O áudio é grande demais. Envia até 12 MB.",
      };
    }
    const mime = file.type || "audio/mpeg";
    return {
      name: file.name,
      mime,
      size: file.size,
      kind: "audio",
      dataUrl: `data:${mime};base64,${await fileToBase64(file)}`,
    };
  }
  if (file.type.startsWith("image/")) {
    const dataUrl = await compressImage(file);
    return {
      name: file.name,
      mime: "image/jpeg",
      size: file.size,
      kind: "image",
      dataUrl,
    };
  }
  const lower = file.name.toLowerCase();
  if (
    file.type.startsWith("text/") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json")
  ) {
    const text = (await file.text()).slice(0, 20000);
    return { name: file.name, mime: file.type, size: file.size, kind: "text", text };
  }
  const text = await file.text().catch(() => "");
  if (looksLikeText(text)) {
    return {
      name: file.name,
      mime: file.type || "text/plain",
      size: file.size,
      kind: "text",
      text: text.slice(0, 20000),
    };
  }
  return {
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    kind: "unreadable",
    warning: "Não consegui ler este ficheiro. Envia uma foto ou cola o texto.",
  };
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => reject(new Error("image"));
    img.src = url;
  });
}

type Recog = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};

export function Composer({
  onSubmit,
  busy,
  autoFocus,
  variant = "page",
  placeholder = "Diz à tua maneira...",
}: {
  onSubmit: (text: string, attachments: AttachmentMeta[]) => void;
  busy?: boolean;
  autoFocus?: boolean;
  variant?: "page" | "dock" | "overlay";
  placeholder?: string;
}) {
  const draft = usePilili((s) => s.draft);
  const setDraft = usePilili((s) => s.setDraft);
  const attachments = usePilili((s) => s.attachments);
  const setAttachments = usePilili((s) => s.setAttachments);
  const [listening, setListening] = useState(false);
  const [refused, setRefused] = useState("");
  const recogRef = useRef<Recog | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft.text]);

  function toggleVoice() {
    const SR =
      (window as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition ||
      (window as unknown as { SpeechRecognition?: new () => Recog }).SpeechRecognition;
    if (!SR) return;
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.lang = "pt-PT";
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (ev) => {
      const last = ev.results[ev.results.length - 1];
      const t = last?.[0]?.transcript ?? "";
      if (t) setDraft({ text: t });
    };
    r.onend = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: AttachmentMeta[] = [];
    let refusedNote = "";
    for (const f of Array.from(files).slice(0, 4)) {
      const blocked = blockedAttachmentReason(f.name, f.type);
      if (blocked) {
        refusedNote = blocked;
        continue;
      }
      try {
        const item = await fileToAttachment(f);
        if (item) next.push(item);
      } catch {
        refusedNote = "Não consegui ler este ficheiro. Envia uma foto ou cola o texto.";
      }
    }
    setRefused(refusedNote);
    if (next.length) setAttachments([...attachments, ...next].slice(0, 4));
  }

  function submit() {
    if (submitLock.current || busy) return;
    const text = draft.text.trim();
    if (!text && attachments.length === 0) return;
    submitLock.current = true;
    try {
      onSubmit(text || "Analisa o que enviei.", attachments);
      setDraft({ text: "" });
      setAttachments([]);
    } finally {
      submitLock.current = false;
    }
  }

  const notes = attachments.map((a) => a.warning).filter((note): note is string => Boolean(note));
  const canSend = !busy && (draft.text.trim().length > 0 || attachments.length > 0);

  return (
    <div className={cn("w-full", variant === "dock" && "bg-bg/80 backdrop-blur-md")}>
      {attachments.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <li
              key={`${a.name}-${i}`}
              className="flex items-center gap-2 rounded-full bg-elevated py-1 pl-3 pr-1 text-xs"
            >
              {a.kind === "image" && a.dataUrl ? (
                <img src={a.dataUrl} alt="" className="size-6 rounded-full object-cover" />
              ) : null}
              <span className="max-w-28 truncate">{a.name}</span>
              <button
                type="button"
                className="grid size-7 place-items-center rounded-full"
                onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                aria-label="Remover"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {refused ? <p className="mb-2 text-xs text-warn">{refused}</p> : null}
      {notes.length > 0 ? <p className="mb-2 text-xs text-warn">{notes[0]}</p> : null}

      <div
        className={cn(
          "flex items-end gap-2 rounded-3xl p-2 transition-[box-shadow] duration-150 focus-within:shadow-[var(--shadow-border-hover)]",
          variant === "overlay"
            ? "bg-bg/62 shadow-[var(--shadow-border)] backdrop-blur-xl"
            : "bg-surface shadow-[var(--shadow-border)]",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,audio/*,.m4a,.mp3,.wav,.ogg,.txt,.md,.csv,.json,.pdf,.docx,application/pdf"
          multiple
          onChange={(e) => onFiles(e.target.files)}
        />
        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-full text-muted shadow-[var(--shadow-border)] transition-[box-shadow,color] duration-150 hover:text-fg hover:shadow-[var(--shadow-border-hover)]"
          onClick={() => fileRef.current?.click()}
          aria-label="Anexar"
        >
          <Paperclip className="size-5" />
        </button>
        <textarea
          ref={taRef}
          rows={1}
          autoFocus={autoFocus}
          value={draft.text}
          placeholder={placeholder}
          onChange={(e) => setDraft({ text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[16px] outline-none placeholder:text-subtle"
        />
        <button
          type="button"
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full transition-[box-shadow,color] duration-150",
            listening
              ? "text-gold shadow-[var(--shadow-gold)]"
              : "text-muted shadow-[var(--shadow-border)] hover:text-fg hover:shadow-[var(--shadow-border-hover)]",
          )}
          onClick={toggleVoice}
          aria-label={listening ? "Parar voz" : "Falar"}
        >
          {listening ? <Square className="size-4" /> : <Mic className="size-5" />}
        </button>
        <Button
          size="icon"
          className="size-11 shrink-0 rounded-2xl"
          disabled={!canSend}
          onClick={submit}
          aria-label="Enviar"
        >
          <ArrowUp className="size-5" />
        </Button>
      </div>
    </div>
  );
}
