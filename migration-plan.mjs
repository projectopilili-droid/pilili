// @ts-check
/**
 * Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
 * (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
 *
 * Applied files are keyed by BASENAME, so the same file applies once no matter
 * which directory it is globbed from. That is what makes the auth schema safe to
 * copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
 * a database that already has `0001_auth.sql` will not re-run it.
 *
 * Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
 * out of scope for both until it is copied up.
 */

/**
 * The `_migrations` key for a migration path (or bare filename).
 * @param {string} path
 * @returns {string}
 */
export function migrationName(path) {
  return path.split("/").pop() ?? path;
}

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isMigrationFile(path) {
  return path.endsWith(".sql");
}

/**
 * Migrations in `paths` that are not yet in `applied`, in apply order.
 * Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
 * @param {Iterable<string>} paths
 * @param {Iterable<string>} applied
 * @returns {Array<{ name: string, path: string }>}
 */
export function pendingMigrations(paths, applied) {
  const done = new Set(applied);
  return [...paths]
    .filter(isMigrationFile)
    .map((path) => ({ name: migrationName(path), path }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(({ name }) => !done.has(name));
}

/**
 * Direct database URL for migrations. Neon pooler URLs reject a whole SQL
 * file in one query, so prefer the unpooled URL and otherwise drop `-pooler`.
 * Blank values mean "no database", matching src/lib/db.ts.
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
export function migrationDatabaseUrl(env) {
  const unpooled = `${env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || ""}`.trim();
  const raw = unpooled || `${env.DATABASE_URL || env.POSTGRES_URL || ""}`.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    // Neon pooler (pgbouncer) rejects a multi-statement query. Prefer the
    // direct host the integrator provides; otherwise drop the `-pooler` label.
    if (!unpooled) url.hostname = url.hostname.replace("-pooler", "");
    // node-postgres does not implement channel binding. Neon adds
    // channel_binding=require and the handshake then fails the Vercel build.
    url.searchParams.delete("channel_binding");
    if (url.hostname.endsWith("neon.tech") && !url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    // pg-connection-string treats sslmode=require as verify-full unless this
    // flag is set, so Neon's certificate fails and `npm run build` exits 1.
    const mode = url.searchParams.get("sslmode");
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      url.searchParams.set("uselibpqcompat", "true");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * Runtime Postgres URL. Keeps the pooler and only fixes SSL options that make
 * `pg` reject Neon (`sslmode=require` treated as verify-full, channel binding).
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
export function runtimeDatabaseUrl(env) {
  const raw = `${env.DATABASE_URL || env.POSTGRES_URL || ""}`.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");
    if (url.hostname.endsWith("neon.tech") && !url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    const mode = url.searchParams.get("sslmode");
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      url.searchParams.set("uselibpqcompat", "true");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * Split a migration file into statements. Quoted semicolons stay put.
 * @param {string} text
 * @returns {string[]}
 */
export function splitSql(text) {
  const statements = [];
  let current = "";
  let quote = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === quote) {
        if (text[i + 1] === quote) {
          current += text[i + 1];
          i += 1;
        } else {
          quote = "";
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "-" && text[i + 1] === "-") {
      const end = text.indexOf("\n", i);
      i = end === -1 ? text.length : end;
      continue;
    }
    if (ch === ";") {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      continue;
    }
    current += ch;
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}
