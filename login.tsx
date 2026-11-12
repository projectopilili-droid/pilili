import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { authReady } from "@/lib/auth/auth-ready";
import { FACEBOOK_PENDING, FACEBOOK_PROVIDER_ID } from "@/lib/auth/facebook";
import { facebookAuthReady } from "@/lib/auth/facebook-ready";
import { SignInGate } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/brand/mark";
import { consumeNextPath, peekNextPath } from "@/lib/client/pending";

export const Route = createFileRoute("/login")({ component: Login });

function goAfterAuth() {
  window.location.href = consumeNextPath();
}

function Login() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-sm flex-col justify-center px-5 py-10">
      <div className="rounded-3xl bg-surface px-5 py-8 shadow-[var(--shadow-gold)]">
      <Wordmark size="lg" />
      <p className="mt-3 text-muted">Entra para o PILILÍ tratar do resto contigo.</p>
      <SignInGate fallback={<LoginForm />}>
        <p className="mt-8 text-sm text-muted">Já estás dentro.</p>
        <button type="button" className="mt-4 text-left text-gold" onClick={goAfterAuth}>
          Continuar
        </button>
      </SignInGate>
      </div>
    </main>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = peekNextPath();

  async function onProvider(providerId: string) {
    setBusy(true);
    setErr(null);
    try {
      const ready = await authReady();
      if (!ready.database && import.meta.env.PROD) {
        setErr("Falta a base de dados na Vercel. Cria DATABASE_URL e volta a publicar.");
        return;
      }
      if (providerId === "grok-google") {
        setErr("O Google deste site não usa o login do Grok.");
        return;
      }
      if (!ready.broker && import.meta.env.PROD) {
        setErr("Esta entrada ainda não está ligada neste site.");
        return;
      }
      await signIn(providerId, { callbackURL: next || "/" });
    } catch (ex) {
      setErr(ex instanceof Error && ex.message ? ex.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setErr(null);
    try {
      const ready = await authReady();
      if (!ready.database && import.meta.env.PROD) {
        setErr("Falta a base de dados na Vercel. Cria DATABASE_URL e volta a publicar.");
        return;
      }
      if (!ready.googleDirect) {
        setErr("Define GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e BETTER_AUTH_URL na Vercel.");
        return;
      }
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: next || "/",
        errorCallbackURL: "/login",
      });
      if (result.error) throw new Error(result.error.message || "Não foi possível entrar com Google.");
      const target = result.data?.url ?? "";
      if (
        !target.startsWith("https://accounts.google.com/") ||
        !target.includes("redirect_uri=https%3A%2F%2Fpilili.app%2Fapi%2Fauth%2Fcallback%2Fgoogle") ||
        target.includes("auth.grok.me") ||
        target.includes("grok_preview")
      ) {
        throw new Error("A entrada Google não está a usar as credenciais do PILILÍ.");
      }
      window.location.href = target;
    } catch (ex) {
      setErr(ex instanceof Error && ex.message ? ex.message : "Não foi possível entrar com Google.");
    } finally {
      setBusy(false);
    }
  }

  async function onFacebook() {
    setBusy(true);
    setErr(null);
    try {
      const state = await facebookAuthReady();
      if (!state.ready) {
        setErr(FACEBOOK_PENDING);
        return;
      }
      await signIn(FACEBOOK_PROVIDER_ID, { callbackURL: next || "/" });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : FACEBOOK_PENDING);
    } finally {
      setBusy(false);
    }
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const ready = await authReady();
      if (!ready.database && import.meta.env.PROD) {
        setErr("Falta a base de dados na Vercel. Cria DATABASE_URL e volta a publicar.");
        return;
      }
      if (mode === "up") {
        const r = await authClient.signUp.email({ email, password, name: email.split("@")[0] ?? "PILILÍ" });
        if (r.error) throw new Error(r.error.message || "Não foi possível criar a conta.");
      } else {
        const r = await authClient.signIn.email({ email, password });
        if (r.error) throw new Error(r.error.message || "Não foi possível entrar.");
      }
      goAfterAuth();
    } catch (ex) {
      setErr(ex instanceof Error && ex.message ? ex.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-3">
      {authEnabled ? (
        <Button variant="line" className="w-full" disabled={busy} onClick={() => void onGoogle()}>
          Entrar com Google
        </Button>
      ) : null}
      {authEnabled ? (
        GROK_PROVIDERS.filter((p) => p.providerId !== "grok-google").map((p) => (
          <Button
            key={p.providerId}
            variant="line"
            className="w-full"
            disabled={busy}
            onClick={() => void onProvider(p.providerId)}
          >
            Continuar com {p.label}
          </Button>
        ))
      ) : (
        <p className="text-sm text-muted">A entrada está desligada neste ambiente.</p>
      )}
      {authEnabled ? (
        <Button variant="line" className="w-full" disabled={busy} onClick={() => void onFacebook()}>
          Entrar com Facebook
        </Button>
      ) : null}

      <div className="gold-rule my-5" />

      <form onSubmit={onEmail} className="space-y-3">
        <Input
          type="email"
          required
          autoComplete="email"
          placeholder="O teu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "up" ? "new-password" : "current-password"}
          placeholder="Palavra-passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {err ? <p className="text-sm text-danger">{err}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "in" ? "Entrar com email" : "Criar conta"}
        </Button>
      </form>
      <button
        type="button"
        className="min-h-11 w-full text-center text-sm text-muted hover:text-fg"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
      >
        {mode === "in" ? "Ainda não tens conta? Cria uma." : "Já tens conta? Entra."}
      </button>
      {next && next !== "/" ? (
        <p className="text-center text-xs text-subtle">Depois de entrares, continuamos o que pediste.</p>
      ) : null}
      <Link to="/" className="block min-h-11 text-center text-sm leading-[44px] text-subtle hover:text-muted">
        Voltar
      </Link>
    </div>
  );
}
