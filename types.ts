export const POWER_IDS = [
  "vida",
  "negocio",
  "emprego",
  "estuda",
  "burocracia",
  "entende",
  "estudio",
  "digital",
  "constroi",
  "agri",
  "executar",
  "dj",
  "prof",
  "investiga",
] as const;

export type PowerId = (typeof POWER_IDS)[number];

export type ExecutionPhase =
  | "preparando"
  | "a_executar"
  | "a_verificar"
  | "concluido"
  | "erro";

export type ArtifactType =
  | "brand_kit"
  | "cv_package"
  | "agri_plan"
  | "build_plan"
  | "dj_set"
  | "campaign"
  | "website_spec"
  | "document_insight"
  | "study_pack"
  | "checklist"
  | "table"
  | "image"
  | "video"
  | "note"
  | "audio_brief"
  | "proposal"
  | "presentation";

export type ChatRole = "user" | "assistant";

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type Artifact = {
  id: string;
  type: ArtifactType;
  title: string;
  payload: { [key: string]: Json };
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  artifacts: Artifact[];
  createdAt: string;
  nextStep?: string;
};

export type Conversation = {
  id: string;
  projectId: string | null;
  power: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  title: string;
  kind: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LibraryItem = {
  id: string;
  projectId: string | null;
  conversationId: string | null;
  kind: string;
  title: string;
  mime: string | null;
  body: string | null;
  imageUrl: string | null;
  power: string | null;
  createdAt: string;
};

export type MemoryFact = {
  id: number;
  kind: string;
  key: string;
  value: string;
};

export type Profile = {
  userId: string;
  displayName: string | null;
  plan: "trial" | "bue" | "pro" | "pro_plus" | "business";
  credits: number;
  locale: string;
  lowData: boolean;
};

export type ExecutionPlan = {
  power: PowerId | "geral";
  title: string;
  steps: string[];
};

export type AttachmentMeta = {
  name: string;
  mime: string;
  size: number;
  kind: "image" | "text" | "document" | "audio" | "unreadable";
  text?: string;
  dataUrl?: string;
  warning?: string;
};

export type StreamEvent =
  | { type: "status"; phase: ExecutionPhase; detail?: string }
  | { type: "plan"; plan: ExecutionPlan }
  | { type: "delta"; text: string }
  | { type: "artifact"; artifact: Artifact }
  | { type: "next"; suggestion: string }
  | { type: "credits"; used: number; remaining: number }
  | { type: "error"; message: string; retryable: boolean }
  | { type: "done"; conversationId: string; projectId?: string | null; title: string; text: string };
