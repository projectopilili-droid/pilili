import type { AttachmentMeta } from "@/lib/pilili/types";

export type PendingLaunch = {
  id: string;
  text: string;
  attachments: AttachmentMeta[];
  power: string | null;
  projectId: string | null;
  context?: string;
};

const PENDING_KEY = "pilili.pending";
const NEXT_KEY = "pilili.next";

let held: PendingLaunch | null = null;

export function savePending(p: PendingLaunch) {
  held = p;
  const full = JSON.stringify(p);
  const light = JSON.stringify({
    ...p,
    attachments: p.attachments.map((item) => ({ ...item, dataUrl: undefined })),
  });
  try {
    sessionStorage.setItem(PENDING_KEY, full);
    sessionStorage.setItem(`pilili.pending.${p.id}`, full);
    sessionStorage.setItem(NEXT_KEY, `/c/${p.id}`);
  } catch {
    try {
      sessionStorage.setItem(PENDING_KEY, light);
      sessionStorage.setItem(`pilili.pending.${p.id}`, light);
      sessionStorage.setItem(NEXT_KEY, `/c/${p.id}`);
    } catch {
      /* the copy in memory is enough for this navigation */
    }
  }
}

export function peekPendingFor(id: string): PendingLaunch | null {
  if (held?.id === id) return held;
  return readStored(id, false);
}

export function readPendingFor(id: string): PendingLaunch | null {
  if (held?.id === id) {
    const current = held;
    held = null;
    clearStored(id);
    return current;
  }
  return readStored(id, true);
}

function readStored(id: string, clear: boolean): PendingLaunch | null {
  try {
    const specific = sessionStorage.getItem(`pilili.pending.${id}`);
    if (specific) {
      const parsed = JSON.parse(specific) as PendingLaunch;
      if (clear) clearStored(id);
      return parsed;
    }
    const general = sessionStorage.getItem(PENDING_KEY);
    if (!general) return null;
    const parsed = JSON.parse(general) as PendingLaunch;
    if (parsed.id !== id) return null;
    if (clear) clearStored(id);
    return parsed;
  } catch {
    return null;
  }
}

function clearStored(id: string) {
  try {
    sessionStorage.removeItem(`pilili.pending.${id}`);
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function setNextPath(path: string) {
  try {
    sessionStorage.setItem(NEXT_KEY, path);
  } catch {
    /* ignore */
  }
}

export function peekNextPath(): string {
  try {
    return sessionStorage.getItem(NEXT_KEY) || "/";
  } catch {
    return "/";
  }
}

export function consumeNextPath(): string {
  try {
    const n = sessionStorage.getItem(NEXT_KEY);
    if (n) {
      sessionStorage.removeItem(NEXT_KEY);
      return n;
    }
  } catch {
    /* ignore */
  }
  return "/";
}
