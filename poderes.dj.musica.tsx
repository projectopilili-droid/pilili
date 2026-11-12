import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MusicTask } from "@/components/powers/StudioTasks";

export const Route = createFileRoute("/poderes/dj/musica")({ component: Musica });

function Musica() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-10 pt-3">
      <Link
        to="/poderes/$slug"
        params={{ slug: "dj" }}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted"
      >
        <ArrowLeft className="size-4" />
        Voltar ao DJ PILILÍ
      </Link>

      <div className="mt-3 overflow-hidden rounded-3xl">
        <img src="/powers/dj-deck.jpg" alt="" className="h-auto w-full" />
      </div>
      <h1 className="mt-4 font-display text-3xl font-semibold">Cria a tua música</h1>

      <p className="mt-4 text-muted">Transforma a tua ideia em som original com o PILILÍ.</p>
      <MusicTask />

      <p className="mt-8 text-lg font-semibold leading-snug">CRIA O TEU SOM. MARCA A TUA IDENTIDADE.</p>
      <p className="mt-2 text-sm text-gold">Tu pedes. O PILILÍ executa.</p>
    </main>
  );
}
