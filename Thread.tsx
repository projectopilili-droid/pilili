import { ArtifactView } from "@/components/artifacts/render";
import { Markdown } from "@/components/md";
import { speakText } from "@/lib/server/functions";
import type { ChatMessage } from "@/lib/pilili/types";
import { parsePililiOutput } from "@/lib/pilili/parse";
import { visibleStreamText, withoutLongDash } from "@/lib/pilili/format-answer";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";

function Speak({ text }: { text: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs text-subtle transition-colors duration-150 hover:text-gold"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await speakText({ data: { text: text.slice(0, 800) } });
          if (r.ok) {
            const a = new Audio(r.audio);
            await a.play();
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <Volume2 className="size-3.5" /> {busy ? "A ler…" : "Ouvir"}
    </button>
  );
}

function speakable(message: ChatMessage): string {
  const audio = message.artifacts.find((item) => item.type === "audio_brief" && item.payload.file !== true);
  const body = typeof audio?.payload.body === "string" ? audio.payload.body.trim() : "";
  return body || message.content;
}

function reveal(message: ChatMessage): ChatMessage {
  if (message.role !== "assistant" || !/<pilili_artifact\b/i.test(message.content)) return message;
  const parsed = parsePililiOutput(message.content);
  const artifacts = [...message.artifacts];
  for (const art of parsed.artifacts) {
    if (!artifacts.some((item) => item.type === art.type && item.title === art.title)) artifacts.push(art);
  }
  return { ...message, content: parsed.text, artifacts };
}

export function MessageList({
  messages,
  streamingText,
  onContinue,
}: {
  messages: ChatMessage[];
  streamingText?: string;
  onContinue?: (text: string) => void;
}) {
  const shown = streamingText ? visibleStreamText(streamingText) : "";
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-4">
    {messages.map((m) => {
          const shown = reveal(m);
          return (
        <article key={shown.id} className={cn(shown.role === "user" ? "ml-8" : "")}>
          {shown.role === "user" ? (
            <div className="rounded-2xl rounded-br-md bg-gold-soft px-4 py-3 text-[15px] leading-relaxed text-fg shadow-[var(--shadow-border)]">
              {shown.content}
            </div>
          ) : (
            <div className="rounded-2xl rounded-bl-md bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
              <Markdown text={shown.content} />
              {shown.artifacts.map((a) => (
                <ArtifactView key={a.id} artifact={a} />
              ))}
              {shown.nextStep ? (
                onContinue ? (
                  <button
                    type="button"
                    className="mt-3 min-h-11 w-full rounded-2xl bg-elevated px-4 py-3 text-left text-sm text-gold shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
                    onClick={() => onContinue(shown.nextStep!)}
                  >
                    A seguir · {withoutLongDash(shown.nextStep)}
                  </button>
                ) : (
                  <p className="mt-3 text-sm text-gold">A seguir · {withoutLongDash(shown.nextStep)}</p>
                )
              ) : null}
              {speakable(shown) ? <Speak text={speakable(shown)} /> : null}
            </div>
          )}
        </article>
          );
        })}
      {shown ? (
        <article>
          <div className="rounded-2xl rounded-bl-md bg-surface px-4 py-3 text-[15px] leading-relaxed shadow-[var(--shadow-border)]">
            <Markdown text={shown} />
            <span className="mt-1 inline-block h-3.5 w-px animate-pulse bg-gold align-middle" aria-hidden="true" />
          </div>
        </article>
      ) : null}
    </div>
  );
}
