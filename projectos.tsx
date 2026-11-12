import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useBootstrap } from "@/lib/client/bootstrap";
import { createProject } from "@/lib/server/functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { relativeTime } from "@/lib/utils";
import { POWERS } from "@/lib/pilili/powers";

export const Route = createFileRoute("/projectos")({ component: Projectos });

function Projectos() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/projectos") return <Outlet />;
  return <ProjectosIndex />;
}

function ProjectosIndex() {
  const { user, isPending } = useCurrentUserState();
  const boot = useBootstrap();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) return <p className="px-5 py-10 text-sm text-subtle">A carregar…</p>;
  if (!user) return <RedirectToSignIn />;

  const list = boot.data?.projects ?? [];

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Projectos</h1>
      <p className="mt-2 text-sm text-muted">O trabalho em curso. O contexto fica aqui para continuares.</p>
      <form
        className="mt-6 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim() || busy) return;
          setBusy(true);
          setError(null);
          try {
            const r = await createProject({ data: { title: title.trim() } });
            if (!r.ok) {
              setError(r.error);
              return;
            }
            setTitle("");
            await boot.refetch();
            nav({ to: "/projectos/$id", params: { id: r.id } });
          } catch {
            setError("Não foi possível criar o projecto. Tenta outra vez.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Novo projecto" />
        <Button type="submit" disabled={busy || !title.trim()}>
          {busy ? "A criar…" : "Criar"}
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {list.length === 0 ? (
        <div className="mt-10">
          <p className="text-sm text-subtle">Ainda não há projectos. Entra por um Super Poder. O PILILÍ abre um.</p>
          <ul className="mt-5 grid grid-cols-2 gap-2">
            {POWERS.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link
                  to="/poderes/$slug"
                  params={{ slug: p.id }}
                  className="flex min-h-11 items-center gap-3 rounded-2xl bg-surface px-3 py-3 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
                >
                  <img src={p.image} alt="" loading="lazy" decoding="async" className="size-10 rounded-xl object-cover" />
                  <span>
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className="text-[11px] text-subtle">{p.tagline}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/poderes" className="mt-4 inline-flex min-h-11 items-center text-sm text-gold">
            Ver os Super Poderes
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {list.map((p) => (
            <li key={p.id}>
              <Link
                to="/projectos/$id"
                params={{ id: p.id }}
                className="block rounded-2xl bg-surface px-4 py-3 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
              >
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-subtle">
                  {p.kind} · {relativeTime(p.updatedAt)}
                </p>
                {p.summary ? <p className="mt-1 line-clamp-2 text-sm text-muted">{p.summary}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
