/**
 * Provider abstraction. PILILÍ talks to an intelligence provider. Today that is xAI.
 * Swap models here; do not hard-code IDs across the app.
 *
 * Live check (this environment, 2026-09-19): XAI_API_KEY is present but the
 * team is blocked with personal-team-blocked:spending-limit. Endpoints are
 * wired; calls fail honestly until the owner adds credits.
 */
export type ModelRole = "reason" | "fast" | "vision" | "image" | "imageCheap" | "video" | "tts";

export const XAI_BASE = "https://api.x.ai/v1";

export const XAI_MODELS: Record<ModelRole, string[]> = {
  reason: ["grok-4.5", "grok-4.6", "grok-4", "grok-3"],
  fast: ["grok-4.5", "grok-4.6", "grok-3-mini", "grok-3"],
  vision: ["grok-4.5", "grok-4.6", "grok-4", "grok-2-vision-1212"],
  image: ["grok-imagine-image-2.0", "grok-imagine-image-quality", "grok-imagine-image"],
  imageCheap: ["grok-imagine-image", "grok-imagine-image-2.0"],
  video: ["grok-imagine-video-1.5", "grok-imagine-video"],
  tts: ["eve"],
};

export const CAPABILITIES = {
  chat: true,
  streaming: true,
  reasoning: true,
  vision: true,
  functionCalling: true,
  structuredOutput: false, // PILILÍ uses tagged artifacts, not native json_schema
  webSearch: true,
  xSearch: false, // API exists; not wired (cost). Use web_search for Angola facts.
  imageGeneration: true,
  imageEditing: true,
  videoGeneration: true,
  videoUnderstanding: false,
  tts: true,
  stt: true, // browser Web Speech; no server STT wired
} as const;

export const NOT_VIA_API = [
  "Licenciamento e reprodução de catálogos musicais (DJ PILILÍ desenha a sessão, não toca faixas protegidas)",
  "Pagamentos (Multicaixa Express, transferência, UNITEL Money, Afrimoney, KWiK): previstos, ainda sem gateway",
  "Modelo local offline (não há LLM no telemóvel nesta versão)",
  "Leitura de folhas de cálculo e de apresentações (PDF e Word .docx já são lidos no anexo; o resto pede fotografia ou texto)",
  "Compreensão de vídeo como input de chat (não confirmada nesta API)",
] as const;

export function pickModel(role: ModelRole): string {
  return XAI_MODELS[role][0];
}
