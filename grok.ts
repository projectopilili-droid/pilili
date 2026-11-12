import { XAI_BASE, XAI_MODELS, type ModelRole } from "@/lib/pilili/provider";
import { inferenceRoute } from "@/lib/pilili/inference-route";
import { textDeltaFromStreamEvent } from "@/lib/pilili/stream-delta";
import { errorFromAbort } from "@/lib/server/deadline";
import { providerFailureMessage } from "@/lib/server/provider-error";

export type ChatMessageIn = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
};

function apiKey(): string | null {
  return process.env.XAI_API_KEY?.trim() || null;
}

export function hasXaiKey(): boolean {
  return Boolean(apiKey());
}

async function postJson(
  path: string,
  body: unknown,
  init?: { signal?: AbortSignal },
): Promise<Response> {
  const key = apiKey();
  if (!key) throw new Error("AI_UNAVAILABLE");
  return fetch(`${XAI_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    signal: init?.signal,
  });
}

function errorText(status: number, body: string): string {
  return providerFailureMessage(status, body);
}

function messageText(content: ChatMessageIn["content"]): string {
  if (typeof content === "string") return content;
  return content
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

function textFromResponses(json: {
  output_text?: string;
  output?: Array<{
    type?: string;
    text?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}): string {
  if (typeof json.output_text === "string" && json.output_text.trim()) return json.output_text;
  const parts: string[] = [];
  for (const item of json.output ?? []) {
    if (typeof item.text === "string" && item.text) parts.push(item.text);
    for (const piece of item.content ?? []) {
      if (piece.text) parts.push(piece.text);
    }
  }
  return parts.join("");
}

async function completeWithSearch(
  model: string,
  messages: ChatMessageIn[],
  signal?: AbortSignal,
): Promise<string> {
  const res = await postJson(
    "/responses",
    {
      model,
      input: messages.map((message) => ({ role: message.role, content: messageText(message.content) })),
      tools: inferenceRoute(true).tools,
    },
    { signal },
  );
  if (!res.ok) {
    const t = await res.text();
    const err = new Error(errorText(res.status, t));
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return textFromResponses(
    (await res.json()) as {
      output_text?: string;
      output?: Array<{ type?: string; text?: string; content?: Array<{ type?: string; text?: string }> }>;
    },
  );
}

export async function chatCompletion(opts: {
  role?: ModelRole;
  messages: ChatMessageIn[];
  maxTokens?: number;
  temperature?: number;
  tools?: unknown[];
  search?: boolean;
  signal?: AbortSignal;
}): Promise<{ text: string; model: string }> {
  const models = XAI_MODELS[opts.role ?? "reason"];
  let lastErr = "AI_UNAVAILABLE";
  for (const model of models) {
    if (opts.search) {
      try {
        const text = await completeWithSearch(model, opts.messages, opts.signal);
        return { text, model };
      } catch (err) {
        const status = err && typeof err === "object" && "status" in err ? Number((err as { status?: number }).status) : 0;
        lastErr = err instanceof Error ? err.message : "AI_UNAVAILABLE";
        if (status !== 404) break;
        continue;
      }
    }
    const body: Record<string, unknown> = {
      model,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.7,
    };
    if (opts.tools) body.tools = opts.tools;
    const res = await postJson("/chat/completions", body, { signal: opts.signal });
    if (res.ok) {
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return { text: json.choices?.[0]?.message?.content ?? "", model };
    }
    const t = await res.text();
    lastErr = errorText(res.status, t);
    if (res.status !== 404) break;
  }
  throw new Error(lastErr);
}

function retryableStatus(status: number, body: string): boolean {
  if (status === 404) return true;
  if (status === 400 || status === 422) {
    return /model|deserialize|unsupported|unknown variant|reasoning|not found|does not exist|max_output_tokens|max_tokens/i.test(
      body,
    );
  }
  return false;
}

function searchToolRejected(status: number, body: string): boolean {
  return (status === 400 || status === 422) && /web_search|live_search|sources|tools\[/i.test(body);
}

async function readProviderStream(
  res: Response,
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!res.body) throw new Error("Sem fluxo de resposta.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buf = "";
  try {
    while (true) {
      if (signal?.aborted) throw errorFromAbort(signal, signal.reason);
      const read = await reader.read();
      if (read.done) break;
      buf += decoder.decode(read.value, { stream: true });
      const parts = buf.split("\n");
      buf = parts.pop() ?? "";
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const json = JSON.parse(data) as { type?: string; error?: { message?: string } };
          if (json.type === "error" || json.error?.message) {
            throw new Error(json.error?.message || "O motor falhou durante a resposta.");
          }
          const piece = textDeltaFromStreamEvent(json);
          if (piece) {
            full += piece;
            onDelta(piece);
          }
        } catch (err) {
          if (err instanceof SyntaxError) continue;
          throw err;
        }
      }
    }
  } catch (err) {
    await reader.cancel().catch(() => {});
    throw errorFromAbort(signal, err);
  }
  return full;
}

export async function streamChatCompletion(opts: {
  role?: ModelRole;
  messages: ChatMessageIn[];
  maxTokens?: number;
  temperature?: number;
  search?: boolean;
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<{ text: string; model: string }> {
  const models = XAI_MODELS[opts.role ?? "reason"];
  let lastErr = "AI_UNAVAILABLE";
  let search = Boolean(opts.search);
  const input = opts.messages.map((message) => ({
    role: message.role,
    content: messageText(message.content),
  }));

  for (const model of models) {
    const responsesBody: Record<string, unknown> = {
      model,
      input,
      stream: true,
      store: false,
      max_output_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.4,
      reasoning: { effort: "low" },
    };
    if (search) responsesBody.tools = [{ type: "web_search" }];

    let res: Response;
    try {
      res = await postJson("/responses", responsesBody, { signal: opts.signal });
    } catch (err) {
      throw errorFromAbort(opts.signal, err);
    }
    if (!res.ok) {
      const t = await res.text();
      lastErr = errorText(res.status, t);
      if (search && searchToolRejected(res.status, t)) search = false;
      try {
        res = await postJson(
          "/chat/completions",
          {
            model,
            messages: opts.messages,
            max_tokens: opts.maxTokens ?? 2048,
            temperature: opts.temperature ?? 0.4,
            stream: true,
          },
          { signal: opts.signal },
        );
      } catch (err) {
        throw errorFromAbort(opts.signal, err);
      }
      if (!res.ok) {
        const fallback = await res.text();
        lastErr = errorText(res.status, fallback);
        if (retryableStatus(res.status, fallback) || retryableStatus(res.status, t)) continue;
        break;
      }
    }
    if (!res.body) throw new Error("Sem fluxo de resposta.");
    const text = await readProviderStream(res, opts.onDelta, opts.signal);
    return { text, model };
  }
  if (opts.signal?.aborted) throw errorFromAbort(opts.signal, opts.signal.reason);
  throw new Error(lastErr);
}

export async function generateImage(opts: {
  prompt: string;
  cheap?: boolean;
}): Promise<{ url?: string; b64?: string; model: string }> {
  const models = XAI_MODELS[opts.cheap ? "imageCheap" : "image"];
  let lastErr = "Não foi possível gerar a imagem.";
  for (const model of models) {
    const res = await postJson("/images/generations", {
      model,
      prompt: opts.prompt,
      n: 1,
      response_format: "b64_json",
    });
    if (res.ok) {
      const json = (await res.json()) as {
        data?: { url?: string; b64_json?: string }[];
        url?: string;
      };
      const first = json.data?.[0];
      return { url: first?.url ?? json.url, b64: first?.b64_json, model };
    }
    const t = await res.text();
    lastErr = errorText(res.status, t);
    if (res.status !== 404) break;
  }
  throw new Error(lastErr);
}

export async function editImage(opts: {
  prompt: string;
  imageDataUrls: string[];
}): Promise<{ url?: string; b64?: string; model: string }> {
  const models = XAI_MODELS.image;
  const sources = opts.imageDataUrls.filter(Boolean).slice(0, 5);
  if (sources.length === 0) throw new Error("Não há imagem para editar.");
  let lastErr = "Não foi possível editar a imagem.";
  const pictures = sources.map((url) => ({ url, type: "image_url" as const }));
  for (const model of models) {
    const body: Record<string, unknown> =
      pictures.length > 1
        ? { model, prompt: opts.prompt, images: pictures }
        : { model, prompt: opts.prompt, image: pictures[0] };
    const res = await postJson("/images/edits", body);
    if (res.ok) {
      const json = (await res.json()) as {
        data?: { url?: string; b64_json?: string }[];
        url?: string;
      };
      const first = json.data?.[0];
      return { url: first?.url ?? json.url, b64: first?.b64_json, model };
    }
    const t = await res.text();
    lastErr = errorText(res.status, t);
    if (res.status !== 404) break;
  }
  throw new Error(lastErr);
}

export async function startVideo(opts: {
  prompt: string;
  duration?: number;
  imageUrl?: string;
}): Promise<{ requestId: string; model: string }> {
  const models = XAI_MODELS.video;
  let lastErr = "A integração de vídeo está a ser activada.";
  const duration = Math.min(10, Math.max(1, opts.duration ?? 6));
  for (const model of models) {
    const body: Record<string, unknown> = {
      model,
      prompt: opts.prompt,
      duration,
    };
    if (opts.imageUrl) {
      body.image = { url: opts.imageUrl };
    } else {
      body.aspect_ratio = "9:16";
      body.resolution = "720p";
    }
    const res = await postJson("/videos/generations", body);
    if (res.ok) {
      const json = (await res.json()) as { request_id?: string; id?: string };
      const requestId = json.request_id ?? json.id;
      if (!requestId) throw new Error("O serviço de vídeo não devolveu um identificador.");
      return { requestId, model };
    }
    const t = await res.text();
    lastErr = errorText(res.status, t);
    if (res.status !== 404) break;
  }
  throw new Error(lastErr);
}

export async function pollVideo(
  requestId: string,
): Promise<{ status: string; url?: string }> {
  const key = apiKey();
  if (!key) throw new Error("AI_UNAVAILABLE");
  const res = await fetch(`${XAI_BASE}/videos/${requestId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(errorText(res.status, t));
  }
  const json = (await res.json()) as {
    status?: string;
    video?: { url?: string };
    url?: string;
  };
  return { status: json.status ?? "unknown", url: json.video?.url ?? json.url };
}

export async function waitForVideo(
  requestId: string,
  opts?: { maxMs?: number; onTick?: (status: string) => void },
): Promise<{ status: string; url?: string }> {
  const maxMs = opts?.maxMs ?? 45000;
  const start = Date.now();
  let last: { status: string; url?: string } = { status: "pending" };
  while (Date.now() - start < maxMs) {
    last = await pollVideo(requestId);
    opts?.onTick?.(last.status);
    if (last.status === "done" || last.status === "completed" || last.status === "succeeded") {
      if (last.url) return last;
    }
    if (last.status === "failed" || last.status === "expired") return last;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return last;
}

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const key = apiKey();
  if (!key) throw new Error("AI_UNAVAILABLE");
  const res = await fetch(`${XAI_BASE}/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ text: text.slice(0, 1200), voice_id: "eve" }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(errorText(res.status, t));
  }
  return res.arrayBuffer();
}

export function friendlyAiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Falhou.";
  if (msg === "AI_UNAVAILABLE") {
    return "A integração está a ser activada.";
  }
  return msg;
}
