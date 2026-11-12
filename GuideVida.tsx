import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { usePilili } from "@/lib/store";

const PATHS = [
  { id: "semana", label: "Semana" },
  { id: "familia", label: "Família" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "viagem", label: "Viagem" },
  { id: "casa", label: "Casa" },
  { id: "lista", label: "Lista" },
] as const;

type PathId = (typeof PATHS)[number]["id"];

export function GuideVida() {
  const setDraft = usePilili((s) => s.setDraft);
  const [active, setActive] = useState<PathId | null>(null);

  function choose(id: PathId) {
    setActive(id);
    setDraft({ text: "", power: "vida" });
    requestAnimationFrame(() => {
      const box = document.getElementById("power-composer");
      box?.scrollIntoView({ behavior: "smooth", block: "center" });
      const field = box?.querySelector("textarea");
      field?.focus();
    });
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-semibold">Vamos pôr as tuas prioridades em ordem</h2>
      <p className="mt-1 text-sm text-muted">O que precisas de resolver? O que é mais importante agora?</p>
      <p className="mt-1 text-sm text-muted">Escolhe uma área ou descreve a tua situação.</p>
      <p className="kicker mt-4">Escolhe por onde começar</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PATHS.map((path) => (
          <Chip key={path.id} selected={active === path.id} onClick={() => choose(path.id)}>
            {path.label}
          </Chip>
        ))}
      </div>
    </section>
  );
}