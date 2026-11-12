import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Composer } from "@/components/chat/Composer";
import { PowerCard } from "@/components/home/PowerCard";
import { CompactOpeningStrip } from "@/components/home/Opening";
import { BrandLogo } from "@/components/brand/mark";
import { POWERS } from "@/lib/pilili/powers";
import { usePilili } from "@/lib/store";
import { useBootstrap } from "@/lib/client/bootstrap";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { savePending } from "@/lib/client/pending";
import { uid, relativeTime } from "@/lib/utils";
import type { AttachmentMeta } from "@/lib/pilili/types";

export const Route = createFileRoute("/")({ component: Home });

function clearDraft() {
  usePilili.getState().setDraft({ text: "" });
  usePilili.getState().setAttachments([]);
}

function Home() {
  const nav = useNavigate();
  const lowData = usePilili((s) => s.lowData);
  const boot = useBootstrap();
  const { user, isPending } = useCurrentUserState();
  const [playHero, setPlayHero] = useState(false);
  const firstName = user?.displayName?.trim().split(/\s+/)[0];

  useEffect(() => {
    if (lowData) return;
    const t = window.setTimeout(() => setPlayHero(true), 700);
    return () => window.clearTimeout(t);
  }, [lowData]);

  function go(text: string, attachments: AttachmentMeta[], power?: string | null) {
    clearDraft();
    const id = uid();
    savePending({ text, attachments, power: power ?? null, projectId: null, id });
    nav({ to: "/c/$id", params: { id } });
  }

  return (
    <main>
      <section>
        <div className="flex flex-col items-center px-6 pb-3 pt-12">
          <BrandLogo size="hero" />
          {!isPending && firstName ? (
            <p className="hero-copy mt-3 text-sm text-gold-bright">Olá {firstName}</p>
          ) : null}
          {import.meta.env.DEV ? (
            <a
              href="/PILILI-vercel.zip"
              download="PILILI-vercel.zip"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-medium text-gold-fg"
            >
              Descarregar o projecto
            </a>
          ) : null}
        </div>
        <div className="relative isolate aspect-[3/2] w-full overflow-hidden">
          <img
            src="/hero.jpg"
            alt="Marginal de Luanda ao pôr-do-sol"
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {!lowData && playHero ? (
            <video
              className="absolute inset-0 h-full w-full object-cover object-center"
              autoPlay
              muted
              playsInline
              poster="/hero.jpg"
              aria-hidden
              onEnded={(e) => {
                const v = e.currentTarget;
                v.currentTime = 0.35;
                v.pause();
              }}
            >
              <source src="/hero.mp4" type="video/mp4" />
            </video>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-bg" />
          <div className="relative flex h-full flex-col items-center justify-center px-5 pb-8 text-center">
            <p className="hero-copy text-sm text-gold-bright sm:text-base">Da Ideia à Realidade</p>
            <h1 className="hero-copy mt-2 font-display text-[2.15rem] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl">
              Diz-me o que
              <br />
              <span className="text-gold">precisas.</span>
            </h1>
            <p className="hero-copy mt-2 text-sm text-fg sm:text-base">O PILILÍ trata do resto.</p>
          </div>
        </div>
        <div className="relative z-10 mx-auto -mt-7 w-full max-w-2xl px-5 pb-2">
          <Composer
            autoFocus
            placeholder="O que queres que o PILILÍ faça?"
            onSubmit={(text, files) => go(text, files)}
          />
          <p className="mt-3 text-center text-sm text-muted">
            Escreve o que queres feito.
          </p>
        </div>
      </section>

      <section id="super-poderes" className="mx-auto max-w-2xl px-5 pb-6 pt-4">
        <p className="font-display text-xl font-semibold leading-tight tracking-[-0.03em]">
          Tu tens a ideia.
        </p>
        <p className="mt-0.5 text-sm leading-snug text-muted">
          Nós percebemos, organizamos, criamos e entregamos.
        </p>

        <p className="kicker mt-4">Super poderes</p>
        <h2 className="mt-1 font-display text-2xl font-semibold">Catorze caminhos. Uma inteligência.</h2>
        <p className="mt-2 text-sm text-muted">
          Não precisas de saber qual ferramenta usar. Entras pelo caminho mais próximo. O PILILÍ trata do resto.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {POWERS.map((p) => (
            <PowerCard key={p.id} power={p} />
          ))}
        </div>
        <CompactOpeningStrip />
        <ul className="mt-3 grid grid-cols-2 gap-3">
          <li>
            <Link
              to="/apoio"
              className="block rounded-2xl bg-surface p-2 shadow-[var(--shadow-border)]"
            >
              <div className="h-16 overflow-hidden rounded-xl">
                <img src="/apoio.jpg" alt="" className="h-full w-full object-cover object-center" />
              </div>
              <p className="mt-2 text-center text-xs font-medium tracking-[0.08em]">APOIAR PILILÍ</p>
            </Link>
          </li>
          <li>
            <Link
              to="/feedback"
              className="block rounded-2xl bg-surface p-2 shadow-[var(--shadow-border)]"
            >
              <div className="h-16 overflow-hidden rounded-xl">
                <img src="/videos/opening.jpg" alt="" className="h-full w-full object-cover object-center" />
              </div>
              <p className="mt-2 text-center text-xs font-medium">Dar feedback</p>
            </Link>
          </li>
        </ul>
      </section>

      {boot.data && (boot.data.projects.length > 0 || boot.data.conversations.length > 0) ? (
        <section className="mx-auto max-w-2xl px-5 pb-12">
          <p className="kicker text-subtle">Continuar</p>
          <ul className="mt-3 space-y-2">
            {boot.data.conversations.slice(0, 3).map((c) => (
              <li key={c.id}>
                <Link
                  to="/c/$id"
                  params={{ id: c.id }}
                  className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
                >
                  <span>
                    <span className="block font-medium">{c.title}</span>
                    <span className="text-xs text-subtle">{c.power ?? "conversa"}</span>
                  </span>
                  <span className="text-xs text-subtle">{relativeTime(c.updatedAt)}</span>
                </Link>
              </li>
            ))}
            {boot.data.projects.slice(0, 3).map((p) => (
              <li key={p.id}>
                <Link
                  to="/projectos/$id"
                  params={{ id: p.id }}
                  className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
                >
                  <span>
                    <span className="block font-medium">{p.title}</span>
                    <span className="text-xs text-subtle">{p.kind}</span>
                  </span>
                  <span className="text-xs text-subtle">{relativeTime(p.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
