import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { prepareMusic } from "@/lib/server/functions";

const CARDS = [
  { id: "imagem", title: "Imagem", detail: "Cria imagens a partir das tuas ideias.", image: "/powers/estudio.jpg" },
  { id: "video", title: "Vídeo curto", detail: "Produz vídeos para redes sociais e campanhas.", image: "/powers/estudio-film.jpg" },
  { id: "voz", title: "Áudio & Voz", detail: "Transcreve, compila, resume e cria vídeo a partir de áudios.", image: "/powers/voice.jpg" },
  { id: "musica", title: "Música", detail: "Cria música a partir do teu conceito.", image: "/powers/dj-deck.jpg" },
] as const;

export function StudioCards() {
  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((card) => (
          <Link
            key={card.id}
            to="/poderes/estudio/$tarefa"
            params={{ tarefa: card.id }}
            className="overflow-hidden rounded-2xl bg-surface text-left shadow-[var(--shadow-border)]"
          >
            <img src={card.image} alt="" className="h-auto w-full" />
            <span className="block px-3 pt-2 text-sm font-medium">{card.title}</span>
            <span className="block px-3 pb-3 pt-1 text-xs leading-snug text-muted">{card.detail}</span>
          </Link>
        ))}
      </div>
      <Link to="/poderes/estudio/$tarefa" params={{ tarefa: "editar" }} className="mt-3 block min-h-11 text-left">
        <span className="block text-sm text-gold">Editar uma imagem</span>
        <span className="block text-sm text-muted">Transforma imagens existentes.</span>
      </Link>
    </div>
  );
}

export function MusicTask() {
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [language, setLanguage] = useState("Português de Angola");
  const [note, setNote] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setNote("");
    setAudioUrl("");
    const result = await prepareMusic({ data: { description, style, language } });
    setBusy(false);
    if (!result.ok) {
      setNote(result.message);
      return;
    }
    setAudioUrl(result.audioUrl);
  }

  return (
    <section className="mt-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="font-medium">Criar música</p>
      <label className="mt-3 block text-xs text-subtle">
        Descrição
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl bg-elevated px-3 py-3 text-sm text-fg"
        />
      </label>
      <label className="mt-3 block text-xs text-subtle">
        Estilo
        <input
          value={style}
          onChange={(event) => setStyle(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl bg-elevated px-3 text-sm text-fg"
        />
      </label>
      <label className="mt-3 block text-xs text-subtle">
        Idioma
        <input
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl bg-elevated px-3 text-sm text-fg"
        />
      </label>
      <button type="button" className="mt-3 min-h-11 text-sm text-gold" onClick={() => void create()} disabled={busy}>
        {busy ? "A preparar…" : "Criar"}
      </button>
      {note ? <p className="mt-2 text-sm text-muted">{note}</p> : null}
      {audioUrl ? <audio className="mt-3 w-full" controls src={audioUrl} /> : null}
    </section>
  );
}
