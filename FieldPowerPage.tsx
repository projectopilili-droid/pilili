import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Composer } from "@/components/chat/Composer";
import { PowerHero } from "@/components/powers/PowerHero";
import { savePending } from "@/lib/client/pending";
import type { PowerDef } from "@/lib/pilili/powers";
import { usePilili } from "@/lib/store";
import { uid } from "@/lib/utils";

type Card = { title: string; detail: string; image: string };

const PAGES: Record<string, { ask: string; placeholder: string; steps: string[]; close: string; cards: Card[] }> = {
  prof: {
    ask: "O que precisas de organizar?",
    placeholder: "Descreve a turma ou anexa as fotografias dos papéis.",
    steps: [
      "Tiras fotos dos documentos",
      "O PILILÍ lê e organiza a informação",
      "Recebes um PDF limpo e estruturado",
    ],
    close: "A TUA TURMA. OS TEUS DADOS. O TEU TEMPO.",
    cards: [
      {
        title: "Lista de alunos",
        detail: "Organiza os nomes a partir da fotografia da lista.",
        image: "/prof/lista.jpg?v=3",
      },
      {
        title: "Notas e avaliações",
        detail: "Passa notas e avaliações para um documento limpo.",
        image: "/prof/notas.jpg?v=2",
      },
      {
        title: "Relatórios de turma",
        detail: "Estrutura o relatório com a informação que enviares.",
        image: "/prof/relatorios.jpg?v=2",
      },
      {
        title: "Dados administrativos",
        detail: "Junta dados administrativos num documento claro.",
        image: "/prof/dados.jpg?v=2",
      },
    ],
  },
  investiga: {
    ask: "O que precisas de investigar?",
    placeholder: "Explica o problema ou a pergunta.",
    steps: [
      "Explicas o problema ou a pergunta com clareza",
      "O PILILÍ pesquisa, analisa e cruza a informação disponível",
      "Recebes uma resposta estruturada, com opções, argumentos e próximos passos",
    ],
    close: "A TUA PERGUNTA. A TUA ANÁLISE. A TUA SOLUÇÃO.",
    cards: [
      {
        title: "Analisar um problema técnico ou científico",
        detail: "Parte do problema e organiza o que já se sabe.",
        image: "/investiga/problema.jpg?v=2",
      },
      {
        title: "Cruzar informação de várias fontes",
        detail: "Junta o que tens e separa o que ainda falta confirmar.",
        image: "/investiga/fontes.jpg?v=2",
      },
      {
        title: "Avaliar opções e chegar a uma conclusão",
        detail: "Compara caminhos e mostra o que pesa em cada um.",
        image: "/investiga/opcoes.jpg?v=2",
      },
      {
        title: "Preparar uma proposta ou relatório fundamentado",
        detail: "Estrutura argumentos, limites e próximos passos.",
        image: "/investiga/relatorio.jpg?v=2",
      },
      {
        title: "Encontrar soluções para um desafio específico",
        detail: "Apresenta caminhos concretos a partir do desafio.",
        image: "/investiga/solucao.jpg?v=2",
      },
    ],
  },
};

export function FieldPowerPage({ power }: { power: PowerDef }) {
  const page = PAGES[power.id];
  const nav = useNavigate();
  if (!page) return null;

  function focusRequest() {
    usePilili.getState().setDraft({ text: "", power: power.id });
    requestAnimationFrame(() => {
      const box = document.getElementById("power-composer");
      box?.scrollIntoView({ behavior: "smooth", block: "center" });
      box?.querySelector("textarea")?.focus();
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-10 pt-3">
      <Link
        to="/poderes"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted transition-colors duration-150 hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>
      <PowerHero power={power} />
      <p className="mt-3 text-lg text-gold">{power.tagline}</p>
      <p className="mt-2 text-muted">{power.promise}</p>
      <h2 className="mt-8 font-display text-2xl font-semibold">{page.ask}</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {page.cards.map((item) => (
          <li key={item.title} className={page.cards.length % 2 === 1 && item === page.cards[page.cards.length - 1] ? "col-span-2" : ""}>
            <button
              type="button"
              className="w-full overflow-hidden rounded-2xl bg-surface text-left shadow-[var(--shadow-border)]"
              onClick={focusRequest}
            >
              <img src={item.image} alt="" loading="lazy" decoding="async" className="h-32 w-full object-cover object-center" />
              <span className="block px-3 pt-2 text-sm font-medium leading-tight">{item.title}</span>
              <span className="mt-1 block px-3 text-[11px] leading-snug text-muted">{item.detail}</span>
              <span className="mt-2 block px-3 pb-3 text-xs text-gold">Começar</span>
            </button>
          </li>
        ))}
      </ul>
      <div id="power-composer" className="mt-8">
        <Composer
          placeholder={page.placeholder}
          onSubmit={(text, files) => {
            usePilili.getState().setDraft({ text: "" });
            const id = uid();
            savePending({ id, text, attachments: files, power: power.id, projectId: null });
            nav({ to: "/c/$id", params: { id } });
          }}
        />
      </div>
      <p className="kicker mt-8 text-subtle">Como funciona</p>
      <ol className="mt-3 space-y-2">
        {page.steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm">
            <span className="font-mono text-gold">{String(i + 1).padStart(2, "0")}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="pb-6 pt-8">
        <p className="text-lg font-semibold leading-snug">{page.close}</p>
        <p className="mt-2 text-sm text-gold">Tu pedes. O PILILÍ executa.</p>
      </div>
    </main>
  );
}
