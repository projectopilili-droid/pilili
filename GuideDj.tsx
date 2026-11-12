import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const EXAMPLES = [
  { name: "PILILÍ AFRO", src: "/music/pilili-afro.mp3" },
  { name: "PILILÍ SEMBA", src: "/music/pilili-semba.mp3" },
];

const OCCASIONS = [
  "Festa",
  "Aniversário",
  "Jantar",
  "Restaurante / Lounge",
  "Bar",
  "Evento",
  "Treino",
  "Relaxar",
  "Outra",
];

const STYLES = [
  "Afrobeat",
  "Amapiano",
  "Kizomba",
  "Semba",
  "Kuduro",
  "Cabo-Zouk",
  "Marrabenta",
  "R&B",
  "Hip-Hop",
  "Dancehall",
  "House",
  "Afropop",
  "Outro",
];

const VIBES = [
  "Chill",
  "Elegante",
  "Romântica",
  "Festiva",
  "Urbana",
  "Tropical",
  "Nostálgica",
  "Club",
  "Premium",
];

const ENERGIES = ["Baixa", "Média", "Alta", "Explosiva"];
const DURATIONS = ["30 min", "1 hora", "2 horas", "3 horas", "4+ horas"];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function ExampleTracks() {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  function toggleTrack(src: string) {
    const current = audioRef.current;
    if (playing === src && current) {
      current.pause();
      setPlaying(null);
      return;
    }
    if (current) current.pause();
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.onended = () => setPlaying(null);
    void audio.play();
    setPlaying(src);
  }

  return (
    <div className="mt-6 space-y-2">
      <p className="text-sm text-subtle">Exemplos</p>
      {EXAMPLES.map((track) => {
        const on = playing === track.src;
        return (
          <div key={track.src} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 shadow-[var(--shadow-border)]">
            <button
              type="button"
              aria-label={on ? `Parar ${track.name}` : `Reproduzir ${track.name}`}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-gold text-gold-fg"
              onClick={() => toggleTrack(track.src)}
            >
              {on ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <p className="text-sm font-medium">{track.name}</p>
          </div>
        );
      })}
    </div>
  );
}

export function GuideDj({ onLaunch }: { onLaunch: (text: string) => void }) {
  const [occasion, setOccasion] = useState("Festa");
  const [styles, setStyles] = useState<string[]>(["Kizomba", "Semba"]);
  const [vibe, setVibe] = useState("Festiva");
  const [energy, setEnergy] = useState("Média");
  const [duration, setDuration] = useState("2 horas");
  const [audience, setAudience] = useState("");
  const [avoid, setAvoid] = useState("");

  function compose() {
    const lines = [
      "Quero uma sessão DJ PILILÍ.",
      `Ocasião: ${occasion}.`,
      styles.length ? `Estilos: ${styles.join(", ")}.` : null,
      `Vibe: ${vibe}. Energia: ${energy}. Duração: ${duration}.`,
      audience.trim() ? `Público: ${audience.trim()}.` : null,
      avoid.trim() ? `Não quero: ${avoid.trim()}.` : null,
      "Cria o arco (warm-up, peak, cool-down), referências e controlos.",
    ];
    return lines.filter(Boolean).join(" ");
  }

  return (
    <section className="mt-8">
      <ExampleTracks />
      <h2 className="mt-8 font-display text-2xl font-semibold">Que noite queres criar?</h2>
      <p className="mt-1 text-sm text-muted">Conta-me a vibe. O PILILÍ trata do resto.</p>

      <p className="mt-6 text-sm text-subtle">Ocasião</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {OCCASIONS.map((o) => (
          <Chip key={o} selected={occasion === o} onClick={() => setOccasion(o)}>
            {o}
          </Chip>
        ))}
      </div>

      <p className="mt-6 text-sm text-subtle">Estilos musicais</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {STYLES.map((s) => (
          <Chip key={s} selected={styles.includes(s)} onClick={() => setStyles(toggle(styles, s))}>
            {s}
          </Chip>
        ))}
      </div>

      <p className="mt-6 text-sm text-subtle">Vibe</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {VIBES.map((v) => (
          <Chip key={v} selected={vibe === v} onClick={() => setVibe(v)}>
            {v}
          </Chip>
        ))}
      </div>

      <p className="mt-6 text-sm text-subtle">Energia</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ENERGIES.map((e) => (
          <Chip key={e} selected={energy === e} onClick={() => setEnergy(e)}>
            {e}
          </Chip>
        ))}
      </div>

      <p className="mt-6 text-sm text-subtle">Duração</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DURATIONS.map((d) => (
          <Chip key={d} selected={duration === d} onClick={() => setDuration(d)}>
            {d}
          </Chip>
        ))}
      </div>

      <label className="mt-6 block text-sm text-subtle">
        Público (opcional)
        <Input
          className="mt-2"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="Ex: amigos, família, clientes..."
        />
      </label>

      <label className="mt-4 block text-sm text-subtle">
        Há alguma coisa que não queres ouvir?
        <Textarea
          className="mt-2"
          value={avoid}
          onChange={(e) => setAvoid(e.target.value)}
          placeholder="Ex: nada de música triste, sem hip-hop..."
        />
      </label>

      <Button className="mt-6 w-full" onClick={() => onLaunch(compose())}>
        Criar a sessão
      </Button>
      <p className="mt-2 text-xs text-subtle">
        Entrega o arco e as referências. Não toca faixas licenciadas.
      </p>
    </section>
  );
}
