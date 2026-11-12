import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { DEBIT_SQL, REFUND_SQL } from "./credit-ops.ts";

const SCHEMA = `
create table profiles (
  user_id text primary key,
  credits integer not null default 40,
  updated_at timestamptz not null default now()
);
create table credit_ledger (
  id text primary key,
  user_id text not null,
  amount integer not null,
  reason text not null,
  idempotency_key text not null,
  meta text,
  unique (user_id, idempotency_key)
);
`;

async function fresh() {
  const db = new PGlite();
  await db.exec(SCHEMA);
  await db.query("insert into profiles (user_id, credits) values ('u1', 40)");
  return db;
}

async function balance(db: PGlite) {
  const r = await db.query<{ credits: number }>("select credits from profiles where user_id = 'u1'");
  return Number(r.rows[0]?.credits);
}

async function debit(db: PGlite, key: string, amount: number, id: string) {
  const r = await db.query<{ remaining: number | null; inserted: string | null }>(DEBIT_SQL, [
    "u1",
    key,
    amount,
    id,
    "test",
    null,
  ]);
  return r.rows[0];
}

describe("atomic credits", () => {
  it("does not let two spends pass the same balance", async () => {
    const db = await fresh();
    const [a, b] = await Promise.all([
      debit(db, "a", 30, "id-a"),
      debit(db, "b", 30, "id-b"),
    ]);
    const inserted = [a, b].filter((row) => row?.inserted).length;
    assert.equal(inserted, 1);
    assert.equal(await balance(db), 10);
  });

  it("debits once for the same idempotency key", async () => {
    const db = await fresh();
    const first = await debit(db, "same", 15, "id-1");
    const second = await debit(db, "same", 15, "id-2");
    assert.ok(first?.inserted);
    assert.equal(second?.inserted ?? null, null);
    assert.equal(await balance(db), 25);
  });

  it("refuses a spend above the balance", async () => {
    const db = await fresh();
    const row = await debit(db, "too-much", 50, "id-x");
    assert.equal(row?.inserted ?? null, null);
    assert.equal(await balance(db), 40);
  });

  it("refunds once", async () => {
    const db = await fresh();
    await debit(db, "job", 10, "id-job");
    const once = await db.query<{ inserted: string | null }>(REFUND_SQL, [
      "refund-1",
      "u1",
      10,
      "refund_test",
      "refund:job",
    ]);
    const twice = await db.query<{ inserted: string | null }>(REFUND_SQL, [
      "refund-2",
      "u1",
      10,
      "refund_test",
      "refund:job",
    ]);
    assert.ok(once.rows[0]?.inserted);
    assert.equal(twice.rows[0]?.inserted ?? null, null);
    assert.equal(await balance(db), 40);
  });
});
