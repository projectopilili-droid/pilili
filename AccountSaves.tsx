import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { listAccountItems, savePowerNote } from "@/lib/server/functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { setNextPath } from "@/lib/client/pending";
import { usePilili } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { POWER_BY_ID } from "@/lib/pilili/powers";
import { ArtifactView, artifactFromLibrary } from "@/components/artifacts/render";
import { parseTaskList } from "@/lib/pilili/tasks";
import type { LibraryItem, PowerId } from "@/lib/pilili/types";

const KIND_LABEL: Record<string, string> = {
  emprego_profile: "Perfil",
  vida_plan: "Rascunho",
  executar_plan: "Rascunho",
  image: "Imagem",
  checklist: "Lista",
  study_pack: "Estudo",
  cv_package: "CV",
  proposal: "Proposta",
  brand_kit: "Marca",
  campaign: "Campanha",
};

const DRAFT_KINDS = new Set(["vida_plan", "executar_plan", "emprego_profile"]);

export function useAccountItems(power?: string | null) {
  const { user, isPending } = useCurrentUserState();
  return useQuery({
    queryKey: ["account-items", user?.id ?? "out", power ?? "all"],
    queryFn: () => listAccountItems({ data: { power: power ?? null } }),
    enabled: Boolean(user) && !isPending,
  });
}

function preview(item: LibraryItem) {
  if (item.kind === "emprego_profile") return "Perfil profissional nesta conta.";
  if (item.kind === "image") return "Imagem nesta conta.";
  const body = item.body ?? "";
  if (body.startsWith("{") || body.startsWith("[")) return item.title;
  return body.replace(/\s+/g, " ").slice(0, 140);
}

export function SavedOnPower({ power }: { power: string }) {
  const q = useAccountItems(power);
  const items = (q.data ?? []).filter((item) => !DRAFT_KINDS.has(item.kind)).slice(0, 5);
  if (!items.length) return null;
  const name = POWER_BY_ID[power as PowerId]?.name ?? power;
  return (
    <section className="mt-6">
      <p className="kicker">Resultados de {name} nesta conta</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
            <p className="text-[11px] uppercase tracking-[0.14em] text-gold">{KIND_LABEL[item.kind] ?? item.kind}</p>
            <p className="mt-1 text-sm">{item.title}</p>
            {item.kind === "checklist" && (power === "vida" || power === "executar") ? (
              <ArtifactView artifact={artifactFromLibrary(item)} />
            ) : (
              <p className="mt-1 text-xs text-subtle">{preview(item)}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PowerDrafts({ kind }: { kind: "vida_plan" | "executar_plan" }) {
  const power = kind === "vida_plan" ? "vida" : "executar";
  const { user, isPending } = useCurrentUserState();
  const q = useAccountItems(power);
  const drafts = (q.data ?? []).filter((item) => item.kind === kind);
  const draft = usePilili((s) => s.draft.text);
  const setDraft = usePilili((s) => s.setDraft);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function open(item: LibraryItem) {
    setEditingId(item.id);
    setDraft({ text: item.body ?? "", power });
    setNote("Aberto da tua conta. Edita e guarda outra vez. Ainda não foi executado.");
    document.getElementById("power-composer")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function save() {
    if (isPending) return;
    if (!user) {
      setNextPath(`/poderes/${power}`);
      nav({ to: "/login" });
      return;
    }
    const body = draft.trim();
    if (body.length < 8) {
      setNote("Escreve o plano ou a lista no campo antes de guardar.");
      return;
    }
    setBusy(true);
    try {
      const title = body.split("\n")[0]?.replace(/^#+\s*/, "").slice(0, 80) || "Plano";
      const result = await savePowerNote({ data: { kind, title, body, id: editingId } });
      if (!result.ok) {
        setNote(result.error);
        return;
      }
      setEditingId(result.id);
      setNote(editingId ? "Actualizado na tua conta. Não foi executado." : "Guardado na tua conta. Não foi executado.");
      await qc.invalidateQueries({ queryKey: ["account-items"] });
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
    } catch {
      setNote("Não ficou na conta. Entra e tenta outra vez. Nada foi enviado ao motor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <Button type="button" variant="line" className="w-full" disabled={busy} onClick={() => void save()}>
        {busy ? "A guardar…" : user ? (editingId ? "Actualizar este rascunho" : "Guardar este rascunho na conta") : "Entra para guardar na conta"}
      </Button>
      {note ? <p className="mt-2 text-xs text-subtle">{note}</p> : null}
      <p className="mt-2 text-xs text-subtle">
        Se o rascunho for uma lista de passos, podes marcar o que já fizeste. Fica na conta. Não é enviado para lado nenhum.
      </p>
      {drafts.length > 0 ? (
        <div className="mt-4">
          <p className="kicker">Rascunhos nesta conta</p>
          <ul className="mt-3 space-y-2">
            {drafts.map((item) => {
              const tasks = parseTaskList(item.body ?? "");
              return (
                <li key={item.id} className="rounded-2xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
                  <p className="text-sm">{item.title}</p>
                  {tasks ? (
                    <ArtifactView artifact={artifactFromLibrary(item)} />
                  ) : (
                    <p className="mt-1 text-xs text-subtle">{preview(item)}</p>
                  )}
                  <button type="button" className="mt-2 min-h-11 text-sm text-gold" onClick={() => open(item)}>
                    Abrir e editar
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : user ? (
        <p className="mt-3 text-xs text-subtle">Ainda não há rascunhos deste poder nesta conta.</p>
      ) : null}
    </div>
  );
}
