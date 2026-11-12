import { CREDIT_COSTS, estimateCost, isUsableReply } from "@/lib/pilili/credits";
import { messageNeedsSearch } from "@/lib/pilili/inference-route";
import { hasStructuredDeliverable, parsePililiOutput } from "@/lib/pilili/parse";
import { POWER_BY_ID } from "@/lib/pilili/powers";
import { attachCvPhoto, hydrateCvPayload, skipGeneratedCvImage } from "@/lib/pilili/cv";
import { buildSystemPrompt } from "@/lib/pilili/prompt";
import { applySmallSiteEdit, continuesSite, draftSitePayload, isSiteRequest, siteHeroPrompt, siteReply, siteVideoPrompt, smallSiteEdit, stockImages, styleWebsite, userWantsSiteVideo } from "@/lib/pilili/website";
import type { Artifact, AttachmentMeta, ExecutionPhase, PowerId, StreamEvent } from "@/lib/pilili/types";
import { uid } from "@/lib/utils";
import {
  bindConversation,
  conversationProjectId,
  debitCredits,
  ensureConversation,
  latestConversationImage,
  latestSiteDraft,
  listMemory,
  refundCredits,
  saveMessage,
  touchProject,
  upsertMemory,
} from "./db-helpers";
import { LIBRARY_MISS, persistLibraryItem, slimArtifact } from "./library-store";
import {
  editImage,
  friendlyAiError,
  generateImage,
  hasXaiKey,
  startVideo,
  streamChatCompletion,
  waitForVideo,
  type ChatMessageIn,
} from "./grok";
import { ExecutionTimeoutError, MODEL_TIMEOUT_MS, startDeadline } from "./deadline";
import { createV0Site, readDemoHtml, V0_SITE_FAILED } from "./v0";
import { createDjSession, isDjSession } from "./spotify";
import { joinAudioFiles, prepareAudio, transcribeFile } from "./audio";
import { audioJob } from "@/lib/pilili/audio";
import { getRequest } from "@tanstack/react-start/server";

const ANGOLA_SEARCH_HINT =
  "Para factos actuais de Angola, privilegia fontes oficiais e imprensa angolana. Não uses procedimentos do Brasil ou de Portugal como se fossem de Angola.";

function wantsWebsite(power: PowerId | null | undefined, message: string): boolean {
  return power === "digital" ? isSiteRequest(message) || /website|loja|landing|p[aá]gina/i.test(message) : isSiteRequest(message);
}

function sse(ev: StreamEvent): string {
  return `data: ${JSON.stringify(ev)}\n\n`;
}

function needsSearch(text: string, power?: string | null): boolean {
  return messageNeedsSearch(text, power);
}

function wantsImage(text: string, power?: string | null): boolean {
  if (skipGeneratedCvImage(power, text)) return false;
  if (wantsVideo(text) && !/cria (?:uma |a )?imagem|gera (?:uma |a )?imagem|cartaz|logo/i.test(text)) return false;
  return /logo|imagem|visual|identidade|campanha|instagram|cartaz|foto|render|conceito visual|cria a marca|como poderia ficar/i.test(
    text,
  );
}

function wantsVideo(text: string): boolean {
  return /v[ií]deo|spot|reels|tiktok|promocional curto/i.test(text);
}

function wantsEdit(text: string): boolean {
  const t = text.toLowerCase();
  if (/edita|editar|edi[cç][aã]o|altera esta|alterar esta|nesta foto|nesta imagem|com esta foto|com estas fotos|usa esta foto|usa a foto|a foto que|estas imagens|estas fotos|junta as imagens|combina as imagens|como poderia ficar|conceito visual deste terreno|neste lote|aplica|veste|vestir/.test(t)) {
    return true;
  }
  const change = /muda|mudar|troca|trocar|altera|alterar|adiciona|adicionar|acrescenta|coloca|colocar|põe|poe|mete|meter|tira|tirar|remove|remover|apaga|apagar/;
  const target = /roupa|fundo|cabelo|logo|cor\b|estilo|objecto|objeto|rosto|cara/;
  return change.test(t) && target.test(t);
}

function faceLock(userText: string, count: number): string {
  const rule =
    count > 1
      ? "Edit the first photo only. Keep that exact person, the same face and the same identity. Do not replace them with a different person. Use the later images only as references, such as a logo, clothes, a background or an object. Edita a primeira foto. Mantém a mesma pessoa e o mesmo rosto. As imagens seguintes são só referências."
      : "Edit this exact photo. Keep the same person, the same face and the same identity. Do not generate a different person. Change only what was asked. Edita esta foto exacta. Mantém a mesma pessoa e o mesmo rosto. Muda só o que foi pedido.";
  return `${rule} ${userText.slice(0, 700)}`;
}

function leavesAngola(text: string): boolean {
  return /\b(brasil|brasileir|portugal|lisboa|porto|europa|paris|londres|nova york|new york|dubai|marbella|espanha|madrid|fran[cç]a|eua|estados unidos|nigeria|lagos|mo[cç]ambique|maputo|cabo verde|áfrica do sul|joanesburgo|china|india|índia)\b/i.test(text);
}

function withAngolaFirst(prompt: string, userText: string): string {
  if (leavesAngola(`${userText}\n${prompt}`)) return prompt.trim();
  const about = /pilil[ií]/i.test(`${userText}\n${prompt}`)
    ? " If this is about PILILÍ, it is an Angolan AI execution platform: the person asks and PILILÍ prepares text, documents, plans, study, images and short video. It is not a delivery app, not a map, not food ordering, not a taxi and not a shop. Do not show entrega, pedir agora, couriers or food."
    : "";
  const rule =
    "Setting: Angola, not East Africa. Not Kenya, Ethiopia, Tanzania or Uganda. Right-hand traffic. Signs in Portuguese." +
    ( /do not include any people/i.test(prompt)
      ? " No people, no faces and no hands."
      : " Angolan streets, people, cars and Atlantic light.") +
    " Do not write Angola first. Do not add the words em Luanda. Visible text, if any, is natural Angolan Portuguese." +
    about;
  if (prompt.includes("Setting: Angola, not East Africa")) return prompt.trim();
  return `${prompt.trim()} ${rule}`;
}

function withLuandaVoice(prompt: string, userText = ""): string {
  const voice =
    "If there is speech, use natural Angolan Portuguese. Never a Brazilian accent. Never say Angola first. Do not say em Luanda unless the user named that city. Do not describe PILILÍ as a delivery service.";
  const base = leavesAngola(`${userText}\n${prompt}`) ? prompt.trim() : withAngolaFirst(prompt, userText);
  if (base.includes("natural Angolan Portuguese")) return base;
  return `${base} ${voice}`;
}

function asksIdentityDoc(text: string): boolean {
  return /identidade|manual de marca|brand kit|paleta|documento de marca|direc[cç][aã]o criativa|cria a marca/i.test(text);
}

function studioRetouch(text: string): boolean {
  return /\b(tira|tirar|remove|remover|apaga|apagar|muda|mudar|troca|trocar|altera|alterar|acrescenta|adiciona|adicionar|p[oõ]e|coloca|colocar|sem o|sem a)\b/i.test(
    text,
  );
}

/** Estúdio image or edit: the visible result is the picture, not a brand document. */
function studioPictureOnly(text: string): boolean {
  if (asksIdentityDoc(text) || wantsVideo(text)) return false;
  return wantsImage(text, "estudio") || wantsEdit(text) || studioRetouch(text);
}

function shortImageQuestion(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  if (!line.endsWith("?") || line.length > 160 || line.includes(". ")) return "";
  return line;
}

function editInstruction(userText: string, count: number): string {
  if (/\b(rosto|cara|pessoa|vestir|roupa|cabelo)\b/i.test(userText)) return faceLock(userText, count);
  return `Edit this exact image. Apply only this change and keep the rest identical. Do not invent a new picture. ${userText.slice(0, 700)}`;
}

function wantsAnimateStill(text: string): boolean {
  return /anima|a partir da imagem|desta imagem|esta imagem|nesta foto|da fotografia/i.test(text);
}

function planFor(power: string | null | undefined, msg: string): { title: string; steps: string[] } {
  const p = power && POWER_BY_ID[power as PowerId];
  if (p) {
    return { title: p.name, steps: p.workflow };
  }
  const steps = ["Perceber a intenção"];
  if (needsSearch(msg, power)) steps.push("Pesquisar o que for actual");
  if (wantsImage(msg, power) || wantsEdit(msg)) steps.push("Criar o visual");
  if (wantsVideo(msg)) steps.push("Pedir o vídeo");
  steps.push("Verificar", "Entregar");
  return { title: "A tratar disto", steps };
}

function imageUrlOf(made: { url?: string; b64?: string }): string | null {
  if (made.b64) return `data:image/png;base64,${made.b64}`;
  return made.url ?? null;
}

function fallbackImagePrompt(power: string | null | undefined, message: string): string {
  const ctx = message.slice(0, 280);
  if (power === "constroi") {
    return `Preliminary architectural concept visualization set in Angola, contemporary, honest concept art, not a fake photoreal specific building. ${ctx}`;
  }
  if (power === "negocio" || power === "estudio") {
    return `Premium contemporary brand visual for an Angolan business, clean composition, gold and charcoal accents, no clichés, no fake logos of real companies. ${ctx}`;
  }
  return `Contemporary visual, Angola-aware, no clichés. ${ctx}`;
}

export async function runExecution(opts: {
  userId: string;
  email?: string | null;
  conversationId: string;
  message: string;
  power?: PowerId | null;
  projectId?: string | null;
  history: { role: "user" | "assistant"; content: string }[];
  attachments: AttachmentMeta[];
  idempotencyKey: string;
  context?: string | null;
  write: (chunk: string) => void;
}): Promise<void> {
  const send = (ev: StreamEvent) => opts.write(sse(ev));
  const pictureOnly = opts.power === "estudio" && studioPictureOnly(opts.message);

  const audiosAtStart = opts.attachments.filter((item) => item.kind === "audio" && item.dataUrl);
  const opening = audiosAtStart.length
    ? "audio_ouvir"
    : opts.power === "digital" && isSiteRequest(opts.message)
      ? "site"
      : wantsVideo(opts.message)
        ? "video"
        : pictureOnly || wantsImage(opts.message, opts.power)
          ? "imagem"
          : "preparar";

  send({
    type: "status",
    phase: opening === "preparar" ? "preparando" : "a_executar",
    detail: opening,
  });

  if (!hasXaiKey()) {
    send({
      type: "error",
      message: "A integração está a ser activada.",
      retryable: false,
    });
    return;
  }

  const readableDocs = opts.attachments.filter((a) => a.kind === "text" || (a.kind === "document" && a.text));
  const unreadable = opts.attachments.filter((a) => a.kind === "unreadable" || (a.kind === "document" && !a.text));
  const attachedImages = opts.attachments.filter((a) => a.kind === "image" && a.dataUrl);
  const video = wantsVideo(opts.message);
  const editAsked = wantsEdit(opts.message) || (opts.power === "estudio" && studioRetouch(opts.message));
  let editImages = attachedImages.map((a) => a.dataUrl as string);
  if (editImages.length === 0 && (editAsked || (video && wantsAnimateStill(opts.message)))) {
    try {
      const previous = await latestConversationImage(opts.userId, opts.conversationId);
      if (previous) editImages = [previous];
    } catch {
      /* sem imagem anterior; o pedido segue e diz o que falta */
    }
  }
  const sourceImage = editImages[0]
    ? { name: "origem", mime: "image/*", size: 0, kind: "image" as const, dataUrl: editImages[0] }
    : undefined;

  const search = needsSearch(opts.message, opts.power);
  const image = wantsImage(opts.message, opts.power) && !editAsked;
  const edit = Boolean(sourceImage) && (editAsked || opts.power === "constroi");
  const hasDoc = readableDocs.length > 0;
  const estimate = estimateCost({
    power: opts.power,
    message: opts.message,
    wantsSearch: search,
    hasDocument: hasDoc,
  });

  const debit = await debitCredits({
    userId: opts.userId,
    amount: estimate.cost,
    reason: estimate.op,
    idempotencyKey: opts.idempotencyKey,
  });
  if (!debit.ok) {
    send({ type: "error", message: debit.error, retryable: false });
    send({ type: "credits", used: 0, remaining: debit.remaining });
    return;
  }
  send({ type: "credits", used: estimate.cost, remaining: debit.remaining });

  const giveBack = async (reason: string) => {
    try {
      const remaining = await refundCredits({
        userId: opts.userId,
        amount: estimate.cost,
        reason,
        idempotencyKey: opts.idempotencyKey,
      });
      send({ type: "credits", used: 0, remaining });
    } catch {
      /* The refund key is unique. A later retry of the same key does not debit again. */
    }
  };

  try {
    const titleGuess = opts.message.slice(0, 72).replace(/\s+/g, " ").trim() || "Conversa";
    let libraryMiss = false;
    const told = (text: string) =>
      libraryMiss && !text.includes(LIBRARY_MISS) ? `${text}\n\n${LIBRARY_MISS}` : text;
    const hold = async (
      art: { id: string; type: string; title: string; payload: { [key: string]: import("@/lib/pilili/types").Json } },
      projectId: string | null,
      power?: string | null,
    ) => {
      try {
        art.payload = await persistLibraryItem({
          id: art.id,
          userId: opts.userId,
          projectId,
          conversationId: opts.conversationId,
          kind: art.type,
          title: art.title,
          power: power ?? opts.power ?? null,
          payload: art.payload,
        });
      } catch (err) {
        console.error("library save", err);
        libraryMiss = true;
      }
    };
    await ensureConversation({
      id: opts.conversationId,
      userId: opts.userId,
      projectId: opts.projectId,
      power: opts.power,
      title: titleGuess,
    });
    await saveMessage({
      id: uid(),
      conversationId: opts.conversationId,
      userId: opts.userId,
      role: "user",
      content: opts.message,
    });

    const audios = opts.attachments.filter((item) => item.kind === "audio" && item.dataUrl);
    if (audios.length) {
      const job = audioJob(opts.message, audios.length);
      if (job === "merge") {
        if (audios.length < 2) {
          await giveBack("refund_failed_run");
          send({ type: "error", message: "Anexa pelo menos dois áudios para juntar num só ficheiro.", retryable: true });
          return;
        }
        send({ type: "status", phase: "a_executar", detail: "audio_juntar" });
        const fileId = uid();
        const joined = await joinAudioFiles(
          audios.map((item) => ({ name: item.name, mime: item.mime, dataUrl: item.dataUrl as string })),
          fileId,
        );
        if (!joined.ok) {
          await giveBack("refund_failed_run");
          send({ type: "error", message: joined.message, retryable: true });
          return;
        }
        const artifact = {
          id: uid(),
          type: "audio_brief" as const,
          title: "Áudios juntos",
          payload: {
            body: "Juntei os áudios num só ficheiro.",
            audioUrl: joined.url,
            file: true,
          },
        };
        await hold(artifact, opts.projectId ?? null);
        send({ type: "artifact", artifact });
        const joinedLine = told("Juntei os áudios num só ficheiro.");
        await saveMessage({
          id: uid(),
          conversationId: opts.conversationId,
          userId: opts.userId,
          role: "assistant",
          content: joinedLine,
          artifacts: [slimArtifact(artifact)],
        });
        send({ type: "status", phase: "concluido" as ExecutionPhase });
        send({
          type: "done",
          conversationId: opts.conversationId,
          projectId: opts.projectId ?? null,
          title: titleGuess,
          text: joinedLine,
        });
        return;
      }
      send({ type: "status", phase: "a_executar", detail: "audio_ouvir" });
      const files = [];
      for (const item of audios) {
        const text = await transcribeFile({ name: item.name, mime: item.mime, dataUrl: item.dataUrl as string }).catch(() => "");
        files.push({ name: item.name, text });
      }
      send({ type: "status", phase: "a_executar", detail: "audio_texto" });
      const made = await prepareAudio({ message: opts.message, files });
      if (!made.ok) {
        await giveBack("refund_failed_run");
        send({ type: "error", message: made.message, retryable: true });
        return;
      }
      const artifact = {
        id: uid(),
        type: "audio_brief" as const,
        title: made.title,
        payload: {
          body: made.plain,
          html: made.html,
          sections: made.sections,
        },
      };
      await hold(artifact, opts.projectId ?? null);
      send({ type: "artifact", artifact });
      const saved: Artifact[] = [artifact];
      if (made.video) {
        try {
          const extra = await debitCredits({
            userId: opts.userId,
            amount: CREDIT_COSTS.video_generation,
            reason: "video_generation",
            idempotencyKey: `${opts.idempotencyKey}:vid`,
          });
          if (!extra.ok) {
            send({ type: "error", message: extra.error, retryable: false });
          } else {
            send({ type: "credits", used: CREDIT_COSTS.video_generation, remaining: extra.remaining });
            send({ type: "status", phase: "a_executar", detail: "video" });
            const prompt = withLuandaVoice(
              `Curto vídeo. Mostra só o que foi dito, sem acrescentar factos. ${made.plain.slice(0, 500)}`,
              made.plain,
            );
            const started = await startVideo({ prompt, duration: 6 });
            const waited = await waitForVideo(started.requestId, {
              maxMs: 90000,
              onTick: (st) => send({ type: "status", phase: "a_executar", detail: `Vídeo: ${st}` }),
            });
            const clip = {
              id: uid(),
              type: "video" as const,
              title: waited.url ? "Vídeo curto" : "Vídeo curto em produção",
              payload: {
                requestId: started.requestId,
                prompt: made.plain.slice(0, 400),
                duration: 6,
                status: waited.status,
                url: waited.url ?? "",
                note: "Vídeo curto, cerca de 6 segundos.",
              },
            };
            saved.push(clip);
            await hold(clip, opts.projectId ?? null);
            send({ type: "artifact", artifact: clip });
          }
        } catch (err) {
          await refundCredits({
            userId: opts.userId,
            amount: CREDIT_COSTS.video_generation,
            reason: "refund_video",
            idempotencyKey: `${opts.idempotencyKey}:vid`,
          });
          send({ type: "error", message: `Vídeo: ${friendlyAiError(err)}`, retryable: true });
        }
      }
      const audioLine = told(made.reply);
      await saveMessage({
        id: uid(),
        conversationId: opts.conversationId,
        userId: opts.userId,
        role: "assistant",
        content: audioLine,
        artifacts: saved.map((item) => slimArtifact(item)),
      });
      send({ type: "status", phase: "concluido" as ExecutionPhase });
      send({
        type: "done",
        conversationId: opts.conversationId,
        projectId: opts.projectId ?? null,
        title: titleGuess,
        text: audioLine,
      });
      return;
    }

    const memory = await listMemory(opts.userId);
    const system = buildSystemPrompt({
      power: opts.power,
      memory: memory.map((m) => ({ id: m.id, kind: m.kind, key: m.key, value: m.value })),
      nowIso: new Date().toISOString(),
    });

    let userText = opts.message;
    if (opts.context?.trim()) {
      userText += `\n\n[Nota interna, não a mostres nem a repitas: ${opts.context.trim()}]`;
    }
    if (search) userText = `${userText}\n\n${ANGOLA_SEARCH_HINT}`;
    if (unreadable.length) {
      userText +=
        "\n\n[Nota do sistema: o utilizador tentou enviar " +
        unreadable.map((a) => a.name).join(", ") +
        ". Estes ficheiros não foram lidos. Pede uma fotografia das páginas ou o texto colado. Não finjas que leste o ficheiro.]";
    }
    if (readableDocs.length) {
      const texts = readableDocs.filter((a) => a.text).map((a) => `Ficheiro ${a.name}:\n${a.text}`);
      if (texts.length) userText += `\n\n---\n${texts.join("\n\n")}`;
    }

    const userParts: ChatMessageIn["content"] = [{ type: "text", text: userText }];
    for (const a of opts.attachments) {
      if (a.kind === "image" && a.dataUrl) {
        userParts.push({ type: "image_url", image_url: { url: a.dataUrl } });
      }
    }

    const messages: ChatMessageIn[] = [
      { role: "system", content: system },
      ...opts.history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content:
          userParts.length === 1 && typeof userParts[0] !== "string" && userParts[0].type === "text"
            ? userText
            : userParts,
      },
    ];

    const plan = planFor(opts.power, opts.message);
    const stage = hasDoc ? "documento" : search ? "pesquisa" : "escrever";
    send({
      type: "plan",
      plan: { power: opts.power ?? "geral", title: plan.title, steps: plan.steps },
    });
    send({ type: "status", phase: "a_executar", detail: pictureOnly ? "imagem" : video ? "video" : stage });

    if (opts.power === "dj" && isDjSession(opts.message)) {
      const request = getRequest();
      const origin = `${new URL(request.url).protocol}//${new URL(request.url).host}`;
      const made = await createDjSession({ userId: opts.userId, message: opts.message, origin });
      if (!made.ok) {
        await giveBack("refund_failed_run");
        if (!made.connectUrl) {
          send({ type: "error", message: made.message, retryable: true });
          return;
        }
        const reply = `${made.message}\n\n[Ligar Spotify](${made.connectUrl})`;
        await saveMessage({
          id: uid(),
          conversationId: opts.conversationId,
          userId: opts.userId,
          role: "assistant",
          content: reply,
        });
        send({ type: "status", phase: "concluido" as ExecutionPhase });
        send({
          type: "done",
          conversationId: opts.conversationId,
          projectId: opts.projectId ?? null,
          title: titleGuess,
          text: reply,
        });
        return;
      }
      const artifact = {
        id: uid(),
        type: "dj_set" as const,
        title: made.title,
        payload: made.payload,
      };
      const projectId = await touchProject({
        userId: opts.userId,
        title: titleGuess,
        kind: "dj",
        summary: made.reply,
        projectId: opts.projectId,
      });
      await bindConversation({
        id: opts.conversationId,
        userId: opts.userId,
        projectId,
        power: "dj",
        title: titleGuess,
      });
      await hold(artifact, projectId, "dj");
      send({ type: "artifact", artifact });
      const djLine = told(made.reply);
      await saveMessage({
        id: uid(),
        conversationId: opts.conversationId,
        userId: opts.userId,
        role: "assistant",
        content: djLine,
        artifacts: [slimArtifact(artifact)],
      });
      send({ type: "status", phase: "concluido" as ExecutionPhase });
      send({
        type: "done",
        conversationId: opts.conversationId,
        projectId,
        title: titleGuess,
        text: djLine,
      });
      return;
    }

    const priorSite = opts.power === "digital" ? await latestSiteDraft(opts.userId, opts.conversationId).catch(() => null) : null;
    const priorChat = priorSite?.v0ChatId || null;
    const siteTurn = opts.power === "digital" && continuesSite(opts.message, Boolean(priorChat || priorSite?.html));
    if (siteTurn) {
      const stages = priorChat || priorSite?.html ? ["site_update", "site_apply"] : ["site_layout", "site", "site_apply"];
      let step = 0;
      send({ type: "status", phase: "a_executar", detail: stages[0] });
      let sourceHtml = priorSite?.html || "";
      if (!sourceHtml && priorSite?.preview && smallSiteEdit(opts.message)) sourceHtml = await readDemoHtml(priorSite.preview);
      const patched = sourceHtml && smallSiteEdit(opts.message) ? applySmallSiteEdit(sourceHtml, opts.message) : null;
      let made: Awaited<ReturnType<typeof createV0Site>> = { ok: false };
      if (patched && priorSite) {
        send({ type: "status", phase: "a_executar", detail: "site_apply" });
        made = {
          ok: true,
          site: {
            html: patched,
            preview: "",
            shot: priorSite.shot.startsWith("data:image/") ? priorSite.shot : "",
            name: priorSite.name || "Site profissional",
            code: priorSite.code,
            chatId: priorChat || "",
          },
        };
      } else {
        const beat = setInterval(() => {
          step = Math.min(step + 1, stages.length - 1);
          send({ type: "status", phase: "a_executar", detail: stages[step] });
        }, 4000);
        try {
          made = await createV0Site(opts.message, opts.context, () => {
            step = Math.min(step + 1, stages.length - 1);
            send({ type: "status", phase: "a_executar", detail: stages[step] });
          }, {
            chatId: priorChat,
            images: attachedImages.map((item) => item.dataUrl || "").filter(Boolean),
            quick: Boolean(priorChat),
          });
        } finally {
          clearInterval(beat);
        }
      }
      if (!made.ok) {
        await giveBack("refund_failed_run");
        send({ type: "error", message: V0_SITE_FAILED, retryable: true });
        return;
      }
      const site = made.site;
      const artifact = {
        id: uid(),
        type: "website_spec" as const,
        title: site.name || "Site profissional",
        payload: {
          name: site.name || "Site profissional",
          html: site.html,
          preview: site.preview,
          shot: site.shot.startsWith("data:image/") ? site.shot : "",
          code: site.code.slice(0, 12_000),
          source: "v0",
          v0ChatId: site.chatId || priorChat || "",
        },
      };
      const projectId = await touchProject({
        userId: opts.userId,
        title: titleGuess,
        kind: "digital",
        summary: priorChat ? "O site ficou actualizado." : "O site profissional ficou pronto.",
        projectId: opts.projectId || (await conversationProjectId(opts.userId, opts.conversationId)),
      });
      await bindConversation({
        id: opts.conversationId,
        userId: opts.userId,
        projectId,
        power: "digital",
        title: titleGuess,
      });
      await hold(artifact, projectId, "digital");
      send({ type: "artifact", artifact });
      const reply = told(priorSite ? "O site ficou actualizado." : "O site profissional ficou pronto.");
      await saveMessage({
        id: uid(),
        conversationId: opts.conversationId,
        userId: opts.userId,
        role: "assistant",
        content: reply,
        artifacts: [slimArtifact(artifact)],
      });
      send({ type: "status", phase: "concluido" as ExecutionPhase });
      send({
        type: "done",
        conversationId: opts.conversationId,
        projectId,
        title: titleGuess,
        text: reply,
      });
      return;
    }

    const earlyVideo =
      video && !(wantsAnimateStill(opts.message) && !sourceImage?.dataUrl)
        ? (async () => {
            try {
              const extra = await debitCredits({
                userId: opts.userId,
                amount: CREDIT_COSTS.video_generation,
                reason: "video_generation",
                idempotencyKey: `${opts.idempotencyKey}:vid`,
              });
              if (!extra.ok) {
                send({ type: "error", message: extra.error, retryable: false });
                return null;
              }
              send({ type: "credits", used: CREDIT_COSTS.video_generation, remaining: extra.remaining });
              send({ type: "status", phase: "a_executar", detail: "video" });
              const started = await startVideo({
                prompt: withLuandaVoice(opts.message.slice(0, 400), opts.message),
                duration: 6,
                imageUrl: sourceImage?.dataUrl,
              });
              const waited = await waitForVideo(started.requestId, {
                maxMs: 90000,
                onTick: (st) => send({ type: "status", phase: "a_executar", detail: `Vídeo: ${st}` }),
              });
              const artifact = {
                id: uid(),
                type: "video" as const,
                title: waited.url ? "Vídeo curto" : "Vídeo curto em produção",
                payload: {
                  requestId: started.requestId,
                  prompt: opts.message.slice(0, 400),
                  duration: 6,
                  status: waited.status,
                  url: waited.url ?? null,
                  note: "Vídeo curto, cerca de 6 segundos.",
                },
              };
              return artifact;
            } catch (err) {
              await refundCredits({
                userId: opts.userId,
                amount: CREDIT_COSTS.video_generation,
                reason: "refund_video",
                idempotencyKey: `${opts.idempotencyKey}:vid`,
              });
              send({
                type: "error",
                message: `Vídeo: ${friendlyAiError(err)}`,
                retryable: true,
              });
              return null;
            }
          })()
        : null;

    let raw = "";
    const deadline = startDeadline(MODEL_TIMEOUT_MS);
    try {
      const result = await streamChatCompletion({
        role: opts.attachments.some((a) => a.kind === "image") ? "vision" : "reason",
        messages,
        search,
        maxTokens: video ? 400 : pictureOnly ? 500 : wantsWebsite(opts.power, opts.message) ? 8192 : 2048,
        signal: deadline.signal,
        onDelta: (chunk) => {
          raw += chunk;
          if (!pictureOnly && !isSiteRequest(opts.message)) send({ type: "delta", text: chunk });
        },
      });
      deadline.cancel();
      raw = result.text || raw;
    } catch (err) {
      deadline.cancel();
      if (pictureOnly || earlyVideo) {
        await giveBack("refund_failed_run");
        raw = "";
      } else {
        await giveBack("refund_failed_run");
        send({
          type: "error",
          message:
            err instanceof ExecutionTimeoutError || deadline.timedOut()
              ? "A execução demorou demasiado e foi interrompida. Os créditos desta tentativa foram devolvidos."
              : friendlyAiError(err),
          retryable: true,
        });
        return;
      }
    }

    const parsed = parsePililiOutput(raw);
    if (pictureOnly) {
      parsed.artifacts = parsed.artifacts.filter((art) => art.type === "image" || art.type === "video");
      parsed.text = shortImageQuestion(parsed.text);
      parsed.next = null;
    }
    if (!pictureOnly && isSiteRequest(opts.message)) {
      if (!parsed.artifacts.some((art) => art.type === "website_spec")) {
        parsed.artifacts.push({
          id: uid(),
          type: "website_spec",
          title: "Site profissional",
          payload: draftSitePayload(opts.message),
        });
      }
      parsed.text = siteReply(parsed.text);
      parsed.next = null;
    }
    if (!pictureOnly && !isUsableReply(parsed.text) && !hasStructuredDeliverable(parsed.artifacts)) {
      await giveBack("refund_empty");
      send({
        type: "error",
        message: "Não houve uma resposta utilizável. Os créditos desta tentativa foram devolvidos.",
        retryable: true,
      });
      return;
    }
    if (!pictureOnly && !isUsableReply(parsed.text)) {
      const titled = parsed.artifacts.find((art) => art.title.trim());
      parsed.text = titled?.title.trim() || "Organizei o que pediste.";
    }

    const storeArt = async (
      art: { id: string; type: string; title: string; payload: { [key: string]: import("@/lib/pilili/types").Json } },
      projectId: string | null,
    ) => {
      await hold(art, projectId);
    };

    const projectTitle = parsed.meta?.title || titleGuess;
    const kind =
      parsed.meta?.power && parsed.meta.power !== "geral" ? parsed.meta.power : opts.power ?? "geral";
    const projectId = await touchProject({
      userId: opts.userId,
      title: projectTitle,
      kind,
      summary: parsed.text.slice(0, 240),
      projectId: opts.projectId,
    });
    await bindConversation({
      id: opts.conversationId,
      userId: opts.userId,
      projectId,
      power: opts.power ?? (parsed.meta?.power !== "geral" ? parsed.meta?.power ?? null : null),
      title: projectTitle,
    });

    const portrait = opts.attachments.find((a) => a.kind === "image" && a.dataUrl);
    for (const art of parsed.artifacts) {
      if (art.type === "cv_package") {
        attachCvPhoto(art.payload, portrait?.dataUrl);
        hydrateCvPayload(art.payload, art.title, opts.message);
      }
    }

    for (const art of parsed.artifacts.filter((a) => a.type !== "image" && a.type !== "video" && a.type !== "website_spec")) {
      await hold(art, projectId);
      send({ type: "artifact", artifact: art });
    }

    const imageJobs = parsed.images.slice(0, 2);
    if (imageJobs.length === 0) {
      const visualAsk =
        Boolean(parsed.meta?.needs_image) ||
        Boolean(parsed.meta?.needs_edit) ||
        image ||
        (Boolean(edit) && Boolean(sourceImage));
      if (visualAsk) {
        imageJobs.push({
          prompt: fallbackImagePrompt(opts.power, opts.message),
          alt: opts.power === "constroi" ? "Conceito visual" : "Visual PILILÍ",
          edit: Boolean((parsed.meta?.needs_edit || edit) && sourceImage),
        });
      }
    }

    if (skipGeneratedCvImage(opts.power, opts.message)) imageJobs.length = 0;
    const mustEdit =
      editImages.length > 0 &&
      !skipGeneratedCvImage(opts.power, opts.message) &&
      !video &&
      (editAsked || (opts.power === "estudio" && wantsImage(opts.message, opts.power)));
    if (mustEdit) {
      imageJobs.length = 0;
      imageJobs.push({
        prompt: editInstruction(opts.message, editImages.length),
        alt: "Imagem editada",
        edit: true,
      });
    }
    if (!mustEdit && isSiteRequest(opts.message)) {
      imageJobs.length = 0;
      imageJobs.push({ prompt: siteHeroPrompt(opts.message), alt: "Hero do site" });
    }
    if (pictureOnly && editAsked && editImages.length === 0 && imageJobs.length === 0 && !parsed.text.trim()) {
      parsed.text = "Para editar, gera ou anexa uma imagem primeiro.";
    }

    for (const img of imageJobs) {
      const askedEdit = Boolean(img.edit || editAsked || parsed.meta?.needs_edit || mustEdit);
      if (askedEdit && editImages.length === 0) {
        if (!parsed.text.includes("anexa a imagem")) {
          parsed.text = `${parsed.text}\n\nPara editar, anexa a imagem ou gera uma nesta conversa primeiro. Não criei outra no lugar.`.trim();
        }
        continue;
      }
      const useEdit = askedEdit && editImages.length > 0;
      try {
        const extra = await debitCredits({
          userId: opts.userId,
          amount: CREDIT_COSTS.image_generation,
          reason: "image_generation",
          idempotencyKey: `${opts.idempotencyKey}:img:${img.prompt.slice(0, 24)}`,
        });
        if (!extra.ok) {
          send({ type: "error", message: extra.error, retryable: false });
          continue;
        }
        send({ type: "credits", used: CREDIT_COSTS.image_generation, remaining: extra.remaining });
        send({ type: "status", phase: "a_executar", detail: "imagem" });
        const made = useEdit
          ? await editImage({
              prompt: editInstruction(opts.message, editImages.length),
              imageDataUrls: editImages,
            })
          : await generateImage({ prompt: withAngolaFirst(img.prompt, opts.message) });
        const url = imageUrlOf(made);
        if (url) {
          const artifact = {
            id: uid(),
            type: "image" as const,
            title: img.alt,
            payload: { url, prompt: img.prompt, alt: img.alt, edited: useEdit },
          };
          parsed.artifacts.push(artifact);
          await storeArt(artifact, projectId);
          send({ type: "artifact", artifact });
        }
      } catch (err) {
        await refundCredits({
          userId: opts.userId,
          amount: CREDIT_COSTS.image_generation,
          reason: "refund_image",
          idempotencyKey: `${opts.idempotencyKey}:img:${img.prompt.slice(0, 24)}`,
        });
        if (pictureOnly && !parsed.text.trim()) {
          parsed.text = useEdit
            ? "Não consegui editar a imagem. Tenta outra vez."
            : "Não consegui criar a imagem. Tenta outra vez.";
        }
        send({
          type: "error",
          message: `Imagem: ${friendlyAiError(err)}`,
          retryable: true,
        });
      }
    }

    if (earlyVideo) {
      const artifact = await earlyVideo;
      if (artifact) {
        parsed.artifacts.push(artifact);
        await storeArt(artifact, projectId);
        send({ type: "artifact", artifact });
      }
    } else {
      const videoJobs = parsed.videos.slice(0, 1);
      if (videoJobs.length === 0) {
        const site = isSiteRequest(opts.message);
        const asked = site ? userWantsSiteVideo(opts.message) : Boolean(parsed.meta?.needs_video || video);
        if (asked) {
          videoJobs.push({ prompt: site ? siteVideoPrompt(opts.message) : opts.message.slice(0, 400), duration: 6 });
        }
      }
      if (video && wantsAnimateStill(opts.message) && !sourceImage?.dataUrl) {
        videoJobs.length = 0;
        if (!parsed.text.includes("Para animar")) {
          parsed.text = `${parsed.text}\n\nPara animar, anexa a imagem ou gera uma nesta conversa primeiro. Não criei um vídeo de outra cena.`.trim();
        }
      }

      for (const vid of videoJobs) {
        try {
          const extra = await debitCredits({
            userId: opts.userId,
            amount: CREDIT_COSTS.video_generation,
            reason: "video_generation",
            idempotencyKey: `${opts.idempotencyKey}:vid`,
          });
          if (!extra.ok) {
            send({ type: "error", message: extra.error, retryable: false });
            continue;
          }
          send({ type: "credits", used: CREDIT_COSTS.video_generation, remaining: extra.remaining });
          send({ type: "status", phase: "a_executar", detail: "video" });
          const started = await startVideo({
            prompt: withLuandaVoice(vid.prompt, opts.message),
            duration: vid.duration,
            imageUrl: sourceImage?.dataUrl,
          });
          const waited = await waitForVideo(started.requestId, {
            maxMs: 90000,
            onTick: (st) => send({ type: "status", phase: "a_executar", detail: `Vídeo: ${st}` }),
          });
          const artifact = {
            id: uid(),
            type: "video" as const,
            title: waited.url ? "Vídeo curto" : "Vídeo curto em produção",
            payload: {
              requestId: started.requestId,
              prompt: vid.prompt,
              duration: vid.duration,
              status: waited.status,
              url: waited.url ?? null,
              note: "Vídeo curto, cerca de 6 segundos.",
            },
          };
          parsed.artifacts.push(artifact);
          await storeArt(artifact, projectId);
          send({ type: "artifact", artifact });
        } catch (err) {
          await refundCredits({
            userId: opts.userId,
            amount: CREDIT_COSTS.video_generation,
            reason: "refund_video",
            idempotencyKey: `${opts.idempotencyKey}:vid`,
          });
          send({
            type: "error",
            message: `Vídeo: ${friendlyAiError(err)}`,
            retryable: true,
          });
        }
      }
    }

    const brief = `${opts.message}\n${opts.context ?? ""}`;
    const images: string[] = [];
    let heroVideo = "";
    for (const art of parsed.artifacts) {
      if (art.type === "image") {
        const url = String(art.payload.url ?? "");
        if (url) images.push(url);
      }
      if (!heroVideo && art.type === "video") heroVideo = String(art.payload.url ?? "");
    }
    const photos = images.length ? images : isSiteRequest(opts.message) ? stockImages(opts.message) : [];
    for (const art of parsed.artifacts) {
      if (art.type !== "website_spec") continue;
      const html = typeof art.payload.html === "string" ? art.payload.html : "";
      art.payload = { ...art.payload, html: styleWebsite(html, brief, { images: photos, video: heroVideo }, art.payload) };
      await hold(art, projectId);
      send({ type: "artifact", artifact: art });
    }

    if (parsed.next) send({ type: "next", suggestion: parsed.next });
    if (parsed.memory.length) await upsertMemory(opts.userId, parsed.memory);

    const finalText = told(parsed.text);
    await saveMessage({
      id: uid(),
      conversationId: opts.conversationId,
      userId: opts.userId,
      role: "assistant",
      content: finalText,
      artifacts: parsed.artifacts.map((art) => slimArtifact(art)),
      nextStep: parsed.next,
    });

    send({ type: "status", phase: "concluido" as ExecutionPhase });
    send({
      type: "done",
      conversationId: opts.conversationId,
      projectId,
      title: projectTitle,
      text: finalText,
    });
  } catch (err) {
    await giveBack("refund_failed_run");
    send({
      type: "error",
      message: friendlyAiError(err),
      retryable: true,
    });
  }
}
