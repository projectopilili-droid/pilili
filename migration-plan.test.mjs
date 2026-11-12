import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { isMigrationFile, migrationDatabaseUrl, migrationName, pendingMigrations, runtimeDatabaseUrl, splitSql } from "./migration-plan.mjs";
import { projectRoot } from "./with-app-env.mjs";

const AUTH_MIGRATION = "0001_auth.sql";

/**
 * The auth-on copy of the Better Auth schema and its source, or null when the
 * app has not turned sign-in on (the shipped state).
 */
function authSchemaCopy(root) {
  const copy = join(root, "migrations", AUTH_MIGRATION);
  const source = join(root, "migrations/auth", AUTH_MIGRATION);
  if (!existsSync(copy) || !existsSync(source)) return null;
  return { copy: readFileSync(copy, "utf8"), source: readFileSync(source, "utf8") };
}

test("_migrations keys on basename, not path", () => {
  assert.equal(migrationName("/migrations/0002_todos.sql"), "0002_todos.sql");
  assert.equal(migrationName("migrations/auth/0001_auth.sql"), "0001_auth.sql");
  assert.equal(migrationName("0001_auth.sql"), "0001_auth.sql");
});

test("a file already applied from another directory does not re-apply", () => {
  // The auth-on path copies migrations/auth/0001_auth.sql into the globbed
  // directory; a database that already has it must not run it twice.
  assert.deepEqual(pendingMigrations(["/migrations/0001_auth.sql"], ["0001_auth.sql"]), []);
});

test("pending migrations are returned in name order", () => {
  assert.deepEqual(
    pendingMigrations(
      ["/migrations/0003_c.sql", "/migrations/0001_a.sql", "/migrations/0002_b.sql"],
      ["0001_a.sql"],
    ),
    [
      { name: "0002_b.sql", path: "/migrations/0002_b.sql" },
      { name: "0003_c.sql", path: "/migrations/0003_c.sql" },
    ],
  );
});

test("non-.sql entries are dropped (readdir also yields the auth/ directory)", () => {
  assert.equal(isMigrationFile("auth"), false);
  assert.deepEqual(pendingMigrations(["auth", "README.md"], []), []);
});

test("globbed migrations are the app schema and the auth source stays beside them", () => {
  const migrationsDir = join(projectRoot(), "migrations");
  assert.deepEqual(
    pendingMigrations(readdirSync(migrationsDir), []).map((item) => item.name),
    [
      "0001_auth.sql",
      "0002_pilili.sql",
      "0003_library_power.sql",
      "0004_feedback.sql",
      "0005_spotify.sql",
    ],
  );
  assert.ok(readdirSync(join(migrationsDir, "auth")).includes("0001_auth.sql"));
});

test("this workspace's auth schema copy is byte-identical to its source", () => {
  // An edited copy diverges silently: basename keying skips it on a database
  // that already ran the original, and applies it on a fresh PGLite preview.
  const pair = authSchemaCopy(projectRoot());
  if (pair === null) return; // sign-in off — nothing has been copied up
  assert.equal(
    pair.copy,
    pair.source,
    "migrations/0001_auth.sql has been edited — it must stay a verbatim copy of migrations/auth/0001_auth.sql",
  );
});

test("the copy check reads both files and catches an edit", () => {
  const root = mkdtempSync(join(tmpdir(), "auth-schema-"));
  mkdirSync(join(root, "migrations/auth"), { recursive: true });
  writeFileSync(join(root, "migrations/auth", AUTH_MIGRATION), "create table t ();\n");
  assert.equal(authSchemaCopy(root), null);

  writeFileSync(join(root, "migrations", AUTH_MIGRATION), "create table t ();\n");
  const same = authSchemaCopy(root);
  assert.equal(same.copy, same.source);

  writeFileSync(join(root, "migrations", AUTH_MIGRATION), "create table t (x int);\n");
  const drifted = authSchemaCopy(root);
  assert.notEqual(drifted.copy, drifted.source);
});

test("migration URL prefers a direct connection and ignores a blank value", () => {
  assert.equal(migrationDatabaseUrl({ DATABASE_URL: "  " }), "");
  assert.equal(
    migrationDatabaseUrl({
      DATABASE_URL_UNPOOLED: " postgres://direct/db ",
      DATABASE_URL: "postgres://u:p@ep-a-pooler.eu-central-1.aws.neon.tech/db",
    }),
    "postgres://direct/db",
  );
  const pooled = migrationDatabaseUrl({
    DATABASE_URL:
      "postgres://u:p@ep-a-pooler.eu-central-1.aws.neon.tech/db?sslmode=require&channel_binding=require",
  });
  assert.equal(pooled.includes("-pooler"), false);
  assert.equal(pooled.includes("channel_binding"), false);
  assert.match(pooled, /sslmode=require/);
  assert.match(pooled, /uselibpqcompat=true/);
});

test("runtime URL keeps the pooler and relaxes Neon SSL", () => {
  const runtime = runtimeDatabaseUrl({
    DATABASE_URL:
      "postgres://u:p@ep-a-pooler.eu-central-1.aws.neon.tech/db?sslmode=require&channel_binding=require",
  });
  assert.match(runtime, /-pooler/);
  assert.equal(runtime.includes("channel_binding"), false);
  assert.match(runtime, /uselibpqcompat=true/);
  assert.equal(runtimeDatabaseUrl({ DATABASE_URL: "  " }), "");
});

test("SQL files split per statement and keep semicolons inside quotes", () => {
  assert.deepEqual(splitSql("-- note\ncreate table t (name text);\ninsert into t values ('a;b');\n"), [
    "create table t (name text)",
    "insert into t values ('a;b')",
  ]);
});
