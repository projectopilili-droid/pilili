export type StatusPhase = "preparando" | "a_executar" | "a_verificar" | "concluido" | "erro";

const PREPARE: Record<string, string> = {
  vida: "A organizar as tuas prioridades…",
  negocio: "A analisar o teu pedido…",
  emprego: "A analisar o teu objectivo profissional…",
  estuda: "A organizar a explicação…",
  entende: "A organizar a explicação…",
  burocracia: "O PILILÍ está a preparar a resposta…",
  estudio: "A preparar a tua criação…",
  dj: "A preparar a tua criação…",
  digital: "A preparar a execução…",
  constroi: "A preparar a execução…",
  agri: "A analisar o teu pedido…",
  executar: "A preparar a execução…",
  prof: "A organizar a informação da turma…",
  investiga: "A analisar o problema…",
};

const WORK: Record<string, string> = {
  vida: "A preparar o teu plano…",
  negocio: "A estruturar a informação…",
  emprego: "A preparar os próximos passos…",
  estuda: "A preparar o material…",
  entende: "A organizar a explicação…",
  burocracia: "A organizar a informação…",
  estudio: "A trabalhar no resultado…",
  dj: "A trabalhar no resultado…",
  digital: "A preparar a execução…",
  constroi: "A preparar a execução…",
  agri: "A estruturar a informação…",
  executar: "A preparar a execução…",
  prof: "A estruturar o documento…",
  investiga: "A cruzar a informação…",
};

const GENERAL = "O PILILÍ está a preparar a resposta…";

function operation(detail?: string | null): string | null {
  const d = (detail ?? "").trim().toLowerCase();
  if (d === "pesquisa") return "pesquisa";
  if (d === "documento") return "documento";
  if (d === "audio_juntar") return "audio_juntar";
  if (d === "audio_texto") return "audio_texto";
  if (d === "audio" || d === "áudio" || d === "audio_ouvir") return "audio_ouvir";
  if (d === "escrever" || d === "executar") return "escrever";
  if (d === "imagem") return "imagem";
  if (d === "site" || d.startsWith("site_")) return "site";
  if (d === "video" || d.startsWith("vídeo") || d.startsWith("video")) return "video";
  if (d === "verificar") return "verificar";
  return null;
}

export function openingDetail(power: string | null | undefined, message: string): string {
  const t = message.toLowerCase();
  if (/[aá]udios?|transcrev|mp3|m4a|\bwav\b/.test(t)) return "audio_ouvir";
  const site = /site|landing|loja|website|p[aá]gina/.test(t);
  const copyOnly = /estrat[eé]gia digital|conte[uú]dos para redes/.test(t);
  if (power === "digital" && site && !(copyOnly && !/site|landing|loja|website|p[aá]gina/.test(t))) return "site";
  if (/v[ií]deo|spot|reels|tiktok/.test(t)) return "video";
  if (/logo|imagem|foto|cartaz|render/.test(t)) return "imagem";
  return "preparar";
}

export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(s / 60);
  const rest = s % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function siteProgress(detail?: string | null): { steps: string[]; index: number } | null {
  const d = (detail ?? "").trim().toLowerCase();
  if (d !== "site" && !d.startsWith("site_")) return null;
  const index = d === "site_layout" ? 0 : d === "site_apply" ? 2 : 1;
  return { steps: ["Preparar", "Gerar", "Aplicar"], index };
}

export function timedGeneration(detail?: string | null): boolean {
  const op = operation(detail);
  return op === "site" || op === "imagem" || op === "video";
}

/** Honest status. The clock is shown beside this line for every active request. */
export function executionStatus(input: {
  phase: StatusPhase | null;
  power?: string | null;
  detail?: string | null;
  elapsed?: number;
}): string | null {
  if (!input.phase || input.phase === "concluido" || input.phase === "erro") return null;
  const power = input.power ?? "";
  const op = operation(input.detail);
  const detail = (input.detail ?? "").trim().toLowerCase();
  const elapsed = input.elapsed ?? 0;
  if (detail === "site_layout") return "A preparar o layout…";
  if (detail === "site_apply") return "A aplicar as alterações…";
  if (detail === "site_update") return "A actualizar o site…";
  if (input.phase === "a_verificar" || op === "verificar") return "A verificar o resultado…";
  if (op === "pesquisa") return "A pesquisar fontes relevantes…";
  if (op === "documento") return "A analisar o documento…";
  if (op === "audio_juntar") return "A juntar os ficheiros…";
  if (op === "audio_texto") return "A organizar o texto…";
  if (op === "audio_ouvir") return "A analisar os áudios…";
  if (op === "imagem") return "A gerar a imagem…";
  if (op === "video") return "A gerar o vídeo…";
  if (op === "site") return "A gerar o site…";
  if (op === "escrever") return "A escrever a resposta…";
  if (detail === "preparar" || input.phase === "preparando") {
    if (elapsed >= 8) return "A escrever a resposta…";
    if (elapsed >= 3) return "A organizar a resposta…";
    return PREPARE[power] ?? GENERAL;
  }
  if (elapsed >= 8) return "A escrever a resposta…";
  return WORK[power] ?? "A organizar a informação…";
}
