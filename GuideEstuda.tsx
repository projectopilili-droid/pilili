import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Brain, Briefcase, GraduationCap, Layers, LineChart, Sparkles } from "lucide-react";
import { startBlankChat, studyLanguageNote } from "@/lib/client/blank-chat";

function Flag({ code }: { code: "EN" | "ES" | "FR" | "AO" }) {
  if (code === "EN") {
    return (
      <svg viewBox="0 0 60 40" className="size-8 rounded-md shadow-[var(--shadow-border)]" aria-hidden>
        <rect width="60" height="40" fill="#012169" />
        <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" strokeWidth="8" />
        <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="4" />
        <path d="M30 0 V40 M0 20 H60" stroke="#fff" strokeWidth="12" />
        <path d="M30 0 V40 M0 20 H60" stroke="#C8102E" strokeWidth="7" />
      </svg>
    );
  }
  if (code === "ES") {
    return (
      <svg viewBox="0 0 60 40" className="size-8 rounded-md shadow-[var(--shadow-border)]" aria-hidden>
        <rect width="60" height="40" fill="#C60B1E" />
        <rect y="10" width="60" height="20" fill="#FFC400" />
      </svg>
    );
  }
  if (code === "FR") {
    return (
      <svg viewBox="0 0 60 40" className="size-8 rounded-md shadow-[var(--shadow-border)]" aria-hidden>
        <rect width="20" height="40" fill="#0055A4" />
        <rect x="20" width="20" height="40" fill="#fff" />
        <rect x="40" width="20" height="40" fill="#EF4135" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 40" className="size-8 rounded-md shadow-[var(--shadow-border)]" aria-hidden>
      <rect width="60" height="20" fill="#C8102E" />
      <rect y="20" width="60" height="20" fill="#000" />
      <polygon points="30,10 34,22 22,14 38,14 26,22" fill="#FFCD00" />
    </svg>
  );
}

const LANGUAGES = [
  { code: "EN" as const, name: "Inglês", blurb: "O idioma global dos negócios" },
  { code: "ES" as const, name: "Espanhol", blurb: "A segunda língua mais falada no mundo" },
  { code: "FR" as const, name: "Francês", blurb: "A língua da diplomacia e cultura" },
  { code: "AO" as const, name: "Português", blurb: "A nossa língua, refinada" },
];

const AREAS = [
  {
    id: "escola",
    name: "Escola & Universidade",
    blurb: "Do ensino de base à universidade.",
    image: "/powers/estuda.jpg",
    icon: GraduationCap,
    topics: ["Matemática", "Física", "Química", "Biologia", "História", "Exames"],
  },
  {
    id: "tech",
    name: "Tecnologia e Inteligência Artificial",
    blurb: "Programação, inteligência artificial e competências digitais.",
    image: "/powers/entende.jpg",
    icon: Brain,
    topics: ["Programação", "IA", "No-Code", "Cybersecurity", "Data"],
  },
  {
    id: "carreira",
    name: "Carreira",
    blurb: "Prepara entrevistas, comunicação e o próximo passo profissional.",
    image: "/powers/emprego.jpg",
    icon: Briefcase,
    topics: ["Entrevistas", "Liderança", "Vendas", "Negociação", "Comunicação"],
  },
  {
    id: "negocio",
    name: "Negócios",
    blurb: "Empreendedorismo, vendas, gestão e finanças.",
    image: "/powers/negocio.jpg",
    icon: LineChart,
    topics: ["Empreendedorismo", "Marketing", "Finanças", "Gestão"],
  },
  {
    id: "pessoal",
    name: "Desenvolvimento Pessoal",
    blurb: "Hábitos, foco e crescimento pessoal.",
    image: "/powers/vida.png",
    icon: Sparkles,
    topics: ["Hábitos", "Mindset", "Produtividade", "Bem-estar"],
  },
];

const STEPS = [
  { icon: LineChart, label: "Teste de nível" },
  { icon: BookOpen, label: "Lições" },
  { icon: Layers, label: "Vocabulário" },
  { icon: Sparkles, label: "Flashcards" },
];

const ASK = "O que queres fazer?";
const OTHER = "O que queres estudar ou praticar hoje?";

const LANG_LINE: Record<(typeof LANGUAGES)[number]["code"], string> = {
  EN: "Ready to improve your English? Let's go.",
  ES: "¿Listo para mejorar tu español? Vamos.",
  FR: "Prêt à progresser en français? Allons-y.",
  AO: "Pronto para melhorar o teu português? Vamos.",
};

const AREA_LINE: Record<string, string> = {
  escola: "Vamos organizar os estudos e avançar no teu curso.",
  tech: "Vamos aprender tecnologia de forma prática.",
  negocio: "Vamos fortalecer os teus conhecimentos de negócio.",
  carreira: "Vamos preparar os próximos passos da tua carreira.",
  pessoal: "Vamos trabalhar no teu crescimento pessoal.",
};

export function GuideEstuda(_props: { onLaunch: (text: string) => void }) {
  const nav = useNavigate();
  function openClean(intro?: string) {
    const line = typeof intro === "string" ? intro : undefined;
    startBlankChat(nav, "estuda", line ? ASK : OTHER, line);
  }

  return (
    <section className="mt-8 space-y-6">
      <button
        type="button"
        onClick={() => startBlankChat(nav, "estuda", OTHER, undefined, true)}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-surface px-4 py-4 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-gold-soft text-gold">
          <Sparkles className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block font-medium">O que queres aprender hoje?</span>
          <span className="text-sm text-muted">Explicações, exercícios, resumos e um plano de estudo.</span>
        </span>
        <ArrowRight className="size-4 text-gold" />
      </button>
      <div>
        <p className="text-sm text-subtle">Exemplos</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            "Explica-me este assunto de forma simples.",
            "Prepara um plano de estudo para o meu exame.",
            "Cria exercícios e um resumo para eu praticar.",
          ].map((example) => (
            <button
              key={example}
              type="button"
              className="min-h-11 max-w-full rounded-full bg-surface px-3 py-2 text-left text-xs text-muted shadow-[var(--shadow-border)]"
              onClick={openClean}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-medium">Línguas</p>
        <p className="mt-1 text-sm text-muted">
          Inglês, espanhol, francês e português, com explicação, prática e um plano para avançares.
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {STEPS.map((s) => (
            <button
              key={s.label}
              type="button"
              className="flex flex-col items-center gap-1 text-center"
              onClick={openClean}
            >
              <span className="grid size-11 place-items-center rounded-full bg-surface text-gold shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]">
                <s.icon className="size-4" />
              </span>
              <span className="text-[11px] text-subtle">{s.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() =>
                startBlankChat(nav, "estuda", ASK, LANG_LINE[lang.code], false, studyLanguageNote(lang.code), lang.code)
              }
              className="relative min-h-40 overflow-hidden rounded-2xl text-left"
            >
              <img src="/powers/estuda.jpg" alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/15" />
              <div className="relative flex h-full flex-col justify-end p-3">
                <span className="mb-auto">
                  <Flag code={lang.code} />
                </span>
                <p className="font-display text-lg font-semibold">{lang.name}</p>
                <p className="text-xs text-muted">{lang.blurb}</p>
                <p className="mt-2 text-sm text-gold">Começar →</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-medium">Áreas de aprendizagem</p>
        <ul className="mt-3 space-y-3">
          {AREAS.map((area) => {
            const Icon = area.icon;
            return (
              <li key={area.id} className="relative min-h-44 overflow-hidden rounded-2xl">
                <img src={area.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/65 to-bg/25" />
                <div className="relative p-4">
                  <span className="grid size-10 place-items-center rounded-xl bg-bg/70 text-gold">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold">{area.name}</h3>
                  <p className="text-sm text-muted">{area.blurb}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {area.topics.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="min-h-9 rounded-full bg-bg/70 px-3 text-xs text-fg shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
                        onClick={() => openClean(AREA_LINE[area.id])}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-3 min-h-11 text-sm text-gold"
                    onClick={() => openClean(AREA_LINE[area.id])}
                  >
                    Começar →
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
