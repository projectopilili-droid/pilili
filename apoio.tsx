import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deliverMessage } from "@/lib/client/deliver-message";
import { saveFeedback } from "@/lib/server/functions";

export const Route = createFileRoute("/apoio")({ component: Apoio });

const WAYS = [
  { title: "Apoio individual", text: "Uma contribuição para continuar a construir a plataforma." },
  { title: "Patrocínio", text: "A tua empresa junto de um projecto feito em Angola." },
  { title: "Parcerias", text: "Uma colaboração para acelerar o desenvolvimento." },
  { title: "Investimento", text: "Uma conversa sobre o potencial do projecto." },
] as const;

function Apoio() {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<(typeof WAYS)[number]["title"] | "Primeiros 100">("Apoio individual");
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const message = body.trim();
    if (message.length < 4) {
      setNote("Escreve a mensagem antes de enviar.");
      return;
    }
    const text = [`Nome: ${name.trim() || "a indicar"}`, `Forma: ${kind}`, message].join("\n");
    setBusy(true);
    setNote("");
    deliverMessage("Apoio PILILÍ", text);
    try {
      const result = await saveFeedback({ data: { body: text, path: "/apoio" } });
      if (result.ok) {
        setBody("");
        setNote("Recebido. Obrigado.");
      } else {
        setNote(result.error);
      }
    } catch {
      setNote("Não foi possível guardar agora. A mensagem foi preparada para envio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-8 pt-6">
      <div className="overflow-hidden rounded-2xl">
        <img src="/apoio.jpg" alt="Duas pessoas a rever um plano juntas" className="aspect-[16/9] w-full object-cover" />
      </div>
      <p className="kicker mt-5">APOIAR PILILÍ</p>
      <h1 className="mt-2 font-display text-[1.7rem] font-semibold leading-tight">Ajudar a construir o PILILÍ.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        O PILILÍ nasceu em Angola para tornar a inteligência artificial mais útil para as pessoas e para os negócios.
      </p>
      <p className="mt-3 text-gold">Tu pedes. O PILILÍ executa.</p>

      <ul className="mt-6 space-y-3">
        <li className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
          <img src="/payments/multicaixa-express.jpg" alt="Multicaixa Express" className="h-16 w-20 shrink-0 rounded-xl bg-[#ff6a00] object-contain" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.12em] text-gold">Multicaixa Express</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-wide">923939244</p>
          </div>
        </li>
        <li className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
          <img src="/payments/banco.jpg" alt="Transferência bancária" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.12em] text-gold">Transferência bancária</p>
            <p className="mt-1 text-sm font-medium">Mauro Alexandre Cardoso Campos</p>
            <p className="mt-1 break-all text-sm text-muted">IBAN 0051 0000 2068 1742 1415 0</p>
          </div>
        </li>
      </ul>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Como podes apoiar</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {WAYS.map((item) => (
            <li key={item.title} className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
              <h3 className="font-display text-base font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Enviar uma mensagem</h2>
        <p className="mt-2 text-sm text-muted">Inclui os Primeiros 100. A transferência não muda o plano sozinha.</p>
        <label className="mt-4 block text-sm">
          Nome
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="mt-1 w-full rounded-2xl bg-surface px-4 py-3 text-sm outline-none"
          />
        </label>
        <label className="mt-3 block text-sm">
          Forma
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="mt-1 w-full rounded-2xl bg-surface px-4 py-3 text-sm outline-none"
          >
            {WAYS.map((item) => (
              <option key={item.title}>{item.title}</option>
            ))}
            <option>Primeiros 100</option>
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Mensagem
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={1600}
            placeholder="Como queres apoiar?"
            className="mt-1 w-full rounded-2xl bg-surface px-4 py-3 text-sm outline-none placeholder:text-subtle"
          />
        </label>
        <Button className="mt-4 w-full" type="button" disabled={busy} onClick={() => void send()}>
          {busy ? "A enviar…" : "Enviar"}
        </Button>
        {note ? (
          <p role="status" className="mt-3 text-sm text-subtle">
            {note}
          </p>
        ) : null}
      </section>
    </main>
  );
}
