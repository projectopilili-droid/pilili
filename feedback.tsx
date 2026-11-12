import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { deliverMessage } from "@/lib/client/deliver-message";
import { saveFeedback } from "@/lib/server/functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/feedback")({ component: Feedback });

function Feedback() {
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = body.trim();
    if (text.length < 4) {
      setNote("Escreve o que correu bem ou o que falhou.");
      return;
    }
    setBusy(true);
    setNote("");
    deliverMessage("Feedback PILILÍ", text);
    try {
      const result = await saveFeedback({ data: { body: text, path: window.location.pathname } });
      if (result.ok) {
        setBody("");
        setNote("Recebido. Obrigado. Isto não muda o teu plano nem os teus créditos.");
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
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link to="/" className="inline-flex min-h-11 items-center text-sm text-muted">
        Voltar
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold">Dar feedback</h1>
      <p className="mt-2 text-sm text-muted">Estamos em testes. Conta o que funcionou, o que falhou ou o que faltou.</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        maxLength={2000}
        placeholder="O que aconteceu?"
        className="mt-5 w-full rounded-2xl bg-surface px-4 py-3 text-sm outline-none placeholder:text-subtle"
      />
      <Button className="mt-4 w-full" type="button" disabled={busy} onClick={() => void send()}>
        {busy ? "A enviar…" : "Enviar feedback"}
      </Button>
      {note ? <p className="mt-3 text-sm text-subtle">{note}</p> : null}
    </main>
  );
}
