import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { OUTPUT_LABELS, POWER_BY_ID } from "@/lib/pilili/powers";
import { SAMPLE_BY_POWER } from "@/lib/pilili/samples";
import { ArtifactView } from "@/components/artifacts/render";
import { Button } from "@/components/ui/button";
import { Composer } from "@/components/chat/Composer";
import { GuideDj } from "@/components/powers/GuideDj";
import { GuideEstuda } from "@/components/powers/GuideEstuda";
import { GuideEmprego } from "@/components/powers/GuideEmprego";
import { GuideBurocracia } from "@/components/powers/GuideBurocracia";
import { GuideQuick, hasQuickGuide } from "@/components/powers/GuideQuick";
import { GuideVida } from "@/components/powers/GuideVida";
import { PowerHero } from "@/components/powers/PowerHero";
import { uid } from "@/lib/utils";
import { savePending } from "@/lib/client/pending";
import { startBlankChat } from "@/lib/client/blank-chat";
import { POWER_FACE, POWER_HONEST } from "@/lib/pilili/page-copy";
import { SavedOnPower, PowerDrafts } from "@/components/powers/AccountSaves";
import { GuideDigital } from "@/components/powers/GuideDigital";
import { FieldPowerPage } from "@/components/powers/FieldPowerPage";
import { StudioCards } from "@/components/powers/StudioTasks";
import { usePilili } from "@/lib/store";
import type { PowerId } from "@/lib/pilili/types";

const NEGOCIO_HINT = "O que queres criar ou desenvolver no teu negócio?";
const EMPREGO_PLACEHOLDER = "O que queres alcançar na tua carreira?";
const EMPREGO_AUX =
  "Conta-me a vaga que procuras, o CV que precisas de melhorar ou a entrevista para a qual te queres preparar.";
const ESTUDA_IDEAS = [
  "Explica-me este assunto de forma simples.",
  "Prepara um plano de estudo para o meu exame.",
  "Cria exercícios e um resumo para eu praticar.",
];
const EMPREGO_SEARCH = new Set([
  "Quero encontrar trabalho remoto.",
  "Ajuda-me a procurar emprego no estrangeiro.",
]);
const EMPREGO_SEARCH_NOTE =
  'Prepara palavras-chave e adapta o perfil. Não inventes anúncios. Termina com a frase exacta "Para encontrar vagas, procura nestes portais:" e estes links, sem mudar os endereços: [Jobartis](https://www.jobartis.com) [Ango Emprego](https://angoemprego.com) [Angola Emprego](https://angolaemprego.com) [Empregos Yoyota](https://empregosyoyota.net) [Angorecruta](https://angorecruta.com) [LinkedIn](https://www.linkedin.com/jobs)';
const EMPREGO_IDEAS = [
  "Prepara o meu CV para esta vaga.",
  "Ajuda-me a preparar uma entrevista.",
  "Adapta o meu perfil a este anúncio.",
  "Quero encontrar trabalho remoto.",
  "Ajuda-me a procurar emprego no estrangeiro.",
];
const NEGOCIO_IDEAS = [
  "Quero criar um negócio e desenvolver a marca.",
  "Elabora uma proposta comercial e um plano de negócio.",
  "Prepara o marketing, as vendas e um orçamento comercial.",
  "Quero um catálogo e uma apresentação para o lançamento.",
];

export const Route = createFileRoute("/poderes/$slug")({ component: PowerPage });

function PowerPage() {
  const { slug } = Route.useParams();
  const power = POWER_BY_ID[slug as PowerId];
  const nav = useNavigate();

  if (!power) {
    return (
      <main className="px-5 py-10">
        <p>Este poder não existe.</p>
        <Link to="/poderes" className="mt-4 inline-block min-h-11 text-sm text-gold">
          Ver os Super Poderes
        </Link>
      </main>
    );
  }

  if (power.id === "prof" || power.id === "investiga") {
    return <FieldPowerPage power={power} />;
  }

  function launch(text: string, context?: string) {
    usePilili.getState().setDraft({ text: "" });
    usePilili.getState().setAttachments([]);
    const id = uid();
    savePending({
      id,
      text,
      attachments: [],
      power: power.id,
      projectId: null,
      context,
    });
    nav({ to: "/c/$id", params: { id } });
  }

  function prepare(text: string) {
    usePilili.getState().setDraft({ text, power: power.id });
    requestAnimationFrame(() => {
      const box = document.getElementById("power-composer");
      box?.scrollIntoView({ behavior: "smooth", block: "center" });
      box?.querySelector("textarea")?.focus();
    });
  }

  if (power.id === "negocio") {
    const shortcuts = [
      {
        title: "Criar um negócio",
        detail: "Transforma a tua ideia num conceito claro: o que vais oferecer, a quem e como começar.",
        image: "/negocio/criar.jpg",
      },
      {
        title: "Criar uma marca",
        detail: "Desenvolve o nome, o posicionamento, a mensagem e a proposta de valor.",
        image: "/negocio/marca.jpg",
      },
      {
        title: "Preparar propostas e planos",
        detail: "Elabora propostas comerciais, planos e documentos profissionais.",
        image: "/negocio/planos.jpg",
      },
      {
        title: "Criar produtos e catálogos",
        detail: "Organiza produtos ou serviços, descrições, preços e ofertas.",
        image: "/negocio/catalogo.jpg",
      },
      {
        title: "Atrair clientes e vender",
        detail: "Prepara campanhas, conteúdos e mensagens comerciais.",
        image: "/negocio/vender.jpg",
      },
      {
        title: "Organizar as finanças",
        detail: "Estrutura custos, preços, margens e orçamentos.",
        image: "/negocio/financas.jpg",
      },
      {
        title: "Lançar um negócio",
        detail: "Organiza tarefas, recursos e prioridades para o lançamento.",
        image: "/negocio/lancar.jpg",
      },
      {
        title: "Fazer crescer o negócio",
        detail: "Identifica oportunidades e prepara estratégias para aumentar as vendas.",
        image: "/negocio/crescer.jpg",
      },
    ];
    const starts = [
      "Quero criar um negócio com pouco capital.",
      "Tenho uma ideia e quero transformá-la num plano.",
      "Quero criar uma marca e preparar os meus produtos.",
      "Preciso de uma proposta comercial.",
      "Quero definir preços e margens.",
      "Preciso de conquistar mais clientes.",
      "Quero preparar uma campanha de marketing.",
      "Quero lançar um produto ou serviço.",
    ];
    function focusRequest() {
      usePilili.getState().setDraft({ text: "", power: "negocio" });
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
        <p className="mt-3 text-lg text-gold">Da ideia ao negócio. Do negócio aos resultados.</p>
        <p className="mt-2 text-muted">
          O PILILÍ ajuda-te a transformar ideias em soluções concretas, preparar o que precisas e definir os próximos passos.
        </p>
        <p className="mt-1 text-sm text-subtle">Cria. Organiza. Divulga. Vende. Cresce.</p>
        <h2 className="mt-8 font-display text-2xl font-semibold">O que queres fazer pelo teu negócio?</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {shortcuts.map((item) => (
            <li key={item.title}>
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
          <h2 className="font-display text-2xl font-semibold">Vamos trabalhar no teu negócio</h2>
          <p className="mt-2 mb-3 text-sm leading-relaxed text-muted">
            Conta ao PILILÍ o que queres criar, resolver ou melhorar. Recebes uma proposta clara e os próximos passos.
          </p>
          <Composer
            placeholder="O que queres criar, resolver ou melhorar?"
            onSubmit={(t, files) => {
              usePilili.getState().setDraft({ text: "" });
              const id = uid();
              savePending({ id, text: t, attachments: files, power: power.id, projectId: null });
              nav({ to: "/c/$id", params: { id } });
            }}
          />
        </div>
        <p className="kicker mt-8 text-subtle">Por onde queres começar?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {starts.map((line) => (
            <button
              key={line}
              type="button"
              className="min-h-11 max-w-full rounded-full bg-surface px-3 py-2 text-left text-xs leading-snug text-muted shadow-[var(--shadow-border)]"
              onClick={() => prepare(line)}
            >
              {line}
            </button>
          ))}
        </div>
        <div className="pb-6 pt-8">
          <p className="text-lg font-semibold leading-snug">O TEU NEGÓCIO. AS TUAS IDEIAS. OS TEUS RESULTADOS.</p>
          <p className="mt-2 text-sm text-gold">Tu pedes. O PILILÍ executa.</p>
        </div>
      </main>
    );
  }

  if (power.id === "digital") {
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
        <p className="mt-3 text-lg text-gold">O teu negócio merece uma presença digital à altura.</p>
        <p className="mt-2 text-muted">
          O PILILÍ ajuda-te a criar websites profissionais, lojas online, catálogos, landing pages, páginas de serviços e conteúdos para redes sociais.
        </p>
        <p className="mt-2 text-muted">
          Também prepara a estratégia digital e melhora websites que já tens, com uma apresentação clara dos teus produtos e serviços.
        </p>
        <GuideDigital onStart={launch} />
      </main>
    );
  }

  if (power.id === "estudio") {
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
        <p className="mt-3 text-lg text-gold">As tuas ideias merecem ganhar vida.</p>
        <p className="mt-2 text-muted">Transforma as tuas ideias em imagens, vídeos curtos, voz e música.</p>
        <h2 className="mt-8 font-display text-2xl font-semibold">O que queres criar?</h2>
        <StudioCards />
        <div id="power-composer" className="mt-6">
          <p className="mb-3 text-sm leading-relaxed text-muted">
            Descreve a tua ideia. O PILILÍ ajuda-te a transformar a visão numa criação concreta.
          </p>
          <Composer
            placeholder="Descreve a tua ideia."
            onSubmit={(t, files) => {
              usePilili.getState().setDraft({ text: "" });
              const id = uid();
              savePending({ id, text: t, attachments: files, power: power.id, projectId: null });
              nav({ to: "/c/$id", params: { id } });
            }}
          />
        </div>
        <p className="kicker mt-8 text-subtle">Sugestões</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Cria uma imagem profissional para a minha marca.",
            "Produz um vídeo curto para promover o meu negócio.",
            "Gera uma locução para um anúncio.",
            "Cria uma música original.",
            "Transforma esta imagem num visual mais moderno.",
          ].map((line) => (
            <button
              key={line}
              type="button"
              className="min-h-11 max-w-full rounded-full bg-surface px-3 py-2 text-left text-xs leading-snug text-muted shadow-[var(--shadow-border)]"
              onClick={() => prepare(line)}
            >
              {line}
            </button>
          ))}
        </div>
        <div className="pb-6 pt-8">
          <p className="text-lg font-semibold leading-snug">A TUA IDEIA. A TUA CRIATIVIDADE. A TUA ASSINATURA.</p>
          <p className="mt-2 text-sm text-gold">Tu pedes. O PILILÍ executa.</p>
        </div>
      </main>
    );
  }

  const face = POWER_FACE[power.id];
  const sample =
    face?.hideSample || power.id === "emprego" || power.id === "estuda" ? null : SAMPLE_BY_POWER[power.id];
  const extra = power.gallery.filter((src) => src !== power.image);
  const hasGuide =
    power.id === "dj" ||
    power.id === "estuda" ||
    power.id === "emprego" ||
    power.id === "burocracia" ||
    power.id === "vida" ||
    hasQuickGuide(power.id);

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
      {power.kicker ? <p className="mt-1 text-sm text-subtle">{power.kicker}</p> : null}
      {POWER_HONEST[power.id].now ? (
        <p className="mt-3 text-sm text-muted">{POWER_HONEST[power.id].now}</p>
      ) : null}
      {POWER_HONEST[power.id].later ? (
        <p className="mt-1 text-sm text-subtle">{POWER_HONEST[power.id].later}</p>
      ) : null}
      <SavedOnPower power={power.id} />

      {hasGuide ? null : (
        <div className="mt-4 flex flex-wrap gap-2">
          {power.outputs.map((o) => (
            <span key={o} className="rounded-full bg-surface px-3 py-1.5 text-xs text-gold shadow-[var(--shadow-border)]">
              {OUTPUT_LABELS[o] ?? o}
            </span>
          ))}
        </div>
      )}

      {power.id === "dj" ? <GuideDj onLaunch={launch} /> : null}
      {power.id === "estuda" ? <GuideEstuda onLaunch={launch} /> : null}
      {power.id === "emprego" ? <GuideEmprego onLaunch={launch} /> : null}
      {power.id === "burocracia" ? <GuideBurocracia onLaunch={launch} /> : null}
      {power.id === "vida" ? <GuideVida /> : null}
      {hasQuickGuide(power.id) ? <GuideQuick powerId={power.id} onLaunch={launch} /> : null}

      <div id="power-composer" className="mt-8">
        <p className={power.id === "negocio" || power.id === "constroi" || power.id === "agri" || power.id === "executar" ? "mb-3 text-sm leading-relaxed text-muted" : "kicker mb-3 text-subtle"}>
          {power.id === "negocio"
            ? NEGOCIO_HINT
            : power.id === "vida"
              ? "Ou conta-nos o que tens em mente"
              : power.id === "constroi"
                ? "Descreve o projecto. Indica localização, dimensões e orçamento, se já tiveres."
                : power.id === "agri"
                  ? "Explica o que produzes, a área e os recursos disponíveis."
                  : power.id === "executar"
                    ? "Explica o que pretendes alcançar e o prazo, se houver."
                    : hasGuide
                ? "Ou descreve à tua maneira"
                : "Diz o que precisas"}
        </p>
        {power.id === "vida" ? (
          <p className="-mt-1 mb-3 text-sm leading-relaxed text-muted">
            Descreve o que precisas de organizar ou decidir. Recebes uma proposta clara e ajustada à tua situação.
          </p>
        ) : null}
        {power.id === "emprego" ? <p className="-mt-1 mb-3 text-sm leading-relaxed text-muted">{EMPREGO_AUX}</p> : null}
        <Composer
          placeholder={
            power.id === "vida"
              ? "Descreve o que precisas de organizar ou decidir."
              : power.id === "negocio"
              ? NEGOCIO_HINT
              : power.id === "emprego"
                ? EMPREGO_PLACEHOLDER
                : power.id === "estuda"
                ? "O que queres aprender hoje?"
                : (face?.placeholder ?? `O que precisas no ${power.name}?`)
          }
          onSubmit={(t, files) => {
            usePilili.getState().setDraft({ text: "" });
            const id = uid();
            savePending({ id, text: t, attachments: files, power: power.id, projectId: null });
            nav({ to: "/c/$id", params: { id } });
          }}
        />
        {power.id === "vida" ? (
          <p className="mt-3 text-sm text-muted">
            Podes guardar o rascunho na tua conta. Se o resultado for uma lista, podes marcar o que já fizeste.
          </p>
        ) : null}
        {power.id === "vida" ? <PowerDrafts kind="vida_plan" /> : null}
        {power.id === "executar" ? <PowerDrafts kind="executar_plan" /> : null}
      </div>

      {hasGuide ? null : (
        <>
          <p className="kicker mt-6 text-subtle">Começar por aqui</p>
          <ul className="mt-3 space-y-2">
            {power.starters.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="min-h-11 w-full rounded-2xl bg-surface px-4 py-3 text-left text-sm shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
                  onClick={() => launch(s)}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
          <Button className="mt-4 w-full" onClick={() => launch(power.starters[0] ?? power.examples[0] ?? power.name)}>
            Executar agora
          </Button>
        </>
      )}

      {sample ? (
        <section className="mt-8">
          <p className="kicker">Exemplo ilustrativo</p>
          <p className="mt-1 text-xs text-subtle">
            Formato real da entrega. Não foi gerado nesta sessão. O teu fica a partir do que pedires.
          </p>
          <ArtifactView artifact={sample} />
        </section>
      ) : null}

      <p className="kicker mt-8 text-subtle">
        {power.id === "negocio"
          ? "O que podemos construir juntos"
          : power.id === "emprego"
            ? "O que podemos preparar juntos"
            : power.id === "estuda"
              ? "O que o PILILÍ pode preparar"
              : power.id === "vida"
                ? "O que o PILILÍ te ajuda a fazer"
                : "O que o PILILÍ entrega"}
      </p>
      {power.id === "negocio" ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Transforma a tua ideia numa proposta de negócio organizada, com identidade, catálogo, preços e um plano de lançamento.
        </p>
      ) : null}
      {power.id === "vida" ? (
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {[
            {
              title: "Organizar o teu tempo",
              detail: "A semana, o dia e o que não pode falhar.",
              image: "/vida/tempo.jpg",
            },
            {
              title: "Gerir despesas em kwanzas (Kz)",
              detail: "Entradas, saídas e o que queres guardar.",
              image: "/vida/despesas.jpg",
            },
            {
              title: "Tomar decisões com clareza",
              detail: "Opções claras e o próximo passo.",
              image: "/vida/decisoes.jpg",
            },
            {
              title: "Definir prioridades",
              detail: "O que vem primeiro e o que pode esperar.",
              image: "/vida/prioridades.jpg",
            },
            {
              title: "Transformar objectivos em passos concretos",
              detail: "Do que queres ao que fazes a seguir.",
              image: "/vida/passos.jpg",
            },
          ].map((item) => (
            <li key={item.title}>
              <button
                type="button"
                className="w-full overflow-hidden rounded-2xl bg-surface text-left shadow-[var(--shadow-border)]"
                onClick={() => {
                  usePilili.getState().setDraft({ text: "", power: "vida" });
                  requestAnimationFrame(() => {
                    const box = document.getElementById("power-composer");
                    box?.scrollIntoView({ behavior: "smooth", block: "center" });
                    box?.querySelector("textarea")?.focus();
                  });
                }}
              >
                <img src={item.image} alt="" loading="lazy" decoding="async" className="h-32 w-full object-cover object-center" />
                <span className="block px-3 pt-2 text-sm font-medium leading-tight">{item.title}</span>
                <span className="mt-1 block px-3 text-[11px] leading-snug text-muted">{item.detail}</span>
                <span className="mt-2 block px-3 pb-3 text-xs text-gold">Começar</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {power.deliverables.map((d) => (
            <li key={d} className="rounded-xl bg-surface px-3 py-2 text-sm shadow-[var(--shadow-border)]">
              {d}
            </li>
          ))}
        </ul>
      )}

      <p className="kicker mt-8 text-subtle">
        {power.id === "negocio" || power.id === "emprego"
          ? "Do pedido ao resultado"
          : power.id === "estuda" || power.id === "dj" || power.id === "vida" || power.id === "constroi" || power.id === "agri" || power.id === "executar"
            ? "Como funciona"
            : "Como corre"}
      </p>
      <ol className="mt-3 space-y-2">
        {power.workflow.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm">
            <span className="font-mono text-gold">{String(i + 1).padStart(2, "0")}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {power.id === "dj" ? (
        <Link
          to="/poderes/dj/musica"
          className="mt-8 block overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-border)]"
        >
          <img src="/powers/dj-deck.jpg" alt="" className="h-80 w-full object-cover object-[50%_30%]" />
          <div className="p-4">
            <p className="kicker">Cria a tua música</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">Transforma a tua ideia em som original com o PILILÍ.</p>
            <p className="mt-3 text-sm text-gold">Ver o que falta para criar música</p>
          </div>
        </Link>
      ) : extra.length > 0 && power.id !== "executar" ? (
        <div className="mt-8">
          <p className="kicker text-subtle">Como se vê</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <figure>
              <img src={power.image} alt="" loading="lazy" decoding="async" className="h-36 w-full rounded-2xl object-cover" />
              <figcaption className="mt-1 text-[11px] text-subtle">Ponto de partida</figcaption>
            </figure>
            {extra.slice(0, 2).map((src) => (
              <figure key={src}>
                <img src={src} alt="" loading="lazy" decoding="async" className="h-36 w-full rounded-2xl object-cover" />
                <figcaption className="mt-1 text-[11px] text-subtle">O que o PILILÍ ajuda a construir</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      {face?.hideIdeas ? null : (
        <>
          <p className="kicker mt-8 text-subtle">
            {power.id === "vida"
              ? "Não sabes por onde começar?"
              : power.id === "constroi" || power.id === "agri" || power.id === "executar"
                ? "Sugestões"
                : power.id === "negocio" || power.id === "emprego" || power.id === "estuda" || face
              ? "Ideias para começares"
              : "Exemplos"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 pb-4">
            {(power.id === "negocio"
              ? NEGOCIO_IDEAS
              : power.id === "emprego"
                ? EMPREGO_IDEAS
                : power.id === "estuda"
                  ? ESTUDA_IDEAS
                  : (face?.ideas ?? power.examples)
            ).map((ex) => (
              <button
                key={ex}
                type="button"
                className="min-h-11 max-w-full rounded-full bg-surface px-3 py-2 text-left text-xs leading-snug text-muted shadow-[var(--shadow-border)] transition-[box-shadow,color] duration-150 hover:text-fg hover:shadow-[var(--shadow-border-hover)]"
                onClick={() =>
                  power.id === "vida" || power.id === "constroi" || power.id === "agri" || power.id === "executar"
                    ? prepare(ex)
                    : power.id === "estuda"
                      ? startBlankChat(nav, "estuda", "O que queres estudar ou praticar hoje?")
                      : power.id === "emprego" && EMPREGO_SEARCH.has(ex)
                        ? launch(ex, EMPREGO_SEARCH_NOTE)
                        : launch(ex)
                }
              >
                {ex}
              </button>
            ))}
          </div>
        </>
      )}
      {power.id === "constroi" ? (
        <p className="mt-8 text-sm text-muted">
          As estimativas são preliminares e não substituem projectos técnicos.
        </p>
      ) : null}
      {power.id === "negocio" || power.id === "emprego" || power.id === "estuda" || face ? (
        <div className="pb-6">
          <p className="max-w-full text-lg font-semibold leading-snug">
            {power.id === "negocio"
              ? "A TUA IDEIA. O TEU NEGÓCIO. O PRÓXIMO PASSO."
              : power.id === "emprego"
                ? "O teu talento. A tua oportunidade. O próximo passo."
                : power.id === "estuda"
                  ? "O teu objectivo. A tua aprendizagem. O próximo passo."
                  : face?.close}
          </p>
          <p className="mt-2 text-sm text-gold">Tu pedes. O PILILÍ executa.</p>
        </div>
      ) : null}
    </main>
  );
}
