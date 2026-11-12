import type { ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, FolderKanban, Library, MoreHorizontal, Sparkles } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BrandLogo } from "@/components/brand/mark";
import { OpeningSplash } from "@/components/home/Opening";
import { cn } from "@/lib/utils";
import { usePilili } from "@/lib/store";

const NAV = [
  { to: "/biblioteca", label: "Biblioteca", icon: Library, center: false },
  { to: "/poderes", label: "Super Poderes", icon: Sparkles, center: false },
  { to: "/", label: "PILILÍ", icon: null, center: true },
  { to: "/projectos", label: "Projectos", icon: FolderKanban, center: false },
  { to: "/mais", label: "Mais", icon: MoreHorizontal, center: false },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const { isPending } = useCurrentUserState();
  const credits = usePilili((s) => s.credits);
  const isHome = pathname === "/";

  function goBack() {
    if (window.history.length > 1) router.history.back();
    else void router.navigate({ to: "/" });
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <OpeningSplash />
      <header
        className={cn(
          "z-30 flex items-center gap-3 px-4 py-3 print:hidden",
          isHome
            ? "absolute inset-x-0 top-0 justify-end bg-transparent"
            : "sticky top-0 justify-between border-b border-line bg-surface/80 backdrop-blur-md",
        )}
      >
        {isHome ? null : (
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex min-h-11 items-center gap-1 pr-1 text-sm text-gold"
            >
              <ArrowLeft className="size-4" />
              Voltar
            </button>
            <Link to="/" className="flex min-h-11 items-center">
              <BrandLogo size="sm" />
            </Link>
          </div>
        )}
        <div className="flex items-center gap-3">
          <SignedIn>
            <span className="rounded-full bg-gold-soft px-2.5 py-1 font-mono text-xs tabular-nums text-gold-bright">
              {credits == null ? "…" : `${credits} cr`}
            </span>
          </SignedIn>
          {isPending ? (
            <div className="size-8 animate-pulse rounded-full bg-elevated" />
          ) : (
            <>
              <SignedIn>
                <div className="max-w-[42vw] overflow-hidden sm:max-w-none [&_span.text-sm.font-medium]:hidden sm:[&_span.text-sm.font-medium]:inline">
                  <UserButton />
                </div>
              </SignedIn>
              <SignedOut>
                <Link
                  to="/login"
                  className="h-9 rounded-full bg-surface px-3 text-sm leading-9 text-gold shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
                >
                  Entrar
                </Link>
              </SignedOut>
            </>
          )}
        </div>
      </header>

      <div className="border-b border-line bg-surface/80 px-4 py-2 text-center text-xs leading-relaxed text-subtle print:hidden">
        Fase de testes.
      </div>

      <div className="pb-24 print:pb-0">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/75 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg print:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 py-1">
          {NAV.map((item) => {
            const active =
              item.to === "/"
                ? pathname === "/" || pathname.startsWith("/c/")
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors duration-150",
                    active ? "text-gold" : "text-subtle hover:text-muted",
                  )}
                >
                  {item.center ? (
                    <span
                      className={cn(
                        "grid size-14 -translate-y-3 place-items-center rounded-full bg-gold text-gold-fg shadow-[var(--shadow-nav)] transition-opacity duration-150",
                        !active && "opacity-90",
                      )}
                    >
                      <span className="font-display text-xl font-bold leading-none">P</span>
                    </span>
                  ) : Icon ? (
                    <span className="grid size-9 place-items-center">
                      <Icon className="size-4" />
                    </span>
                  ) : null}
                  <span className={cn(item.center && "-mt-2 font-medium", active ? "text-gold" : "")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
