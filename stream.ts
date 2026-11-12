import { getBearerToken } from "@/lib/auth/client";
import { CLOSED_STREAM_MESSAGE, hasTerminal, READ_STREAM_MESSAGE } from "@/lib/client/stream-end";
import type { AttachmentMeta, StreamEvent } from "@/lib/pilili/types";

export async function streamPilili(opts: {
  conversationId: string;
  message: string;
  power?: string | null;
  projectId?: string | null;
  history: { role: "user" | "assistant"; content: string }[];
  attachments: AttachmentMeta[];
  idempotencyKey: string;
  context?: string;
  onEvent: (ev: StreamEvent) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const seen: StreamEvent[] = [];
  const emit = (ev: StreamEvent) => {
    seen.push(ev);
    opts.onEvent(ev);
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const bearer = getBearerToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  try {
    const res = await fetch("/api/pilili/stream", {
      method: "POST",
      headers,
      body: JSON.stringify({
        conversationId: opts.conversationId,
        message: opts.message,
        power: opts.power,
        projectId: opts.projectId,
        history: opts.history,
        attachments: opts.attachments,
        idempotencyKey: opts.idempotencyKey,
        context: opts.context,
      }),
      signal: opts.signal,
    });

    if (res.status === 401) {
      emit({ type: "error", message: "Unauthorized", retryable: false });
      return;
    }
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      emit({
        type: "error",
        message: t || "Não foi possível começar. Tenta outra vez.",
        retryable: true,
      });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      if (opts.signal?.aborted) {
        await reader.cancel().catch(() => {});
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const chunks = buf.split("\n\n");
      buf = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const line = chunk
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .join("");
        if (!line) continue;
        try {
          emit(JSON.parse(line) as StreamEvent);
        } catch {
          /* a bad chunk is ignored; a stream with no terminal still fails below */
        }
      }
    }
  } catch {
    if (!hasTerminal(seen)) {
      emit({ type: "error", message: READ_STREAM_MESSAGE, retryable: true });
    }
    return;
  }

  if (!hasTerminal(seen)) {
    emit({ type: "error", message: CLOSED_STREAM_MESSAGE, retryable: true });
  }
}
