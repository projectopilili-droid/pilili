export function isDjSession(message: string): boolean {
  return /sess[aã]o dj|quero uma sess[aã]o|ocasi[aã]o:/i.test(message);
}

export function spotifyReady(id?: string | null, secret?: string | null): boolean {
  return Boolean(id?.trim() && secret?.trim());
}

export function spotifyRedirect(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/spotify/callback`;
}

export function spotifyAuthorizeUrl(opts: { clientId: string; redirect: string; state: string }): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    scope: "playlist-modify-private user-read-private",
    redirect_uri: opts.redirect,
    state: opts.state,
  });
  return `https://accounts.spotify.com/authorize?${q}`;
}

export type DjPhase = {
  phase: string;
  minutes: number;
  energy: number;
  style: string;
  notes: string;
  queries: string[];
};

export function parseDjArc(raw: string): { title: string; arc: DjPhase[] } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const json = JSON.parse(raw.slice(start, end + 1)) as { title?: unknown; arc?: unknown };
    if (!Array.isArray(json.arc) || json.arc.length === 0) return null;
    const arc = json.arc.slice(0, 6).map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const queries = Array.isArray(row.queries) ? row.queries.map((q) => String(q).trim()).filter(Boolean).slice(0, 3) : [];
      return {
        phase: clean(String(row.phase || "meio"), 40),
        minutes: Math.max(5, Math.min(180, Number(row.minutes) || 15)),
        energy: Math.max(1, Math.min(10, Number(row.energy) || 5)),
        style: clean(String(row.style || ""), 40),
        notes: clean(String(row.notes || ""), 240),
        queries,
      };
    });
    return { title: clean(String(json.title || "Sessão"), 80), arc };
  } catch {
    return null;
  }
}

export function stylesFromMessage(message: string): string[] {
  const found = message.match(/Estilos:\s*([^.]+)/i);
  if (!found) return [];
  return found[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function clean(value: string, max: number): string {
  return value.replace(/\u2014/g, "-").replace(/\s+/g, " ").trim().slice(0, max);
}
