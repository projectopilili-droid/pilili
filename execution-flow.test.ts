import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { DEBIT_SQL, REFUND_SQL } from "../pilili/credit-ops.ts";
import { ExecutionTimeoutError, startDeadline } from "../server/deadline.ts";
import { errorFromAbort } from "../server/deadline.ts";
import { CLOSED_STREAM_MESSAGE, hasTerminal, READ_STREAM_MESSAGE } from "./stream-end.ts";
import { applyBootstrapWallet, applyCreditEvent } from "./wallet.ts";
import { appendUserMessage, commitAssistant, mergeConversation } from "./messages.ts";
import { SendLock } from "./send-lock.ts";
import { dedupeTextAgainstArtifacts, formatAnswerText, visibleStreamText } from "../pilili/format-answer.ts";
import { textDeltaFromStreamEvent } from "../pilili/stream-delta.ts";

describe("execution deadline", () => {
  it("aborts with a timeout error and can be cancelled before that", async () => {
    const pending = startDeadline(30);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(pending.timedOut(), true);
    assert.equal(pending.signal.aborted, true);
    assert.ok(errorFromAbort(pending.signal, new Error("aborted")) instanceof ExecutionTimeoutError);
    pending.cancel();

    const stopped = startDeadline(5_000);
    stopped.cancel();
    assert.equal(stopped.timedOut(), false);
    assert.equal(stopped.signal.aborted, false);
  });
});

describe("closed stream", () => {
  it("treats a close without done or error as a recoverable failure", () => {
    assert.equal(hasTerminal([{ type: "status" }, { type: "delta" }]), false);
    assert.equal(hasTerminal([{ type: "status" }, { type: "error" }]), true);
    assert.equal(hasTerminal([{ type: "done" }]), true);
    assert.match(CLOSED_STREAM_MESSAGE, /tentar outra vez/);
    assert.match(READ_STREAM_MESSAGE, /tentar outra vez/);
  });
});

describe("wallet sync", () => {
  it("applies a credit event before bootstrap and ignores the older snapshot", () => {
    const start = { credits: 36, plan: "trial" as const, creditsSeq: 0 };
    const live = applyCreditEvent(start, 32);
    assert.equal(live.credits, 32);
    assert.equal(live.creditsSeq, 1);
    const stale = applyBootstrapWallet(live, { credits: 36, plan: "trial" }, 0);
    assert.equal(stale.credits, 32);
    const fresh = applyBootstrapWallet(live, { credits: 32, plan: "trial" }, 1);
    assert.equal(fresh.credits, 32);
  });
});

describe("duplicate sends", () => {
  it("rejects a second begin until the lock is released", () => {
    const lock = new SendLock();
    assert.equal(lock.begin(), true);
    assert.equal(lock.begin(), false);
    lock.end();
    assert.equal(lock.begin(), true);
    lock.end();
  });

  it("drops the local copy when the server already has the same user text", () => {
    const local = [{ id: "local-1", role: "user", content: "Organiza as compras" }];
    const server = [{ id: "srv-1", role: "user", content: "Organiza as compras" }];
    const merged = mergeConversation(local, server);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.id, "srv-1");
  });

  it("keeps two real server copies of the same text", () => {
    const server = [
      { id: "a", role: "user", content: "Ola" },
      { id: "b", role: "user", content: "Ola" },
    ];
    assert.equal(mergeConversation([], server).length, 2);
  });
});

describe("one submission, one answer", () => {
  const ask = "Cria uma lista de cinco tarefas para organizar o meu dia, por ordem de prioridade.";
  const raw = [
    "O teu dia, por prioridade:",
    "",
    "```html",
    "<ol><li>Definir a prioridade do dia</li><li>Tratar do mais urgente</li><li>Reservar tempo para a casa</li><li>Fechar o que ficou pendente</li><li>Preparar o dia seguinte</li></ol>",
    "```",
    '<pilili_artifact type="checklist" title="Dia">',
    JSON.stringify({
      title: "Dia",
      items: [
        { text: "Definir a prioridade do dia", done: false },
        { text: "Tratar do mais urgente", done: false },
        { text: "Reservar tempo para a casa", done: false },
        { text: "Fechar o que ficou pendente", done: false },
        { text: "Preparar o dia seguinte", done: false },
      ],
    }),
    "</pilili_artifact>",
  ].join("\n");

  it("does not keep a second user row when the saved history arrives", () => {
    const local = appendUserMessage([], { id: "local-user", role: "user", content: ask });
    const synced = mergeConversation(local, [{ id: "srv-user", role: "user", content: ask }]);
    const again = appendUserMessage(synced, { id: "local-user-2", role: "user", content: ask });
    assert.equal(again.length, 1);
    assert.equal(again[0]?.id, "srv-user");
  });

  it("shows one answer, without fence markers, and keeps the checklist", () => {
    const checklist = {
      type: "checklist",
      payload: {
        items: [
          { text: "Definir a prioridade do dia" },
          { text: "Tratar do mais urgente" },
          { text: "Reservar tempo para a casa" },
          { text: "Fechar o que ficou pendente" },
          { text: "Preparar o dia seguinte" },
        ],
      },
    };
    const prose = raw.split('<pilili_artifact')[0] ?? "";
    const text = dedupeTextAgainstArtifacts(formatAnswerText(prose), [checklist]);
    assert.equal(text.includes("```"), false);
    assert.equal(text.includes("<ol>"), false);
    assert.match(text, /prioridade/);
    assert.equal(/\d+\.\s/.test(text), false);
    assert.equal(checklist.type, "checklist");

    const shown = dedupeTextAgainstArtifacts(formatAnswerText("```html\n<ol><li>Um</li></ol>\n```"), []);
    assert.equal(shown.includes("```"), false);
    assert.match(shown, /1\. Um/);
    const site =
      "A página está pronta.\n```html\n<!DOCTYPE html><html><head><style>body{margin:0}</style></head><body><h1>Loja</h1></body></html>\n```";
    const clean = formatAnswerText(site);
    assert.equal(clean.includes("<html"), false);
    assert.equal(clean.includes("margin"), false);
    assert.match(clean, /A página está pronta/);
    assert.equal(visibleStreamText("A página está pronta.\n<!DOCTYPE html><html><body>"), "A página está pronta.");

    let messages = appendUserMessage([], { id: "u", role: "user", content: ask });
    messages = commitAssistant(messages, { id: "a1", role: "assistant", content: text });
    messages = commitAssistant(messages, { id: "a2", role: "assistant", content: text });
    messages = mergeConversation(messages, [
      { id: "srv-user", role: "user", content: ask },
      { id: "srv-a", role: "assistant", content: text },
    ]);
    assert.equal(messages.filter((m) => m.role === "user").length, 1);
    assert.equal(messages.filter((m) => m.role === "assistant").length, 1);
    assert.equal(messages.some((m) => m.content.includes("```")), false);
  });
});

describe("progressive answer", () => {
  it("shows prose as it arrives and hides the control blocks", () => {
    const parts = [
      "<pilili_meta>\n{\"power\":\"vida\"}\n</pilili_meta>\n",
      "Organizei",
      " o sábado.",
      "\n<pilili_artifact type=\"checklist\">{\"title\":\"Dia\"}",
    ];
    let acc = "";
    const seen: string[] = [];
    for (const part of parts) {
      acc += part;
      seen.push(visibleStreamText(acc));
    }
    assert.equal(seen[0], "");
    assert.equal(seen[1], "Organizei");
    assert.equal(seen[2], "Organizei o sábado.");
    assert.equal(seen[3], "Organizei o sábado.");
    assert.equal(formatAnswerText("Plano \u2014 sábado"), "Plano - sábado");
    assert.equal(formatAnswerText("Lista \u2013 clara \u2022 sem \u2b50 símbolos"), "Lista - clara - sem símbolos");
    assert.equal(formatAnswerText('Palavra *importante* e "welcome".'), "Palavra importante e welcome.");
    const growing =
      "Organizei o sábado.\n" +
      '<pilili_artifact type="checklist" title="Sábado">{"items":[{"text":"Preparar o almoço","done":false}';
    assert.match(visibleStreamText(growing), /Preparar o almoço/);
    assert.equal(textDeltaFromStreamEvent({ type: "response.output_text.delta", delta: "Organizei" }), "Organizei");
    assert.equal(textDeltaFromStreamEvent({ type: "response.reasoning_text.delta", delta: "pensar" }), "");
    assert.equal(textDeltaFromStreamEvent({ choices: [{ delta: { content: " o sábado" } }] }), " o sábado");
  });
});

describe("timeout refund", () => {
  it("refunds a timed-out debit only once", async () => {
    const db = new PGlite();
    await db.exec(`
      create table profiles (user_id text primary key, credits integer not null, updated_at timestamptz not null default now());
      create table credit_ledger (
        id text primary key,
        user_id text not null,
        amount integer not null,
        reason text not null,
        idempotency_key text not null,
        meta text,
        unique (user_id, idempotency_key)
      );
    `);
    await db.query("insert into profiles (user_id, credits) values ('u1', 36)");
    await db.query(DEBIT_SQL, ["u1", "run-1", 4, "d1", "complex_reasoning", null]);
    await db.query(REFUND_SQL, ["r1", "u1", 4, "refund_failed_run", "refund:run-1"]);
    await db.query(REFUND_SQL, ["r2", "u1", 4, "refund_failed_run", "refund:run-1"]);
    const bal = await db.query<{ credits: number }>("select credits from profiles where user_id = 'u1'");
    const rows = await db.query<{ n: string }>(
      "select count(*)::text as n from credit_ledger where idempotency_key = 'refund:run-1'",
    );
    assert.equal(Number(bal.rows[0]?.credits), 36);
    assert.equal(rows.rows[0]?.n, "1");
  });
});
