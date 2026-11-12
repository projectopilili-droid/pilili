import { useState } from "react";
import { openingDetail } from "@/lib/pilili/execution-status";

const TEMPLATES = [
  { id: "roupa", title: "Loja / Roupa", image: "/site-templates/roupa.jpg" },
  { id: "servicos", title: "Serviços", image: "/site-templates/servicos.jpg" },
  { id: "entregas", title: "Entregas", image: "/site-templates/entregas.jpg" },
  { id: "restaurante", title: "Restaurante / Comida", image: "/site-templates/restaurante.jpg" },
] as const;

const OPTIONS = [
  {
    id: "website",
    title: "Website profissional",
    detail: "Empresa, serviços, contactos e o essencial.",
    lead: "Quero um website profissional.",
    image: "/powers/digital.jpg",
  },
  {
    id: "loja",
    title: "Loja online",
    detail: "Catálogo digital, descrições, preços, categorias e encomenda.",
    lead: "Quero uma loja online.",
    image: "/powers/negocio.jpg",
  },
  {
    id: "landing",
    title: "Landing page",
    detail: "Um site para um produto, serviço, campanha ou oferta.",
    lead: "Quero uma landing page.",
    image: "/powers/estudio.jpg",
  },
  {
    id: "servicos",
    title: "Site de serviços",
    detail: "Serviços, benefícios, preços e contacto.",
    lead: "Quero uma página de serviços.",
    image: "/powers/emprego.jpg",
  },
  {
    id: "redes",
    title: "Conteúdos para redes sociais",
    detail: "Publicações, legendas e textos de campanha.",
    lead: "Quero conteúdos para redes sociais.",
    image: "/powers/estudio-film.jpg",
  },
  {
    id: "estrategia",
    title: "Estratégia digital",
    detail: "Um plano para a presença online, o marketing e as vendas.",
    lead: "Quero uma estratégia digital.",
    image: "/powers/credits.jpg",
  },
  {
    id: "melhoria",
    title: "Melhoria de website",
    detail: "Rever estrutura, textos, navegação e apresentação.",
    lead: "Quero melhorar um website que já tenho.",
    image: "/powers/constroi.jpg",
  },
  {
    id: "livre",
    title: "Descrever a minha ideia",
    detail: "Explicas o que precisas, sem escolher um formato.",
    lead: "",
    image: "/powers/vida.png",
  },
] as const;

export function GuideDigital({ onStart }: { onStart: (text: string, context?: string) => void }) {
  const [choice, setChoice] = useState("");
  const [template, setTemplate] = useState("");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function begin() {
    const body = text.trim();
    const option = OPTIONS.find((item) => item.id === choice);
    if (!body) {
      setNote("Descreve o negócio e o que queres criar ou melhorar.");
      document.getElementById("digital-request")?.focus();
      return;
    }
    const request = option?.lead ? `${option.lead} ${body}` : body;
    const starting = openingDetail("digital", request);
    const label =
      starting === "site" ? "A gerar o site…" : starting === "video" ? "A gerar o vídeo…" : starting === "imagem" ? "A gerar a imagem…" : "A preparar…";
    setNote(label);
    setBusy(true);
    const picked = template || (option?.id === "loja" ? "roupa" : option?.id === "servicos" ? "servicos" : "");
    onStart(request, picked ? `modelo do site: ${picked}` : undefined);
  }

  return (
    <div>
      <h2 className="mt-8 font-display text-2xl font-semibold">Escolhe o modelo</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {TEMPLATES.map((item) => {
          const selected = template === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              className={
                selected
                  ? "rounded-2xl bg-surface p-2 text-left shadow-[var(--shadow-gold)]"
                  : "rounded-2xl bg-surface p-2 text-left shadow-[var(--shadow-border)]"
              }
              onClick={() => {
                setTemplate(item.id);
                setNote("");
                document.getElementById("digital-request")?.focus();
              }}
            >
              <span className="block h-28 overflow-hidden rounded-xl">
                <img src={item.image} alt="" className="h-full w-full object-cover object-top" />
              </span>
              <span className="mt-2 block px-1 pb-1 text-sm font-medium">{item.title}</span>
            </button>
          );
        })}
      </div>
      <h2 className="mt-8 font-display text-2xl font-semibold">O que queres criar ou melhorar no digital?</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {OPTIONS.map((option) => {
          const selected = choice === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              className={
                selected
                  ? "rounded-2xl bg-surface p-3 text-left shadow-[var(--shadow-gold)]"
                  : "rounded-2xl bg-surface p-3 text-left shadow-[var(--shadow-border)]"
              }
              onClick={() => {
                setChoice(option.id);
                setText("");
                setNote("");
                requestAnimationFrame(() => document.getElementById("digital-request")?.focus());
              }}
            >
              <span className="block h-28 overflow-hidden rounded-xl">
                <img src={option.image} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="mt-2 block text-sm font-medium leading-tight">{option.title}</span>
              <span className="mt-1 block text-xs leading-snug text-subtle">{option.detail}</span>
            </button>
          );
        })}
      </div>
      <label className="mt-6 block text-sm text-subtle" htmlFor="digital-request">
        O teu pedido
        <textarea
          id="digital-request"
          value={text}
          rows={4}
          placeholder="O que queres criar ou melhorar no digital?"
          className="mt-2 w-full rounded-2xl bg-surface px-4 py-3 text-base text-fg shadow-[var(--shadow-border)] outline-none"
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <button type="button" className="mt-3 min-h-11 w-full rounded-full bg-gold text-sm font-semibold text-gold-fg disabled:opacity-70" disabled={busy} onClick={begin}>
        {busy ? note || "A gerar o site…" : "Começar a criar"}
      </button>
      {note ? <p className="mt-2 text-sm text-subtle">{note}</p> : null}
      <p className="mt-8 text-lg font-semibold leading-snug">A tua ideia merece sair do papel.</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        O PILILÍ ajuda-te a transformar ideias em soluções digitais para o teu negócio.
      </p>
      <p className="mt-2 text-sm text-gold">PILILÍ - Tudo fica mais fácil.</p>
    </div>
  );
}
