/**
 * Configurable credit costs. Do not scatter hard-coded limits in UI.
 * Change this file to reprice operations.
 */
export const CREDIT_COSTS = {
  simple_chat: 1,
  complex_reasoning: 4,
  web_research: 6,
  document_analysis: 5,
  image_generation: 15,
  video_generation: 40,
  multi_step_execution: 10,
  tts: 2,
} as const;

export type CreditOp = keyof typeof CREDIT_COSTS;

const SIMPLE_SOCIAL =
  /^(?:ola|oi|hey|hi|hello|viva|salve|ya|e ai|bom dia|boa tarde|boa noite|tudo bem|tudo bom|como estas|como vai|esta bem|td bem|obrigado|obrigada|valeu|ok|certo|sim|nao|adeus|tchau|ate logo|ate ja|por favor)(?:\s+pilili)?(?:\s+(?:ola|oi|tudo bem|tudo bom|como estas|como vai))?$/;

/** Isolated greeting or short social line. A real task in the same message is not included. */
export function isSimpleSocial(message: string): boolean {
  const text = message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[!?.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text.length > 60 || /\d/.test(text)) return false;
  return SIMPLE_SOCIAL.test(text);
}

/** Visible reply the user can use. Tags and blank output do not count. */
export function isUsableReply(text: string): boolean {
  const visible = text.replace(/<pilili_[^>]*>[\s\S]*?<\/pilili_[^>]*>/gi, "").trim();
  return visible.length >= 2 && /[\p{L}\p{N}]/u.test(visible);
}

export const TESTING_PHASE = true;
/** Temporary allowance while real users try the product. Not a paid plan. */
export const TEST_CREDIT_FLOOR = 2000;
export const TRIAL_CREDITS = TESTING_PHASE ? TEST_CREDIT_FLOOR : 40;

/** Credits to add once so a trial account reaches the test floor. Paid plans are left alone. */
export function testAllowanceGrant(plan: string, credits: number): number {
  if (!TESTING_PHASE || plan !== "trial") return 0;
  if (!Number.isFinite(credits)) return 0;
  return Math.max(0, TEST_CREDIT_FLOOR - Math.floor(credits));
}

export const PLAN_CATALOG = [
  {
    id: "trial" as const,
    name: "Ensaio Grátis",
    priceKz: 0,
    period: "limitado",
    credits: TRIAL_CREDITS,
    recommended: false,
    blurb: TESTING_PHASE
      ? "Fase de testes. O saldo de ensaio está alargado e é temporário. Não é um plano pago."
      : "Para experimentares o PILILÍ e veres como a IA pode transformar os teus pedidos em resultados.",
    features: [
      TESTING_PHASE ? `${TRIAL_CREDITS} créditos de ensaio, limite temporário` : `${TRIAL_CREDITS} créditos de ensaio`,
      "Projectos e biblioteca",
      "Só o que já estiver disponível nesta versão",
    ],
  },
  {
    id: "bue" as const,
    name: "Bué",
    priceKz: 3990,
    period: "mês",
    credits: 150,
    recommended: false,
    blurb: "Para resolveres as tarefas do dia-a-dia, preparar documentos, melhorar o teu CV e encontrar informação útil.",
    features: ["150 créditos / mês", "Documentos e CV", "Pesquisa na web", "Biblioteca"],
  },
  {
    id: "pro" as const,
    name: "Bué Fixe",
    priceKz: 7990,
    period: "mês",
    credits: 800,
    recommended: true,
    blurb: "Para transformares ideias em negócios, marcas, campanhas e projectos digitais.",
    features: ["800 créditos / mês", "Criação visual, quando disponível", "Marcas, websites e projectos"],
  },
  {
    id: "pro_plus" as const,
    name: "Bué Pro",
    priceKz: 12990,
    period: "mês",
    credits: 2000,
    recommended: true,
    blurb: "Para quem precisa de produzir mais, trabalhar em vários projectos e executar tarefas mais exigentes.",
    features: ["2 000 créditos / mês", "Mais capacidade de uso", "Vários projectos", "Tarefas exigentes, quando a função existir"],
  },
  {
    id: "business" as const,
    name: "Bué Bizno",
    priceKz: 49990,
    period: "mês",
    credits: 15000,
    recommended: false,
    blurb: "Para empresas que pretendem integrar a IA nos seus processos, organizar conhecimento e apoiar o trabalho das equipas.",
    features: [
      "15 000 créditos / mês",
      "Espaço de equipa: em preparação",
      "Conhecimento da empresa: em preparação",
      "Permissões: em preparação",
    ],
  },
];

export function estimateCost(input: {
  power?: string | null;
  message?: string;
  wantsImage?: boolean;
  wantsVideo?: boolean;
  wantsSearch?: boolean;
  hasDocument?: boolean;
}): { op: CreditOp; cost: number } {
  if (input.wantsVideo) return { op: "video_generation", cost: CREDIT_COSTS.video_generation };
  if (input.wantsImage) return { op: "image_generation", cost: CREDIT_COSTS.image_generation };
  if (input.hasDocument) return { op: "document_analysis", cost: CREDIT_COSTS.document_analysis };
  if (input.wantsSearch) return { op: "web_research", cost: CREDIT_COSTS.web_research };
  if (input.message && isSimpleSocial(input.message)) {
    return { op: "simple_chat", cost: CREDIT_COSTS.simple_chat };
  }
  const heavy = new Set(["negocio", "estudio", "digital", "constroi", "agri", "executar", "dj"]);
  if (input.power && heavy.has(input.power)) {
    return { op: "multi_step_execution", cost: CREDIT_COSTS.multi_step_execution };
  }
  return { op: "complex_reasoning", cost: CREDIT_COSTS.complex_reasoning };
}
