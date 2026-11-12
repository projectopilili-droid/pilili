import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { runExecution } from "@/lib/server/execute";
import type { AttachmentMeta, PowerId } from "@/lib/pilili/types";
import { POWER_IDS } from "@/lib/pilili/types";

type Body = {
  conversationId: string;
  message: string;
  power?: string | null;
  projectId?: string | null;
  history?: { role: "user" | "assistant"; content: string }[];
  attachments?: AttachmentMeta[];
  idempotencyKey: string;
  context?: string;
};

export const Route = createFileRoute("/api/pilili/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const headers = new Headers(request.headers);
        if (authHeader) headers.set("Authorization", authHeader);
        const session = await auth.api.getSession({ headers });
        const user = session?.user
          ? { id: session.user.id, email: session.user.email ?? null }
          : null;
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response(JSON.stringify({ error: "Pedido inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!body.message?.trim() || !body.conversationId || !body.idempotencyKey) {
          return new Response(JSON.stringify({ error: "Falta a mensagem." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const power =
          body.power && (POWER_IDS as readonly string[]).includes(body.power)
            ? (body.power as PowerId)
            : null;

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const write = (chunk: string) => {
              try {
                controller.enqueue(encoder.encode(chunk));
              } catch {
                /* a ligação já fechou */
              }
            };
            try {
              await runExecution({
                userId: user.id,
                email: user.email,
                conversationId: body.conversationId,
                message: body.message.trim().slice(0, 12000),
                power,
                projectId: body.projectId ?? null,
                history: (body.history ?? []).slice(-12),
                attachments: (body.attachments ?? []).slice(0, 4),
                idempotencyKey: body.idempotencyKey,
                context: typeof body.context === "string" ? body.context.slice(0, 4000) : null,
                write,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : "Falhou a execução.";
              write(`data: ${JSON.stringify({ type: "error", message, retryable: true })}\n\n`);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
