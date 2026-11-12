import { Chip } from "@/components/ui/chip";
import { StudioCards } from "@/components/powers/StudioTasks";
import { usePilili } from "@/lib/store";
import type { PowerId } from "@/lib/pilili/types";

type Option = { label: string; text: string };
type Group = { label: string; options: Option[] };

const QUICK: Partial<Record<PowerId, { title: string; subtitle: string; groups: Group[] }>> = {
  negocio: {
    title: "O que queres criar ou desenvolver no teu negócio?",
    subtitle: "Negócio, marca, proposta, plano, marketing, vendas, orçamento, catálogo, apresentação e lançamento.",
    groups: [
      {
        label: "Começar",
        options: [
          {
            label: "Criar negócio",
            text: "Quero criar um negócio: marca, plano, proposta e os primeiros passos do lançamento.",
          },
          {
            label: "Criar marca",
            text: "Quero desenvolver a marca: nome, identidade e a forma de apresentar o negócio.",
          },
          {
            label: "Criar catálogo",
            text: "Quero um catálogo de produtos e serviços, com descrições e preços.",
          },
          {
            label: "Preparar lançamento",
            text: "Quero planear o lançamento, com marketing, vendas e uma apresentação para clientes.",
          },
        ],
      },
    ],
  },
  entende: {
    title: "O que precisas de compreender?",
    subtitle: "Interpreta documentos, resume informação, traduz conteúdos e esclarece assuntos complexos.",
    groups: [
      {
        label: "Começar",
        options: [
          {
            label: "Documento",
            text: "Explica este documento em linguagem simples: o que significa e o que importa.",
          },
          {
            label: "Factura",
            text: "Resume esta factura: valores, datas e o que tenho de fazer.",
          },
          {
            label: "Contrato",
            text: "Explica este contrato em linguagem simples e diz o que devo confirmar.",
          },
          {
            label: "Resumo",
            text: "Resume esta informação e esclarece o que ainda não ficou claro.",
          },
        ],
      },
    ],
  },
  estudio: {
    title: "Estúdio Criativo",
    subtitle: "Cria imagens, vídeos curtos e conteúdo em voz.",
    groups: [],
  },
  digital: {
    title: "O que queres criar ou melhorar no digital?",
    subtitle: "Websites, lojas, catálogos, landing pages, páginas de serviços, redes, estratégia e melhoria do que já tens.",
    groups: [
      {
        label: "Começar",
        options: [
          {
            label: "Presença",
            text: "Quero um website profissional para apresentar a minha empresa, os serviços e os contactos.",
          },
          {
            label: "Redes",
            text: "Prepara conteúdos para redes sociais: publicações, legendas e uma campanha.",
          },
          {
            label: "Página",
            text: "Quero uma landing page ou uma página de serviços para apresentar a minha oferta.",
          },
          {
            label: "Estratégia",
            text: "Quero uma estratégia digital para atrair clientes e organizar a presença do meu negócio.",
          },
        ],
      },
    ],
  },
  constroi: {
    title: "O que queres construir ou planear?",
    subtitle: "",
    groups: [
      {
        label: "",
        options: [
          { label: "Casa", text: "" },
          { label: "Apartamentos", text: "" },
          { label: "Espaço comercial", text: "" },
          { label: "Terreno", text: "" },
          { label: "Orçamento", text: "" },
        ],
      },
    ],
  },
  agri: {
    title: "O que queres produzir ou melhorar?",
    subtitle: "",
    groups: [
      {
        label: "",
        options: [
          { label: "Lavra", text: "" },
          { label: "Fazenda", text: "" },
          { label: "Produção agrícola", text: "" },
          { label: "Custos e recursos", text: "" },
          { label: "Comercialização", text: "" },
        ],
      },
    ],
  },
  executar: {
    title: "O que precisas de resolver ou executar agora?",
    subtitle: "",
    groups: [
      {
        label: "",
        options: [
          { label: "Hoje", text: "" },
          { label: "Plano", text: "" },
          { label: "Etapas", text: "" },
          { label: "Acções", text: "" },
          { label: "Documento", text: "" },
        ],
      },
    ],
  },
};

export function GuideQuick({
  powerId,
  onLaunch,
}: {
  powerId: PowerId;
  onLaunch: (text: string) => void;
}) {
  const guide = QUICK[powerId];
  if (!guide) return null;

  function focusRequest() {
    usePilili.getState().setDraft({ text: "", power: powerId });
    requestAnimationFrame(() => {
      const box = document.getElementById("power-composer");
      box?.scrollIntoView({ behavior: "smooth", block: "center" });
      box?.querySelector("textarea")?.focus();
    });
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-semibold">{guide.title}</h2>
      {guide.subtitle ? <p className="mt-1 text-sm text-muted">{guide.subtitle}</p> : null}
      {powerId === "estudio" ? <StudioCards /> : null}
      {guide.groups.map((group) => (
        <div key={group.label || "atalhos"} className="mt-4">
          {group.label ? <p className="text-sm text-subtle">{group.label}</p> : null}
          {powerId === "entende" ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {group.options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  className="min-h-11 rounded-xl bg-surface px-2 py-2 text-center text-xs leading-snug shadow-[var(--shadow-border)]"
                  onClick={focusRequest}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {group.options.map((opt) => (
                <Chip
                  key={opt.label}
                  className="max-w-full whitespace-normal text-left"
                  onClick={
                    powerId === "constroi" || powerId === "agri" || powerId === "executar"
                      ? focusRequest
                      : () => onLaunch(opt.text)
                  }
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          )}
        </div>
      ))}
      {powerId === "entende" ? <EntendeLimits onPick={focusRequest} /> : null}
    </section>
  );
}

export function hasQuickGuide(id: PowerId) {
  return Boolean(QUICK[id]);
}

function EntendeLimits({ onPick }: { onPick: () => void }) {
  const items = [
    {
      title: "Traduzir texto",
      detail: "Cola a mensagem, o email ou o texto e diz o idioma de origem e o de destino.",
      image: "/powers/burocracia.jpg",
    },
    {
      title: "Traduzir imagem",
      detail: "Anexa uma fotografia, um cartaz ou uma captura no campo de baixo.",
      image: "/powers/estudio.jpg",
    },
    {
      title: "Traduzir documentos",
      detail: "A integração está a ser activada. Cola o texto ou envia uma fotografia nítida.",
      image: "/powers/entende.jpg",
    },
    {
      title: "Traduzir voz",
      detail: "O microfone escreve o pedido. A tradução de voz está a ser activada.",
      image: "/powers/voice.jpg",
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      {items.map((item) => (
        <button
          key={item.title}
          type="button"
          className="rounded-2xl bg-surface p-3 text-left shadow-[var(--shadow-border)]"
          onClick={onPick}
        >
          <span className="block h-28 overflow-hidden rounded-xl">
            <img src={item.image} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="mt-2 block text-sm font-medium leading-tight">{item.title}</span>
          <span className="mt-1 block text-xs leading-snug text-subtle">{item.detail}</span>
        </button>
      ))}
    </div>
  );
}
