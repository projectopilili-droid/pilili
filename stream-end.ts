import type { StreamEvent } from "@/lib/pilili/types";

export const CLOSED_STREAM_MESSAGE =
  "A ligação fechou antes da resposta. Podes tentar outra vez.";

export const READ_STREAM_MESSAGE = "Não foi possível ler a resposta. Podes tentar outra vez.";

export function hasTerminal(events: { type: string }[]): boolean {
  return events.some((ev) => ev.type === "done" || ev.type === "error");
}

export function closedStreamEvent(): StreamEvent {
  return { type: "error", message: CLOSED_STREAM_MESSAGE, retryable: true };
}
