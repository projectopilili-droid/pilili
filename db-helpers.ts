import { getSql } from "@/lib/db";
import { DEBIT_SQL, REFUND_SQL } from "@/lib/pilili/credit-ops";
import { TRIAL_CREDITS, testAllowanceGrant } from "@/lib/pilili/credits";
import { uid } from "@/lib/utils";
import type { Artifact, PowerId } from "@/lib/pilili/types";

export type ProfileRow = {
  user_id: string;
  display_name: string | null;
  plan: string;
  credits: number;
  locale: string;
  low_data: boolean;
};

export async function ensureProfile(userId: string, email?: string | null): Promise<ProfileRow> {
  const sql = await getSql();
  const existing = await sql<ProfileRow>`select user_id, display_name, plan, credits, locale, low_data from profiles where user_id = ${userId}`;
  if (existing[0]) {
    const grant = testAllowanceGrant(existing[0].plan, Number(existing[0].credits));
    if (grant > 0) {
      await applyTestGrant(userId, grant);
      const refreshed = await sql<ProfileRow>`select user_id, display_name, plan, credits, locale, low_data from profiles where user_id = ${userId}`;
      if (refreshed[0]) return refreshed[0];
    }
    return existing[0];
  }
  const name = email ? email.split("@")[0] : null;
  await sql`insert into profiles (user_id, display_name, plan, credits) values (${userId}, ${name}, ${"trial"}, ${TRIAL_CREDITS}) on conflict (user_id) do nothing`;
  const again = await sql<ProfileRow>`select user_id, display_name, plan, credits, locale, low_data from profiles where user_id = ${userId}`;
  return again[0]!;
}

async function applyTestGrant(userId: string, amount: number) {
  const sql = await getSql();
  await sql.query(REFUND_SQL, [uid(), userId, amount, "test_phase_allowance", "refund:test-phase-floor"]);
}

export async function debitCredits(opts: {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
  meta?: string;
}): Promise<{ ok: true; remaining: number } | { ok: false; remaining: number; error: string }> {
  if (!Number.isFinite(opts.amount) || opts.amount <= 0) {
    const profile = await ensureProfile(opts.userId);
    return {
      ok: false,
      remaining: Number(profile.credits),
      error: "O custo deste pedido não é válido.",
    };
  }
  const sql = await getSql();
  await ensureProfile(opts.userId);
  const rows = await sql.query<{ remaining: number | string | null; inserted: string | null }>(
    DEBIT_SQL,
    [opts.userId, opts.idempotencyKey, opts.amount, uid(), opts.reason, opts.meta ?? null],
  );
  const row = rows[0];
  if (row?.inserted) {
    return { ok: true, remaining: Number(row.remaining) };
  }
  const dup = await sql<{ id: string }>`select id from credit_ledger where user_id = ${opts.userId} and idempotency_key = ${opts.idempotencyKey}`;
  const profile = await ensureProfile(opts.userId);
  if (dup[0]) return { ok: true, remaining: Number(profile.credits) };
  return {
    ok: false,
    remaining: Number(profile.credits),
    error: `Não tens créditos suficientes (${Number(profile.credits)} restantes, precisa de ${opts.amount}). Sobe de plano em Mais.`,
  };
}

export async function refundCredits(opts: {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}): Promise<number> {
  const sql = await getSql();
  await ensureProfile(opts.userId);
  const key = `refund:${opts.idempotencyKey}`;
  const rows = await sql.query<{ remaining: number | string | null; inserted: string | null }>(
    REFUND_SQL,
    [uid(), opts.userId, opts.amount, opts.reason, key],
  );
  if (rows[0]?.inserted) return Number(rows[0].remaining);
  const profile = await ensureProfile(opts.userId);
  return Number(profile.credits);
}

export async function listMemory(userId: string) {
  const sql = await getSql();
  return sql<{ id: number; kind: string; key: string; value: string }>`
    select id, kind, key, value from memory_facts where user_id = ${userId} order by id desc limit 40
  `;
}

export async function upsertMemory(
  userId: string,
  facts: { key: string; value: string; kind: string }[],
) {
  if (facts.length === 0) return;
  const sql = await getSql();
  for (const f of facts.slice(0, 8)) {
    await sql`
      insert into memory_facts (user_id, kind, key, value)
      values (${userId}, ${f.kind}, ${f.key}, ${f.value})
      on conflict (user_id, key) do update set value = excluded.value, kind = excluded.kind
    `;
  }
}

export async function saveMessage(opts: {
  id: string;
  conversationId: string;
  userId: string;
  role: string;
  content: string;
  artifacts?: Artifact[];
  nextStep?: string | null;
}) {
  const sql = await getSql();
  const packed =
    opts.artifacts || opts.nextStep
      ? JSON.stringify({ artifacts: opts.artifacts ?? [], nextStep: opts.nextStep ?? null })
      : null;
  await sql`
    insert into messages (id, conversation_id, user_id, role, content, artifacts_json)
    values (${opts.id}, ${opts.conversationId}, ${opts.userId}, ${opts.role}, ${opts.content}, ${packed})
  `;
  await sql`update conversations set updated_at = now() where id = ${opts.conversationId} and user_id = ${opts.userId}`;
}

export async function ensureConversation(opts: {
  id: string;
  userId: string;
  projectId?: string | null;
  power?: PowerId | null;
  title: string;
}) {
  const sql = await getSql();
  const existing = await sql<{ id: string }>`select id from conversations where id = ${opts.id} and user_id = ${opts.userId}`;
  if (existing[0]) return;
  await sql`
    insert into conversations (id, user_id, project_id, power, title)
    values (${opts.id}, ${opts.userId}, ${opts.projectId ?? null}, ${opts.power ?? null}, ${opts.title})
  `;
}

export async function bindConversation(opts: {
  id: string;
  userId: string;
  projectId: string | null;
  power: string | null;
  title: string;
}) {
  const sql = await getSql();
  await sql`
    update conversations
    set project_id = coalesce(${opts.projectId}, project_id),
        power = coalesce(${opts.power}, power),
        title = ${opts.title},
        updated_at = now()
    where id = ${opts.id} and user_id = ${opts.userId}
  `;
}

export async function touchProject(opts: {
  userId: string;
  title: string;
  kind: string;
  summary?: string;
  projectId?: string | null;
}): Promise<string> {
  const sql = await getSql();
  if (opts.projectId) {
    const owned = await sql<{ id: string }>`
      select id from projects where id = ${opts.projectId} and user_id = ${opts.userId}
    `;
    if (owned[0]) {
      await sql`update projects set updated_at = now(), kind = ${opts.kind}, summary = coalesce(${opts.summary ?? null}, summary) where id = ${owned[0].id}`;
      return owned[0].id;
    }
  }
  const found = await sql<{ id: string }>`
    select id from projects where user_id = ${opts.userId} and title = ${opts.title} limit 1
  `;
  if (found[0]) {
    await sql`update projects set updated_at = now(), kind = ${opts.kind}, summary = coalesce(${opts.summary ?? null}, summary) where id = ${found[0].id}`;
    return found[0].id;
  }
  const id = uid();
  await sql`
    insert into projects (id, user_id, title, kind, summary)
    values (${id}, ${opts.userId}, ${opts.title}, ${opts.kind}, ${opts.summary ?? null})
  `;
  return id;
}

export async function addLibraryItem(opts: {
  id?: string;
  userId: string;
  projectId?: string | null;
  conversationId?: string | null;
  kind: string;
  title: string;
  mime?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  power?: string | null;
}) {
  const sql = await getSql();
  const id = opts.id ?? uid();
  await sql`
    insert into library_items (id, user_id, project_id, conversation_id, kind, title, mime, body, image_url, power)
    values (${id}, ${opts.userId}, ${opts.projectId ?? null}, ${opts.conversationId ?? null}, ${opts.kind}, ${opts.title}, ${opts.mime ?? null}, ${opts.body ?? null}, ${opts.imageUrl ?? null}, ${opts.power ?? null})
  `;
  return id;
}

export async function conversationProjectId(userId: string, conversationId: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ project_id: string | null }>`
    select project_id from conversations where id = ${conversationId} and user_id = ${userId} limit 1
  `;
  return rows[0]?.project_id ?? null;
}

export type StoredSite = {
  html: string;
  name: string;
  preview: string;
  shot: string;
  code: string;
  v0ChatId: string;
};

export async function latestSiteDraft(userId: string, conversationId: string): Promise<StoredSite | null> {
  const sql = await getSql();
  const rows = await sql<{ artifacts_json: string | null }>`
    select artifacts_json from messages
    where user_id = ${userId} and conversation_id = ${conversationId} and role = 'assistant'
    order by created_at desc
    limit 8
  `;
  for (const row of rows) {
    const site = storedSiteFrom(row.artifacts_json);
    if (site) return site;
  }
  return null;
}

export async function latestV0Chat(userId: string, conversationId: string): Promise<string | null> {
  const site = await latestSiteDraft(userId, conversationId);
  return site?.v0ChatId || null;
}

function storedSiteFrom(raw: string | null): StoredSite | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { artifacts?: { type?: string; payload?: Record<string, unknown> }[] };
    const list = Array.isArray(parsed) ? parsed : parsed.artifacts;
    if (!Array.isArray(list)) return null;
    for (const art of list) {
      if (art?.type !== "website_spec" || !art.payload) continue;
      const html = typeof art.payload.html === "string" ? art.payload.html : "";
      const chatId = typeof art.payload.v0ChatId === "string" ? art.payload.v0ChatId.trim() : "";
      if (!html && !chatId) continue;
      return {
        html,
        name: typeof art.payload.name === "string" ? art.payload.name : "Site profissional",
        preview: typeof art.payload.preview === "string" ? art.payload.preview : "",
        shot: typeof art.payload.shot === "string" ? art.payload.shot : "",
        code: typeof art.payload.code === "string" ? art.payload.code : "",
        v0ChatId: chatId,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function latestConversationImage(
  userId: string,
  conversationId: string,
): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ image_url: string | null; body: string | null }>`
    select image_url, body from library_items
    where user_id = ${userId} and conversation_id = ${conversationId} and kind = 'image'
    order by created_at desc
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  if (row.image_url) return row.image_url;
  if (row.body && (row.body.startsWith("data:image") || /^https?:\/\//i.test(row.body))) return row.body;
  if (row.body) {
    try {
      const parsed = JSON.parse(row.body) as { url?: unknown };
      if (typeof parsed.url === "string" && parsed.url) return parsed.url;
    } catch {
      /* corpo não é JSON */
    }
  }
  return null;
}

export async function videoFileAlreadyKept(userId: string, requestId: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) return false;
  const sql = await getSql();
  const rows = await sql<{ image_url: string | null }>`
    select image_url from library_items
    where user_id = ${userId} and kind = 'video' and body like ${"%" + requestId + "%"}
      and image_url like 'data:%'
    limit 1
  `;
  return Boolean(rows[0]);
}

export async function rememberVideoUrl(userId: string, requestId: string, url: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) return;
  const sql = await getSql();
  await sql`
    update library_items
    set image_url = ${url}
    where user_id = ${userId} and kind = 'video' and body like ${"%" + requestId + "%"}
      and (image_url is null or image_url not like 'data:%')
  `;
}
