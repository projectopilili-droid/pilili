import { createFileRoute } from "@tanstack/react-router";
import { finishSpotifyLink } from "@/lib/server/spotify";

export const Route = createFileRoute("/api/spotify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;
        const ok = await finishSpotifyLink({
          code: url.searchParams.get("code") || "",
          state: url.searchParams.get("state") || "",
          origin,
        }).catch(() => false);
        if (!ok) {
          return new Response(
            "<!doctype html><meta charset=\"utf-8\"><title>Spotify</title><p>Não foi possível ligar o Spotify. Volta ao DJ PILILÍ e tenta outra vez.</p><p><a href=\"/poderes/dj\">Voltar ao DJ PILILÍ</a></p>",
            { status: 400, headers: { "content-type": "text/html; charset=utf-8" } },
          );
        }
        return new Response(null, { status: 302, headers: { location: "/poderes/dj" } });
      },
    },
  },
});
