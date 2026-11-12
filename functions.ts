import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { CREDIT_COSTS } from "@/lib/pilili/credits";
import { uid } from "@/lib/utils";
import { debitCredits, ensureProfile, listMemory, refundCredits, rememberVideoUrl, videoFileAlreadyKept } from "./db-helpers";
import { hasXaiKey, pollVideo, synthesizeSpeech } from "./grok";
import { publishNetlifySite, requestMusic, reviewPaymentConfirmation } from "./integrations";
import { extractOfficeText } from "./documents";
import { unpackStoredArtifacts } from "@/lib/pilili/parse";
import { applyDoneMarks } from "@/lib/pilili/tasks";
import { keepVideoFile, mediaFromStored, visibleImageUrl } from "@/lib/pilili/library-media";

export const getBootstrap = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const profile = await ensureProfile(context.userId);
    const sql = await getSql();
    const projects = await sql<{
      id: string;
      title: string;
      kind: string;
      summary: string | null;
      created_at: string;
      updated_at: string;
    }>`select id, title, kind, summary, created_at, updated_at from projects where user_id = ${context.userId} order by updated_at desc limit 20`;
    const conversations = await sql<{
      id: string;
      project_id: string | null;
      power: string | null;
      title: string;
      created_at: string;
      updated_at: string;
    }>`select id, project_id, power, title, created_at, updated_at from conversations where user_id = ${context.userId} order by updated_at desc limit 30`;
    const library = await sql<{
      id: string;
      project_id: string | null;
      conversation_id: string | null;
      kind: string;
      title: string;
      mime: string | null;
      body: string | null;
      image_url: string | null;
      power: string | null;
      created_at: string;
    }>`select id, project_id, conversation_id, kind, title, mime,
      case when kind in ('image', 'video') and octet_length(coalesce(body, '')) > 12000 then '{"stored":true}' else body end as body,
      case when image_url like 'data:video%' then null when image_url like 'data:%' and octet_length(image_url) > 180000 then null else image_url end as image_url,
      power, created_at from library_items where user_id = ${context.userId} order by created_at desc limit 40`;
    const memory = await listMemory(context.userId);
    return {
      aiReady: hasXaiKey(),
      profile: {
        userId: profile.user_id,
        displayName: profile.display_name,
        plan: profile.plan as "trial" | "bue" | "pro" | "pro_plus" | "business",
        credits: Number(profile.credits),
        locale: profile.locale,
        lowData: Boolean(profile.low_data),
      },
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        kind: p.kind,
        summary: p.summary,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
      conversations: conversations.map((c) => ({
        id: c.id,
        projectId: c.project_id,
        power: c.power,
        title: c.title,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      library: library.map((i) => ({
        id: i.id,
        projectId: i.project_id,
        conversationId: i.conversation_id,
        kind: i.kind,
        title: i.title,
        mime: i.mime,
        body: i.body,
        imageUrl: visibleImageUrl(i.image_url),
        power: i.power,
        createdAt: i.created_at,
      })),
      memory,
    };
  });

export const getConversation = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const conv = await sql<{
      id: string;
      project_id: string | null;
      power: string | null;
      title: string;
      created_at: string;
      updated_at: string;
    }>`select id, project_id, power, title, created_at, updated_at from conversations where id = ${id} and user_id = ${context.userId}`;
    if (!conv[0]) return null;
    const messages = await sql<{
      id: string;
      role: string;
      content: string;
      artifacts_json: string | null;
      created_at: string;
    }>`select id, role, content, artifacts_json, created_at from messages where conversation_id = ${id} and user_id = ${context.userId} order by created_at asc`;
    const media = await sql<{ id: string; image_url: string | null }>`
      select id,
        case
          when image_url like 'data:video%' then 'stored-video'
          when octet_length(image_url) > 180000 then 'stored-media'
          else image_url
        end as image_url
      from library_items
      where user_id = ${context.userId} and conversation_id = ${id}
        and image_url is not null
    `;
    const mediaById = new Map(media.map((row) => [row.id, row.image_url]));
    return {
      id: conv[0].id,
      projectId: conv[0].project_id,
      power: conv[0].power,
      title: conv[0].title,
      createdAt: conv[0].created_at,
      updatedAt: conv[0].updated_at,
      messages: messages.map((m) => {
        const packed = unpackStoredArtifacts(m.artifacts_json);
        return {
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          artifacts: packed.artifacts.map((art) => {
            const saved = mediaById.get(art.id);
            if (!saved) return art;
            const current = typeof art.payload.url === "string" ? art.payload.url : "";
            if (saved === "stored-video" || saved === "stored-media") {
              const keep = current.startsWith("https://") ? current : "";
              return { ...art, payload: { ...art.payload, url: keep, stored: true } };
            }
            if (saved.startsWith("data:") || !current) {
              return {
                ...art,
                payload: { ...art.payload, url: saved, stored: saved.startsWith("data:") || art.payload.stored === true },
              };
            }
            return art;
          }),
          createdAt: m.created_at,
          nextStep: packed.nextStep,
        };
      }),
    };
  });

export const updatePrefs = createServerFn({ method: "POST" })
  .validator((input: { lowData?: boolean; displayName?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureProfile(context.userId);
    const sql = await getSql();
    if (typeof data.lowData === "boolean") {
      await sql`update profiles set low_data = ${data.lowData}, updated_at = now() where user_id = ${context.userId}`;
    }
    if (typeof data.displayName === "string") {
      await sql`update profiles set display_name = ${data.displayName.slice(0, 80)}, updated_at = now() where user_id = ${context.userId}`;
    }
    return { ok: true as const };
  });

export const deleteMemoryFact = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from memory_facts where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const createProject = createServerFn({ method: "POST" })
  .validator((input: { title: string; kind?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const title = data.title.trim().slice(0, 120);
    if (!title) return { ok: false as const, error: "O projecto precisa de um nome." };
    const sql = await getSql();
    const id = uid();
    await sql`insert into projects (id, user_id, title, kind) values (${id}, ${context.userId}, ${title}, ${data.kind ?? "geral"})`;
    return { ok: true as const, id };
  });

export const renameProject = createServerFn({ method: "POST" })
  .validator((input: { id: string; title: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const title = data.title.trim().slice(0, 120);
    if (!title) return { ok: false as const, error: "O projecto precisa de um nome." };
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      update projects set title = ${title}, updated_at = now()
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) return { ok: false as const, error: "Não encontrei este projecto." };
    return { ok: true as const };
  });

export const saveFeedback = createServerFn({ method: "POST" })
  .validator((input: { body: string; path?: string }) => input)
  .handler(async ({ data }) => {
    const body = data.body.trim().slice(0, 2000);
    if (body.length < 4) return { ok: false as const, error: "Escreve o que correu bem ou o que falhou." };
    let userId: string | null = null;
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      const user = await getSessionUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }
    const sql = await getSql();
    const id = uid();
    await sql`
      insert into feedback (id, user_id, body, path)
      values (${id}, ${userId}, ${body}, ${(data.path ?? "").slice(0, 160) || null})
    `;
    return { ok: true as const };
  });

export const listAccountItems = createServerFn({ method: "POST" })
  .validator((input: { power?: string | null }) => input ?? {})
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const power = data?.power ?? null;
    const rows = power
      ? await sql<{
          id: string;
          project_id: string | null;
          conversation_id: string | null;
          kind: string;
          title: string;
          mime: string | null;
          body: string | null;
          image_url: string | null;
          power: string | null;
          created_at: string;
        }>`select id, project_id, conversation_id, kind, title, mime,
          case when kind in ('image', 'video') and octet_length(coalesce(body, '')) > 12000 then '{"stored":true}' else body end as body,
          case when image_url like 'data:video%' then null when image_url like 'data:%' and octet_length(image_url) > 180000 then null else image_url end as image_url,
          power, created_at
          from library_items where user_id = ${context.userId} and power = ${power}
          order by created_at desc limit 40`
      : await sql<{
          id: string;
          project_id: string | null;
          conversation_id: string | null;
          kind: string;
          title: string;
          mime: string | null;
          body: string | null;
          image_url: string | null;
          power: string | null;
          created_at: string;
        }>`select id, project_id, conversation_id, kind, title, mime,
          case when kind in ('image', 'video') and octet_length(coalesce(body, '')) > 12000 then '{"stored":true}' else body end as body,
          case when image_url like 'data:video%' then null when image_url like 'data:%' and octet_length(image_url) > 180000 then null else image_url end as image_url,
          power, created_at
          from library_items where user_id = ${context.userId}
          order by created_at desc limit 80`;
    return rows.map((i) => ({
      id: i.id,
      projectId: i.project_id,
      conversationId: i.conversation_id,
      kind: i.kind,
      title: i.title,
      mime: i.mime,
      body: i.body,
      imageUrl: visibleImageUrl(i.image_url),
      power: i.power,
      createdAt: i.created_at,
    }));
  });

const POWER_NOTES = {
  emprego_profile: "emprego",
  vida_plan: "vida",
  executar_plan: "executar",
} as const;

export const savePowerNote = createServerFn({ method: "POST" })
  .validator((input: { kind: keyof typeof POWER_NOTES; title: string; body: string; replace?: boolean; id?: string | null }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const power = POWER_NOTES[data.kind];
    if (!power) return { ok: false as const, error: "Não guardo este tipo." };
    const title = data.title.trim().slice(0, 120);
    const body = data.body.trim().slice(0, 8000);
    if (!title || !body) return { ok: false as const, error: "Escreve o conteúdo antes de guardar." };
    const sql = await getSql();
    if (data.id) {
      const updated = await sql<{ id: string }>`
        update library_items
        set title = ${title}, body = ${body}, power = ${power}, mime = 'text/plain'
        where id = ${data.id} and user_id = ${context.userId} and kind = ${data.kind}
        returning id
      `;
      if (!updated[0]) return { ok: false as const, error: "Não encontrei este item na tua conta." };
      return { ok: true as const, id: updated[0].id };
    }
    if (data.replace) {
      const existing = await sql<{ id: string }>`
        select id from library_items
        where user_id = ${context.userId} and kind = ${data.kind}
        order by created_at desc
        limit 1
      `;
      if (existing[0]) {
        await sql`
          update library_items
          set title = ${title}, body = ${body}, power = ${power}, mime = 'application/json'
          where id = ${existing[0].id} and user_id = ${context.userId}
        `;
        return { ok: true as const, id: existing[0].id };
      }
    }
    const id = uid();
    await sql`
      insert into library_items (id, user_id, kind, title, mime, body, power)
      values (${id}, ${context.userId}, ${data.kind}, ${title}, ${"text/plain"}, ${body}, ${power})
    `;
    return { ok: true as const, id };
  });

export const saveChecklistProgress = createServerFn({ method: "POST" })
  .validator((input: { id: string; done: boolean[] }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const id = data.id?.trim();
    const done = Array.isArray(data.done) ? data.done.map((flag) => Boolean(flag)) : [];
    if (!id || done.length < 1 || done.length > 40) {
      return { ok: false as const, error: "Não consegui guardar esta lista." };
    }
    const sql = await getSql();
    const rows = await sql<{ id: string; kind: string; body: string | null; power: string | null }>`
      select id, kind, body, power from library_items
      where id = ${id} and user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "Esta lista não está na tua conta." };
    const allowed =
      row.power === "vida" ||
      row.power === "executar" ||
      row.kind === "vida_plan" ||
      row.kind === "executar_plan";
    if (!allowed) return { ok: false as const, error: "Só guardo o progresso em VIDA e Executar Agora." };
    if (row.kind === "vida_plan" || row.kind === "executar_plan") {
      const body = applyDoneMarks(row.body ?? "", done);
      if (!body) return { ok: false as const, error: "A lista mudou. Abre outra vez." };
      await sql`
        update library_items set body = ${body}
        where id = ${row.id} and user_id = ${context.userId}
      `;
      return { ok: true as const };
    }
    let payload: { items?: unknown };
    try {
      payload = JSON.parse(row.body ?? "") as { items?: unknown };
    } catch {
      return { ok: false as const, error: "Não consegui ler a lista." };
    }
    if (!Array.isArray(payload.items) || payload.items.length !== done.length) {
      return { ok: false as const, error: "A lista mudou. Abre outra vez." };
    }
    payload.items = payload.items.map((item, index) => {
      const current = item && typeof item === "object" ? item : { text: String(item ?? "") };
      return { ...current, done: done[index] };
    });
    await sql`
      update library_items set body = ${JSON.stringify(payload)}
      where id = ${row.id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const extractDocument = createServerFn({ method: "POST" })
  .validator((input: { name: string; mime: string; base64: string }) => input)
  .handler(async ({ data }) => {
    if (data.base64.length > 8_000_000) {
      return { ok: false as const, message: "O ficheiro é grande demais. Envia até 6 MB ou uma fotografia das páginas." };
    }
    return extractOfficeText(data);
  });

export const receivePaymentConfirmation = createServerFn({ method: "POST" })
  .validator((input: { reference: string; amountKz: number; planId: string; method: string }) => input)
  .handler(async ({ data }) => reviewPaymentConfirmation(data));

export const publishToNetlify = createServerFn({ method: "POST" })
  .validator((input: { html: string; name: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ data }) => publishNetlifySite({ html: data.html, name: data.name.trim().slice(0, 80) }));

export const prepareMusic = createServerFn({ method: "POST" })
  .validator((input: { description: string; style: string; language: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const description = data.description.trim().slice(0, 500);
    if (description.length < 3) return { ok: false as const, message: "Descreve a música." };
    return requestMusic({
      description,
      style: data.style.trim().slice(0, 80),
      language: data.language.trim().slice(0, 40) || "português de Angola",
    });
  });

export const speakText = createServerFn({ method: "POST" })
  .validator((input: { text: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const key = `tts:${uid()}`;
    const debit = await debitCredits({
      userId: context.userId,
      amount: CREDIT_COSTS.tts,
      reason: "tts",
      idempotencyKey: key,
    });
    if (!debit.ok) return { ok: false as const, error: debit.error };
    try {
      const buf = await synthesizeSpeech(data.text);
      const b64 = Buffer.from(buf).toString("base64");
      return { ok: true as const, audio: `data:audio/mpeg;base64,${b64}` };
    } catch (e) {
      await refundCredits({
        userId: context.userId,
        amount: CREDIT_COSTS.tts,
        reason: "refund_tts",
        idempotencyKey: key,
      });
      return { ok: false as const, error: e instanceof Error ? e.message : "Voz indisponível." };
    }
  });

export const fetchVideoFile = createServerFn({ method: "POST" })
  .validator((input: { url: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    let parsed: URL;
    try {
      parsed = new URL(data.url);
    } catch {
      return { ok: false as const, error: "Endereço de vídeo inválido." };
    }
    const host = parsed.hostname;
    if (parsed.protocol !== "https:" || !(host === "vidgen.x.ai" || host.endsWith(".x.ai"))) {
      return { ok: false as const, error: "Este vídeo não pode ser descarregado." };
    }
    const res = await fetch(parsed.toString());
    if (!res.ok) return { ok: false as const, error: "Não consegui obter o vídeo." };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 32 || buf.byteLength > 25_000_000) {
      return { ok: false as const, error: "O ficheiro de vídeo não serve para descarregar." };
    }
    return { ok: true as const, base64: buf.toString("base64"), mime: "video/mp4" };
  });

export const getLibraryMedia = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const id = data.id?.trim();
    if (!id) return { ok: false as const, error: "Este vídeo já não está disponível." };
    const sql = await getSql();
    const rows = await sql<{ image_url: string | null; body: string | null }>`
      select image_url, body from library_items where id = ${id} and user_id = ${context.userId} limit 1
    `;
    const url = mediaFromStored(rows[0]?.image_url, rows[0]?.body) ?? "";
    if (!url) return { ok: false as const, error: "Este vídeo já não está disponível." };
    return { ok: true as const, url };
  });

export const getVideoStatus = createServerFn({ method: "POST" })
  .validator((input: { requestId: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    try {
      const r = await pollVideo(data.requestId);
      if (r.url) {
        const keptAlready = await videoFileAlreadyKept(context.userId, data.requestId);
        if (!keptAlready) {
          const kept = await keepVideoFile(r.url);
          await rememberVideoUrl(context.userId, data.requestId, kept ?? r.url);
        }
      }
      return { ok: true as const, status: r.status, url: r.url ?? null };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Não foi possível ver o vídeo." };
    }
  });
