import { existsSync, readFileSync } from "node:fs";

/** Direct Google OAuth for pilili.app. Credentials come only from the environment. */
export const GOOGLE_REDIRECT_URI = "https://pilili.app/api/auth/callback/google";

function envValue(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  if (!existsSync(".env")) return undefined;
  try {
    const text = readFileSync(".env", "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq).trim();
      if (key !== name) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value.trim() || undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function googleOAuthCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = envValue("GOOGLE_CLIENT_ID");
  const clientSecret = envValue("GOOGLE_CLIENT_SECRET");
  const base = envValue("BETTER_AUTH_URL");
  if (!clientId || !clientSecret || !base) return null;
  try {
    if (new URL(base).origin !== "https://pilili.app") return null;
  } catch {
    return null;
  }
  return { clientId, clientSecret };
}
