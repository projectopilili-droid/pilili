export type TaskLine = { text: string; done: boolean };

const TASK_LINE = /^\s*(?:[-*•]|\d+[.)])\s+(?:\[([ xX✓])\]\s+)?(.+?)\s*$/;

export function parseTaskList(body: string): { title: string; tasks: TaskLine[] } | null {
  const tasks: TaskLine[] = [];
  let title = "";
  for (const line of body.split("\n")) {
    const match = line.match(TASK_LINE);
    if (match?.[2]) {
      const mark = match[1] ?? "";
      tasks.push({ text: match[2], done: mark === "x" || mark === "X" || mark === "✓" });
      continue;
    }
    const plain = line.trim().replace(/^#+\s*/, "");
    if (plain && !title) title = plain.slice(0, 80);
  }
  if (tasks.length >= 2) return { title: title || "Lista", tasks };
  const plain = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (plain.length >= 2 && plain.length <= 40 && plain.every((line) => line.length <= 90 && !line.includes(". "))) {
    return { title: "Lista", tasks: plain.map((text) => ({ text, done: false })) };
  }
  return null;
}

/** Rewrites only the task lines. Keeps titles and notes around them. */
export function applyDoneMarks(body: string, done: boolean[]): string | null {
  let count = 0;
  const lines = body.split("\n").map((line) => {
    const match = line.match(TASK_LINE);
    if (!match?.[2]) return line;
    const flag = done[count] ? "x" : " ";
    count += 1;
    return `- [${flag}] ${match[2]}`;
  });
  if (count >= 2 && done.length === count) return lines.join("\n");
  const parsed = parseTaskList(body);
  if (!parsed || parsed.tasks.length !== done.length) return null;
  const marked = parsed.tasks.map((task, index) => `- [${done[index] ? "x" : " "}] ${task.text}`);
  return [...(parsed.title !== "Lista" ? [parsed.title, ""] : []), ...marked].join("\n");
}

export function taskProgress(done: number, total: number): string {
  const open = Math.max(0, total - done);
  const doneLabel = done === 1 ? "1 feita" : `${done} feitas`;
  const openLabel = open === 1 ? "1 por fazer" : `${open} por fazer`;
  if (total === 0) return "Sem tarefas.";
  if (open === 0) return `${doneLabel}. Nada por fazer.`;
  if (done === 0) return `${openLabel}.`;
  return `${doneLabel} · ${openLabel}.`;
}
