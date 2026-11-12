import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArtifactView, artifactFromLibrary } from "@/components/artifacts/render";
import { Composer } from "@/components/chat/Composer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBootstrap } from "@/lib/client/bootstrap";
import { savePending } from "@/lib/client/pending";
import { renameProject } from "@/lib/server/functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { POWER_BY_ID } from "@/lib/pilili/powers";
import { POWER_IDS, type PowerId } from "@/lib/pilili/types";
import { relativeTime, uid } from "@/lib/utils";
import { usePilili } from "@/lib/store";

export const Route = createFileRoute("/projectos/$id")({ component: ProjectPage });

function ProjectPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const boot = useBootstrap();
  const nav = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  if (isPending) return <p className="px-5 py-10 text-sm text-subtle">A carregar…</p>;
  if (!user) return <RedirectToSignIn />;
  const project = boot.data?.projects.find((p) => p.id === id);
  const convos = (boot.data?.conversations ?? []).filter((c) => c.projectId === id);
  const files = (boot.data?.library ?? []).filter((i) => i.projectId === id);

  if (!project) {
    return (
      <main className="px-5 py-10">
        <p>Projecto não encontrado.</p>
        <Link to="/projectos" className="mt-4 inline-flex min-h-11 items-center text-sm text-gold">
          Voltar aos projectos
        </Link>
      </main>
    );
  }

  const powerId = (POWER_IDS as readonly string[]).includes(project.kind) ? (project.kind as PowerId) : null;
  const power = powerId ? POWER_BY_ID[powerId] : null;

  function launch(text: string, attachments: Parameters<typeof savePending>[0]["attachments"] = []) {
    usePilili.getState().setDraft({ text: "" });
    usePilili.getState().setAttachments([]);
    const cid = uid();
    savePending({
      id: cid,
      text,
      attachments,
      power: powerId,
      projectId: id,
    });
    nav({ to: "/c/$id", params: { id: cid } });
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold">{power?.name ?? project.kind}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{project.title}</h1>
      {renaming ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setRenameError(null);
            const r = await renameProject({ data: { id, title: name } });
            if (!r.ok) {
              setRenameError(r.error);
              return;
            }
            setRenaming(false);
            await boot.refetch();
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Novo nome do projecto" />
          <Button type="submit" disabled={!name.trim()}>
            Guardar
          </Button>
        </form>
      ) : (
        <button
          type="button"
          className="mt-2 min-h-11 text-sm text-gold"
          onClick={() => {
            setName(project.title);
            setRenameError(null);
            setRenaming(true);
          }}
        >
          Mudar o nome
        </button>
      )}
      {renameError ? <p className="mt-2 text-sm text-danger">{renameError}</p> : null}
      {project.summary ? <p className="mt-3 text-muted">{project.summary}</p> : null}

      <section className="mt-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-subtle">Continuar este projecto</p>
        <div className="mt-3">
          <Composer
            onSubmit={(t, files) => launch(t, files)}
            placeholder="Continua a partir daqui…"
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg">Conversas</h2>
        <ul className="mt-3 space-y-2">
          {convos.map((c) => (
            <li key={c.id}>
              <Link to="/c/$id" params={{ id: c.id }} className="block min-h-11 rounded-2xl bg-surface px-4 py-3 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]">
                <p>{c.title}</p>
                <p className="text-xs text-subtle">{relativeTime(c.updatedAt)}</p>
              </Link>
            </li>
          ))}
          {convos.length === 0 ? <p className="text-sm text-subtle">Ainda não há conversas neste projecto.</p> : null}
        </ul>
      </section>
      <section className="mt-8 pb-8">
        <h2 className="font-display text-lg">Ficheiros</h2>
        <ul className="mt-3 space-y-3">
          {files.map((f) => (
            <li key={f.id}>
              <ArtifactView artifact={artifactFromLibrary(f)} />
            </li>
          ))}
          {files.length === 0 ? <p className="text-sm text-subtle">As entregas deste projecto aparecem aqui.</p> : null}
        </ul>
      </section>
    </main>
  );
}
