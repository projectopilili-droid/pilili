import { createFileRoute } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { PLAN_CATALOG } from "@/lib/pilili/credits";
import { formatKz } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/planos")({ component: Planos });

const PAYMENT_MARKS = [
  { name: "MULTICAIXA Express", src: "/payments/multicaixa-express.jpg", tile: "bg-white" },
  { name: "UNITEL Money", src: "/payments/unitel-money.svg", tile: "bg-white" },
  { name: "KWiK", src: "/payments/kwik.jpg", tile: "bg-white" },
  { name: "Afrimoney", src: "/payments/afrimoney.png", tile: "bg-[#111111]" },
] as const;

const PLAN_CARD = {
  trial: {
    image: "/plans/ensaio.jpg",
    includes: "2 000 créditos de teste. Acesso limitado a todas as funções.",
  },
  bue: {
    image: "/plans/bue.jpg",
    includes: "150 créditos/mês. Texto, documentos, CV, pesquisa e imagens/vídeo limitado.",
  },
  pro: {
    image: "/plans/bue-fixe.jpg",
    includes: "800 créditos/mês. Tudo do Bué + mais imagens, vídeo e música (quando activa).",
  },
  pro_plus: {
    image: "/plans/bue-pro.jpg",
    includes: "2 000 créditos/mês. Tudo do Fixe + leitura de PDF/Word (quando activa).",
  },
  business: {
    image: "/plans/bue-bizno.jpg",
    includes: "15 000 créditos/mês. Tudo do Pro + espaço de equipa.",
  },
} as const;

function Planos() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Tu pedes. O PILILÍ executa.</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Planos</h1>
      <p className="mt-3 text-sm text-muted">
        O ensaio é gratuito e limitado. Os planos pagos passam a valer depois da confirmação do pagamento. A integração está a ser activada.
      </p>
      <ul className="mt-6 grid grid-cols-1 gap-3">
        {PLAN_CATALOG.map((p) => {
          const card = PLAN_CARD[p.id];
          return (
            <li
              key={p.id}
              className={
                p.recommended
                  ? "rounded-[2rem] bg-surface p-3 shadow-[var(--shadow-gold)]"
                  : "rounded-[2rem] bg-surface p-3 shadow-[var(--shadow-border)]"
              }
            >
              <img src={card.image} alt="" className="h-44 w-full rounded-[1.5rem] object-cover" />
              <div className="px-2 pb-1 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg leading-tight">{p.name}</h2>
                  {p.recommended ? (
                    <span className="shrink-0 rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-gold-fg">
                      Recomendo
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-mono text-base text-gold">
                  {p.priceKz === 0 ? "0 Kz" : formatKz(p.priceKz)}
                  {p.priceKz > 0 ? <span className="text-sm text-subtle">/{p.period}</span> : null}
                </p>
                <p className="mt-1 text-sm leading-snug text-muted">{card.includes}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <section className="mt-8">
        <h2 className="font-display text-lg text-fg">Pagamento</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {PAYMENT_MARKS.map((m) => (
            <li key={m.name} className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
              <div className={`flex h-28 items-center justify-center rounded-xl px-2 ${m.tile}`}>
                <img src={m.src} alt={m.name} className="max-h-24 w-full object-contain" />
              </div>
              <p className="mt-2 text-sm font-medium leading-tight">{m.name}</p>
              <p className="mt-1 text-xs text-subtle">A integração está a ser activada</p>
            </li>
          ))}
          <li className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
            <div className="flex h-28 items-center justify-center rounded-xl bg-elevated">
              <Landmark className="size-10 text-fg" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="mt-2 text-sm font-medium leading-tight">Transferência bancária</p>
            <p className="mt-1 text-xs text-subtle">A integração está a ser activada</p>
          </li>
        </ul>
        <p className="mt-4 text-sm text-muted">
          Pagamentos protegidos por processos de confirmação. O teu plano e os teus créditos só são actualizados após a confirmação da transacção.
        </p>
      </section>
      <Link to="/login">
        <Button className="mt-6 w-full">Começar o ensaio</Button>
      </Link>
    </main>
  );
}
