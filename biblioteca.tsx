import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArtifactView, artifactFromLibrary } from "@/components/artifacts/render";
import { useAccountItems } from "@/components/powers/AccountSaves";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { relativeTime } from "@/lib/utils";
import { SAMPLE_BY_POWER } from "@/lib/pilili/samples";
import { POWER_BY_ID } from "@/lib/pilili/powers";
import type { LibraryItem, PowerId } from "@/lib/pilili/types";

export const Route = createFileRoute("/biblioteca")({ component: Biblioteca });

const DEMO_POWERS: PowerId[] = ["negocio", "emprego", "dj"];

const KIND_LABEL: Record<string, string> = {
  emprego_profile: "Perfil de emprego",
  vida_plan: "Plano de vida",
  executar_plan: "Plano de acção",
  image: "Imagem",
  video: "Vídeo curto",
  checklist: "Lista",
  study_pack: "Estudo",
  cv_package: "CV",
  document_insight: "Leitura",
  proposal: "Proposta",
  brand_kit: "Marca",
  campaign: "Campanha",
  website_spec: "Página",
};

function LibraryRow({ item }: { item: LibraryItem }) {
  const [open, setOpen] = useState(false);
  const art = artifactFromLibrary(item);
  const thumb =
    item.kind === "video"
      ? null
      : item.imageUrl || (item.body && item.body.startsWith("data:image") ? item.body : null);
  return (
    <li className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]">
      <button type="button" className="min-h-11 w-full text-left" onClick={() => setOpen((v) => !v)}>
        <p className="text-[11px] uppercase tracking-[0.14em] text-gold">
          {item.power ? (POWER_BY_ID[item.power as PowerId]?.name ?? item.power) : "Conta"} · {KIND_LABEL[item.kind] ?? item.kind}
        </p>
        <p className="font-medium">{item.title}</p>
        <p className="text-xs text-subtle">{relativeTime(item.createdAt)}</p>
      </button>
      {thumb && !open ? (
        <img src={thumb} alt="" loading="lazy" decoding="async" className="mt-3 max-h-40 w-full rounded-xl object-cover" />
      ) : null}
      {open ? (
        <div className="mt-2">
          <ArtifactView artifact={art} />
          {item.conversationId ? (
            <Link
              to="/c/$id"
              params={{ id: item.conversationId }}
              className="mt-2 inline-block min-h-11 text-sm text-gold"
            >
              Abrir a conversa
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function Biblioteca() {
  const { user, isPending } = useCurrentUserState();
  const account = useAccountItems(null);
  const [query, setQuery] = useState("");
  const [power, setPower] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  if (isPending || (user && account.isLoading)) return <p className="px-5 py-10 text-sm text-subtle">A carregar…</p>;
  if (!user) return <RedirectToSignIn />;
  const items = account.data ?? [];
  const powers = [...new Set(items.map((i) => i.power).filter((p): p is string => Boolean(p)))];
  const q = query.trim().toLowerCase();
  const visible = items.filter((i) => {
    if (power && i.power !== power) return false;
    if (!q) return true;
    const name = i.power ? (POWER_BY_ID[i.power as PowerId]?.name ?? i.power) : "";
    return i.title.toLowerCase().includes(q) || i.kind.toLowerCase().includes(q) || name.toLowerCase().includes(q);
  });

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Biblioteca</h1>
      <p className="mt-2 text-sm text-muted">O que guardaste na conta, por Super Poder.</p>
      {items.length === 0 ? (
        <div className="mt-8">
          <p className="text-sm text-subtle">Ainda está vazia. Quando houver uma entrega, fica aqui.</p>
          <button
            type="button"
            className="mt-4 min-h-11 text-sm text-gold"
            onClick={() => setShowExamples((v) => !v)}
          >
            {showExamples ? "Esconder os exemplos" : "Ver um exemplo do formato"}
          </button>
          {showExamples ? (
            <div className="mt-4">
              <p className="text-xs text-subtle">Exemplo. Não é trabalho teu.</p>
              <ul className="mt-3 space-y-3">
                {DEMO_POWERS.map((id) => {
                  const sample = SAMPLE_BY_POWER[id];
                  const power = POWER_BY_ID[id];
                  return (
                    <li key={id}>
                      <ArtifactView artifact={sample} />
                      <Link
                        to="/poderes/$slug"
                        params={{ slug: id }}
                        className="mt-1 inline-flex min-h-11 items-center text-sm text-gold"
                      >
                        Abrir {power.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar"
            aria-label="Procurar na biblioteca"
            className="mt-6 h-11 w-full rounded-2xl bg-surface px-4 text-sm outline-none placeholder:text-subtle"
          />
          {powers.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={`min-h-9 rounded-full px-3 text-xs ${power == null ? "bg-gold text-gold-fg" : "bg-surface text-muted"}`}
                onClick={() => setPower(null)}
              >
                Tudo
              </button>
              {powers.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`min-h-9 rounded-full px-3 text-xs ${power === id ? "bg-gold text-gold-fg" : "bg-surface text-muted"}`}
                  onClick={() => setPower(id)}
                >
                  {POWER_BY_ID[id as PowerId]?.name ?? id}
                </button>
              ))}
            </div>
          ) : null}
          {visible.length === 0 ? (
            <p className="mt-6 text-sm text-subtle">Nada com esse filtro.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {visible.map((i) => (
                <LibraryRow key={i.id} item={i} />
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
