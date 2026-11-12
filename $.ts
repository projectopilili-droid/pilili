import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

function databaseConfigured(): boolean {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  return Boolean(raw.trim());
}

function needsDatabase(request: Request): boolean {
  if (request.method === "GET" || request.method === "OPTIONS") return false;
  return /\/(sign-up|sign-in|callback|oauth2)(\/|$)/.test(new URL(request.url).pathname);
}

async function handle(request: Request): Promise<Response> {
  if (process.env.VERCEL && needsDatabase(request) && !databaseConfigured()) {
    return Response.json(
      {
        message:
          "Falta DATABASE_URL na Vercel. Sem a base de dados não dá para entrar nem criar conta.",
        code: "DATABASE_URL_MISSING",
      },
      { status: 503 },
    );
  }
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});