type Row = { id: string; role: string; content: string };

export function normalizeBody(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** One open turn keeps a single copy of the user text, including the saved row. */
export function appendUserMessage<T extends Row>(messages: T[], message: T): T[] {
  const body = normalizeBody(message.content);
  let lastUser = -1;
  messages.forEach((m, i) => {
    if (m.role === "user" && normalizeBody(m.content) === body) lastUser = i;
  });
  if (lastUser === -1) return [...messages, message];
  const answered = messages.slice(lastUser + 1).some((m) => m.role === "assistant");
  return answered ? [...messages, message] : messages;
}

/** Replace an assistant from the same execution instead of stacking a second one. */
export function commitAssistant<T extends Row>(messages: T[], message: T): T[] {
  const body = normalizeBody(message.content);
  const kept = messages.filter((m) => {
    if (m.role !== "assistant") return true;
    if (m.id === message.id) return false;
    return normalizeBody(m.content) !== body;
  });
  return [...kept, message];
}

/** Keep server rows and local rows that are not already the same message. */
export function mergeConversation<T extends Row>(local: T[], server: T[]): T[] {
  const ids = new Set(server.map((m) => m.id));
  const userText = new Set(server.filter((m) => m.role === "user").map((m) => normalizeBody(m.content)));
  const assistantText = new Set(server.filter((m) => m.role === "assistant").map((m) => normalizeBody(m.content)));
  const extras = local.filter((m) => {
    if (ids.has(m.id)) return false;
    if (m.role === "user" && userText.has(normalizeBody(m.content))) return false;
    if (m.role === "assistant" && assistantText.has(normalizeBody(m.content))) return false;
    return true;
  });
  return [...server, ...extras];
}
