/**
 * Single-statement credit moves. Postgres holds the profile row lock until the
 * statement finishes, so two requests cannot both pass `credits >= amount`.
 * The ledger row is inserted first; the balance moves only if that insert
 * happened. A crash cannot debit without a movement, and the unique
 * (user_id, idempotency_key) keeps retries idempotent.
 */

export const DEBIT_SQL = `
WITH locked AS (
  SELECT user_id, credits
  FROM profiles
  WHERE user_id = $1
  FOR UPDATE
),
ins AS (
  INSERT INTO credit_ledger (id, user_id, amount, reason, idempotency_key, meta)
  SELECT $4, $1, (-$3::int), $5, $2, $6
  FROM locked
  WHERE credits >= $3::int
    AND NOT EXISTS (
      SELECT 1 FROM credit_ledger
      WHERE user_id = $1 AND idempotency_key = $2
    )
  ON CONFLICT (user_id, idempotency_key) DO NOTHING
  RETURNING id
),
upd AS (
  UPDATE profiles
  SET credits = credits - $3::int, updated_at = now()
  WHERE user_id = $1
    AND EXISTS (SELECT 1 FROM ins)
  RETURNING credits
)
SELECT
  (SELECT credits FROM upd) AS remaining,
  (SELECT id FROM ins) AS inserted
`;

export const REFUND_SQL = `
WITH ins AS (
  INSERT INTO credit_ledger (id, user_id, amount, reason, idempotency_key)
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (user_id, idempotency_key) DO NOTHING
  RETURNING id
),
upd AS (
  UPDATE profiles
  SET credits = credits + $3, updated_at = now()
  WHERE user_id = $2
    AND EXISTS (SELECT 1 FROM ins)
  RETURNING credits
)
SELECT
  (SELECT credits FROM upd) AS remaining,
  (SELECT id FROM ins) AS inserted
`;
