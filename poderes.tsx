import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { POWERS } from "@/lib/pilili/powers";
import { PowerCard } from "@/components/home/PowerCard";
import { Composer } from "@/components/chat/Composer";
import { savePending } from "@/lib/client/pending";
import { usePilili } from "@/lib/store";
import { uid } from "@/lib/utils";

export const Route = createFileRoute("/poderes")({ component: Poderes });

function Poderes() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/poderes") return <Outlet />;
  return <PoderesIndex />;
}

function PoderesIndex() {
  const nav = useNavigate();

  function go(text: string, power?: string | null) {
    usePilili.getState().setDraft({ text: "" });
    usePilili.getState().setAttachments([]);
    const id = uid();
    savePending({ id, text, attachments: [], power: power ?? null, projectId: null });
    nav({ to: "/c/$id", params: { id } });
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-10 pt-4">
      <div className="relative isolate overflow-hidden rounded-3xl">
        <img src="/powers/overview.png" alt="" className="h-56 w-full object-cover object-[50%_18%] sm:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <p className="kicker text-gold-bright">Descobre</p>
          <h1 className="hero-copy mt-1 font-display text-3xl font-semibold tracking-tight">Super Poderes</h1>
          <p className="mt-1 text-sm text-muted">14 capacidades. Uma só inteligência.</p>
        </div>
      </div>

      <div className="mt-5">
        <Composer onSubmit={(t) => go(t)} placeholder="Diz à tua maneira..." />
        <p className="mt-2 text-center text-sm text-muted">
          Escreve normalmente. Não precisas de saber usar IA.
        </p>
      </div>

      <p className="mt-5 font-display text-xl font-semibold leading-tight tracking-[-0.03em]">
        Tu tens a ideia.
      </p>
      <p className="mt-0.5 text-sm leading-snug text-muted">
        Nós percebemos, organizamos, criamos e entregamos.
      </p>

      <p className="mt-8 text-sm text-muted">Catorze caminhos. Uma inteligência.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {POWERS.map((p) => (
          <PowerCard key={p.id} power={p} />
        ))}
      </div>
    </main>
  );
}
