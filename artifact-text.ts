export type CheckItem = {
  text: string;
  note?: string;
  group?: string;
  done?: boolean;
};

export function groupChecklist<T extends CheckItem>(items: T[]): { title: string; items: T[] }[] {
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const item of items) {
    const title = (item.group ?? "").trim();
    if (!map.has(title)) {
      map.set(title, []);
      order.push(title);
    }
    map.get(title)?.push(item);
  }
  return order.map((title) => ({ title, items: map.get(title) ?? [] }));
}

export type TextBlock = { type: "list" | "text"; lines: string[] };

/** Turns a section body into paragraphs or bullet lists. Does not invent bullets. */
export function splitBlocks(body: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const bullet = trimmed.match(/^[-•*]\s+(.*)$/);
    const type = bullet ? "list" : "text";
    const value = (bullet ? bullet[1] : trimmed).trim();
    if (!value) continue;
    const last = blocks[blocks.length - 1];
    if (last && last.type === type) last.lines.push(value);
    else blocks.push({ type, lines: [value] });
  }
  return blocks;
}

export function plainChecklist(title: string, groups: { title: string; items: CheckItem[] }[]): string {
  const parts = [title.trim() || "Lista"];
  for (const group of groups) {
    if (group.title) parts.push("", group.title);
    group.items.forEach((item, index) => {
      const note = item.note ? ` (${item.note})` : "";
      parts.push(`${index + 1}. ${item.done ? "[feito] " : ""}${item.text}${note}`);
    });
  }
  return parts.join("\n").trim();
}
