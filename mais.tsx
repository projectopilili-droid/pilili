import { createFileRoute, Link } from "@tanstack/react-router";
import { useBootstrap } from "@/lib/client/bootstrap";
import { deleteMemoryFact, updatePrefs } from "@/lib/server/functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { PLAN_CATALOG } from "@/lib/pilili/credits";
import { usePilili } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { replayOpening } from "@/components/home/Opening";

export const Route = createFileRoute("/mais")({ component: Mais });

function Mais() {
  const { user } = useCurrentUserState();
  const boot = useBootstrap();
  const lowData = usePilili((s) => s.lowData);
  const setLowData = usePilili((s) => s.setLowData);
  const openingMotion = usePilili((s) => s.openingMotion);
  const setOpeningMotion = usePilili((s) => s.setOpeningMotion);
  const profile = boot.data?.profile;
  const plan = PLAN_CATALOG.find((p) => p.id === (profile?.plan ?? "trial"));

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Mais</h1>
      {user && !user.isDevFallback && user.primaryEmail ? (
        <p className="mt-1 text-sm text-muted">{user.primaryEmail}</p>
      ) : null}
      <p className="mt-2 text-sm text-muted">Conta, plano, preferências e o que o PILILÍ já faz.</p>

      <section className="mt-8 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="kicker">Plano</p>
        <p className="mt-1 font-display text-2xl">{plan?.name ?? "Ensaio Grátis"}</p>
        <p className="text-sm text-muted">{profile ? `${profile.credits} créditos` : "Entra para ver os créditos."}</p>
        <Link to="/planos" className="mt-3 inline-block text-sm text-gold">
          Ver planos em Kwanzas
        </Link>
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Modo dados baixos</p>
            <p className="text-sm text-muted">Sem vídeo no início. Imagens mais leves. Melhor para rede instável.</p>
          </div>
          <button
            type="button"
            className={`h-7 w-12 rounded-full ${lowData ? "bg-gold" : "bg-elevated"}`}
            onClick={async () => {
              const next = !lowData;
              setLowData(next);
              if (user) await updatePrefs({ data: { lowData: next } });
            }}
            aria-pressed={lowData}
            aria-label="Modo dados baixos"
          >
            <span className={`block size-6 translate-y-0.5 rounded-full bg-fg transition-transform ${lowData ? "translate-x-5" : "translate-x-1"}`} />
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Abertura animada</p>
            <p className="text-sm text-muted">
              O logótipo passa quando abres a aplicação. Não volta quando mudas de página.
            </p>
          </div>
          <button
            type="button"
            className={`h-7 w-12 rounded-full ${openingMotion ? "bg-gold" : "bg-elevated"}`}
            onClick={() => setOpeningMotion(!openingMotion)}
            aria-pressed={openingMotion}
            aria-label="Abertura animada"
          >
            <span
              className={`block size-6 translate-y-0.5 rounded-full bg-fg transition-transform ${openingMotion ? "translate-x-5" : "translate-x-1"}`}
            />
          </button>
        </div>
        <Button variant="line" className="mt-3" onClick={() => replayOpening()} disabled={lowData}>
          Ver o vídeo de abertura
        </Button>
        {lowData ? <p className="mt-2 text-xs text-subtle">Desliga o modo dados baixos para ver o vídeo.</p> : null}
        {!openingMotion && !lowData ? (
          <p className="mt-2 text-xs text-subtle">A abertura automática está desligada. Podes ver o vídeo na mesma.</p>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg">Memória</h2>
        <p className="mt-1 text-sm text-muted">O PILILÍ lembra o útil. Podes apagar.</p>
        <ul className="mt-3 space-y-2">
          {(boot.data?.memory ?? []).map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
              <span>
                <span className="block text-xs text-gold">{m.key}</span>
                <span className="text-sm text-muted">{m.value}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!window.confirm("Apagar este facto da memória?")) return;
                  await deleteMemoryFact({ data: m.id });
                  await boot.refetch();
                }}
              >
                Apagar
              </Button>
            </li>
          ))}
          {(boot.data?.memory ?? []).length === 0 ? (
            <p className="text-sm text-subtle">Ainda não há factos guardados.</p>
          ) : null}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg">O que podes fazer agora</h2>
        <p className="mt-2 text-sm text-muted">
          Escreves o resultado que queres. O PILILÍ organiza o trabalho. Não escolhes o modelo.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          <li>Texto, pesquisa, imagem, vídeo e voz.</li>
          <li>Análise de imagens e documentos estruturados.</li>
          <li>Música, leitura de PDF e Word, e pagamentos: a integração está a ser activada.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg">Dar feedback</h2>
        <p className="mt-2 text-sm text-muted">Conta o que funcionou nesta fase de testes. Não há email nesta página.</p>
        <Link to="/feedback" className="mt-3 inline-flex min-h-11 items-center text-sm text-gold">
          Abrir o formulário
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg">APOIAR PILILÍ</h2>
        <p className="mt-2 text-sm text-muted">Missão, formas de apoiar e os Primeiros 100.</p>
        <Link to="/apoio" className="mt-3 inline-flex min-h-11 items-center text-sm text-gold">
          Abrir APOIAR PILILÍ
        </Link>
      </section>

      <section className="mt-10 pb-8">
        <h2 className="font-display text-lg">PALOP, a seguir</h2>
        <p className="mt-2 text-sm text-muted">
          Angola primeiro. Depois Moçambique, Cabo Verde, Guiné-Bissau, São Tomé e Príncipe, e a diáspora. A língua e as instituições mudam com o país. O motor não se copia.
        </p>
        <p className="mt-4 text-sm text-gold">Feito com PILILÍ.</p>
      </section>
    </main>
  );
}
