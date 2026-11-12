import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Composer } from "@/components/chat/Composer";
import { ExecutionIndicator } from "@/components/chat/ExecutionIndicator";
import { MessageList } from "@/components/chat/Thread";
import { streamPilili } from "@/lib/client/stream";
import { mergeConversation, appendUserMessage, commitAssistant } from "@/lib/client/messages";
import { attachCvPhoto, hydrateCvPayload } from "@/lib/pilili/cv";
import { dedupeTextAgainstArtifacts } from "@/lib/pilili/format-answer";
import { SendLock } from "@/lib/client/send-lock";
import { READ_STREAM_MESSAGE } from "@/lib/client/stream-end";
import { useBootstrap } from "@/lib/client/bootstrap";
import { getConversation } from "@/lib/server/functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { usePilili } from "@/lib/store";
import { uid } from "@/lib/utils";
import { peekPendingFor, readPendingFor, setNextPath } from "@/lib/client/pending";
import { readBlankChat, recallStudyLanguage, studyLanguageNote } from "@/lib/client/blank-chat";
import { MediaSketch } from "@/components/chat/MediaSketch";
import type { AttachmentMeta, ChatMessage, ExecutionPhase, PowerId, StreamEvent } from "@/lib/pilili/types";
import { POWER_BY_ID } from "@/lib/pilili/powers";
import { executionStatus, openingDetail, siteProgress } from "@/lib/pilili/execution-status";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/c/$id")({ component: ConversationPage });

function ConversationPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const boot = useBootstrap();
  const applyCredits = usePilili((s) => s.applyCredits);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamText, setStreamText] = useState("");
  const [phase, setPhase] = useState<ExecutionPhase | null>(null);
  const [detail, setDetail] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const lastPayload = useRef<{
    text: string;
    attachments: AttachmentMeta[];
    power: string | null;
    projectId: string | null;
    context?: string;
  } | null>(null);
  const started = useRef(false);
  const sendLock = useRef(new SendLock());
  const powerRef = useRef<string | null>(null);
  const contextRef = useRef<string | undefined>(undefined);
  const projectRef = useRef<string | null>(null);
  const [activePower, setActivePower] = useState<string | null>(null);
  const [hint, setHint] = useState<string | undefined>();
  const [intro, setIntro] = useState<string | undefined>();
  const [back, setBack] = useState(false);
  const [booted, setBooted] = useState(false);

  const existing = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => getConversation({ data: id }),
    enabled: Boolean(user) && !isPending,
  });

  useLayoutEffect(() => {
    const blank = readBlankChat(id);
    const langNote = studyLanguageNote(blank?.lang) || studyLanguageNote(recallStudyLanguage(id));
    contextRef.current = blank?.context || langNote;
    if (blank) {
      setHint(blank.placeholder);
      setIntro(blank.intro);
      setBack(Boolean(blank.back));
      powerRef.current = blank.power;
      setActivePower(blank.power);
      usePilili.getState().setDraft({ text: "", power: blank.power });
      usePilili.getState().setAttachments([]);
    }
    const p = peekPendingFor(id);
    if (!p) {
      setBooted(true);
      return;
    }
    setPhase((cur) => cur ?? "preparando");
    setDetail((d) => (d && d !== "preparar" ? d : openingDetail(p.power, p.text)));
    if (p.power) {
      powerRef.current = p.power;
      setActivePower(p.power);
    }
    if (p.projectId) projectRef.current = p.projectId;
    setMessages((m) =>
      appendUserMessage(m, {
        id: `pending-${id}`,
        role: "user",
        content: p.text,
        artifacts: [],
        createdAt: new Date().toISOString(),
      }),
    );
    setBooted(true);
  }, [id]);

  useEffect(() => {
    const loaded = existing.data;
    if (!loaded?.messages) return;
    setMessages((local) =>
      mergeConversation(
        local,
        loaded.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          artifacts: m.artifacts,
          createdAt: m.createdAt,
          nextStep: m.nextStep,
        })),
      ),
    );
    if (loaded.power) {
      powerRef.current = loaded.power;
      setActivePower(loaded.power);
    }
    if (loaded.projectId) projectRef.current = loaded.projectId;
  }, [existing.data]);

  async function run(
    text: string,
    attachments: AttachmentMeta[],
    power: string | null,
    projectId: string | null,
    opts?: { idem?: string; retry?: boolean; context?: string },
  ) {
    if (!sendLock.current.begin()) return;
    let settled = false;
    try {
      lastPayload.current = { text, attachments, power, projectId, context: opts?.context };
      powerRef.current = power;
      projectRef.current = projectId;
      setActivePower(power);
      setError(null);
      setRetryable(false);
      setPhase("preparando");
      setDetail(openingDetail(power, text));
      setStreamText("");
      const prior = messages.map((m) => ({ role: m.role, content: m.content }));
      if (!opts?.retry) {
        const userMsg: ChatMessage = {
          id: uid(),
          role: "user",
          content: text,
          artifacts: [],
          createdAt: new Date().toISOString(),
        };
        setMessages((m) => appendUserMessage(m, userMsg));
      }
      const assistantId = uid();
      let acc = "";
      const artifacts: ChatMessage["artifacts"] = [];
      let nextStep: string | undefined;

      await streamPilili({
        conversationId: id,
        message: text,
        power,
        projectId,
        history: prior,
        attachments,
        idempotencyKey: opts?.idem ?? uid(),
        context: opts?.context,
        onEvent: (ev: StreamEvent) => {
          if (ev.type === "status") {
            setPhase(ev.phase);
            setDetail(ev.detail);
          }
          if (ev.type === "delta") {
            acc += ev.text;
            setStreamText(acc);
          }
          if (ev.type === "artifact") {
            if (ev.artifact.type === "cv_package") {
              const shot = attachments.find((item) => item.kind === "image" && item.dataUrl);
              attachCvPhoto(ev.artifact.payload, shot?.dataUrl);
              hydrateCvPayload(ev.artifact.payload, ev.artifact.title, text);
            }
            artifacts.push(ev.artifact);
            if (ev.artifact.type === "image" || ev.artifact.type === "video") {
              setDetail(undefined);
              setMessages((m) =>
                commitAssistant(m, {
                  id: assistantId,
                  role: "assistant",
                  content: "",
                  artifacts: artifacts.filter((item) => item.type === "image" || item.type === "video"),
                  createdAt: new Date().toISOString(),
                }),
              );
            }
          }
          if (ev.type === "next") nextStep = ev.suggestion;
          if (ev.type === "credits") applyCredits(ev.remaining);
          if (ev.type === "error") {
            const side = ev.message.startsWith("Imagem:") || ev.message.startsWith("Vídeo:");
            if (!side) {
              settled = true;
              setError(ev.message === "Unauthorized" ? "Entra na tua conta para continuar." : ev.message);
              setRetryable(ev.retryable);
              setPhase("erro");
            }
          }
          if (ev.type === "done") {
            settled = true;
            if (ev.projectId) projectRef.current = ev.projectId;
            setMessages((m) =>
              commitAssistant(m, {
                id: assistantId,
                role: "assistant",
                content: dedupeTextAgainstArtifacts(ev.text || acc, artifacts),
                artifacts: [...artifacts],
                createdAt: new Date().toISOString(),
                nextStep,
              }),
            );
            setStreamText("");
            setPhase("concluido");
            void boot.refetch();
          }
        },
      });
    } catch {
      if (!settled) {
        settled = true;
        setError(READ_STREAM_MESSAGE);
        setRetryable(true);
        setPhase("erro");
      }
    } finally {
      if (!settled) {
        setError("A ligação fechou antes da resposta. Podes tentar outra vez.");
        setRetryable(true);
        setPhase("erro");
      }
      sendLock.current.end();
    }
  }

  useEffect(() => {
    if (!user && !isPending) setNextPath(`/c/${id}`);
  }, [user, isPending, id]);

  useEffect(() => {
    if (isPending || !user || started.current) return;
    const p = readPendingFor(id);
    if (!p) return;
    started.current = true;
    if (p.power) setActivePower(p.power);
    void run(p.text, p.attachments ?? [], p.power, p.projectId, { context: p.context });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isPending, id]);

  if (!isPending && !user) return <RedirectToSignIn />;

  const powerDef = activePower && (activePower as PowerId) in POWER_BY_ID ? POWER_BY_ID[activePower as PowerId] : null;
  const running = phase === "preparando" || phase === "a_executar" || phase === "a_verificar";
  const showThread = messages.length > 0 || Boolean(streamText) || running;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      {intro || back ? (
        <div className="mx-auto w-full max-w-2xl px-4 pt-3">
          <Link
            to="/poderes/$slug"
            params={{ slug: "estuda" }}
            className="inline-flex min-h-11 items-center text-sm text-gold"
          >
            ← Voltar
          </Link>
        </div>
      ) : powerDef ? (
        <div className="mx-auto w-full max-w-2xl px-4 pt-3">
          <Link
            to="/poderes/$slug"
            params={{ slug: powerDef.id }}
            className="inline-flex min-h-11 items-center text-sm text-gold"
          >
            {powerDef.name} · {powerDef.tagline}
          </Link>
        </div>
      ) : null}
      {showThread ? (
        <div className="flex-1">
          <MessageList
            messages={messages}
            streamingText={streamText}
            onContinue={(text) =>
              void run(text, [], powerRef.current, projectRef.current, {
                context: contextRef.current || studyLanguageNote(recallStudyLanguage(id)),
              })
            }
          />
          <div className="mx-auto w-full max-w-2xl px-4">
            <ExecutionIndicator phase={phase} power={activePower} detail={detail} />
            {running && (detail === "imagem" || detail === "site" || (detail ?? "").startsWith("site_") || (detail ?? "").toLowerCase().startsWith("vídeo") || (detail ?? "").toLowerCase().startsWith("video")) ? (
              <MediaSketch
                kind={detail === "imagem" ? "imagem" : detail === "site" || (detail ?? "").startsWith("site_") ? "site" : "video"}
                step={siteProgress(detail)?.index ?? 1}
                note={executionStatus({ phase, power: activePower, detail }) ?? undefined}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl flex-1 px-5 py-16">
          {intro ? (
            <>
              <h1 className="font-display text-3xl font-semibold tracking-tight">{intro}</h1>
              <p className="mt-2 text-muted">{hint}</p>
            </>
          ) : hint ? (
            <h1 className="font-display text-3xl font-semibold tracking-tight">{hint}</h1>
          ) : booted ? (
            <>
              <h1 className="font-display text-3xl font-semibold tracking-tight">O que precisas?</h1>
              <p className="mt-2 text-muted">
                {isPending ? "A preparar a conversa…" : "Fala naturalmente. O PILILÍ trata do resto."}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">A preparar a conversa…</p>
          )}
        </div>
      )}
      {error ? (
        <div className="mx-auto w-full max-w-2xl px-4">
          <div className="rounded-2xl bg-surface px-4 py-4 text-sm shadow-[var(--shadow-border)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-gold">Motor em pausa</p>
            <p className="mt-2">{error}</p>
            <p className="mt-2 text-xs text-subtle">
              {error.includes("cota")
                ? "Não inventamos a resposta. Quando a cota voltar, isto executa de verdade."
                : "Não inventamos a resposta. Podes tentar outra vez."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {retryable && lastPayload.current ? (
                <button
                  type="button"
                  className="min-h-11 rounded-full px-4 text-sm text-gold shadow-[var(--shadow-border)]"
                  onClick={() => {
                    const p = lastPayload.current!;
                    void run(p.text, p.attachments, p.power, p.projectId, { idem: uid(), retry: true, context: p.context });
                  }}
                >
                  Tentar outra vez
                </button>
              ) : null}
              {powerDef ? (
                <Link
                  to="/poderes/$slug"
                  params={{ slug: powerDef.id }}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-muted shadow-[var(--shadow-border)]"
                >
                  Abrir {powerDef.name}
                </Link>
              ) : (
                <Link
                  to="/poderes"
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-muted shadow-[var(--shadow-border)]"
                >
                  Ver os Super Poderes
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <div className="sticky bottom-20 z-20 mx-auto w-full max-w-2xl px-4 py-3">
        <Composer
          busy={isPending || running}
          variant="dock"
          placeholder={hint}
          onSubmit={(text, files) =>
            void run(text, files, powerRef.current, projectRef.current, {
              context: contextRef.current || studyLanguageNote(recallStudyLanguage(id)),
            })
          }
        />
      </div>
    </div>
  );
}
