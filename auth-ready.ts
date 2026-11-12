import { createServerFn } from "@tanstack/react-start";

function filled(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

/** What this deployment can actually sign in with. Preview keeps the broker. */
export const authReady = createServerFn({ method: "GET" }).handler(async () => {
  const { googleOAuthCredentials } = await import("./google.server");
  return {
    database: filled("DATABASE_URL") || filled("POSTGRES_URL"),
    googleDirect: googleOAuthCredentials() !== null,
    broker:
      (filled("GROK_AUTH_CLIENT_ID") && filled("GROK_AUTH_CLIENT_SECRET")) || !process.env.VERCEL,
  };
});
