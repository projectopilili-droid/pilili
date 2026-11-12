import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Composer } from "@/components/chat/Composer";
import { MusicTask } from "@/components/powers/StudioTasks";
import { savePending } from "@/lib/client/pending";
import { uid } from "@/lib/utils";

const TASKS = {
  imagem: {
    title: "Imagem",
    detail: "Cria imagens a partir das tuas ideias.",
    image: "/powers/estudio.jpg",
    placeholder: "Descreve a imagem que queres.",
    lead: "Cria uma imagem: ",
  },
  video: {
    title: "Vídeo curto",
    detail: "Produz vídeos para redes sociais e campanhas.",
    image: "/powers/estudio-film.jpg",
    placeholder: "Descreve o vídeo curto que queres.",
    lead: "Produz um vídeo curto: ",
  },
  editar: {
    title: "Editar uma imagem",
    detail: "Transforma imagens existentes.",
    image: "/powers/estudio.jpg",
    placeholder: "Diz o que queres mudar e anexa a foto.",
    lead: "Edita esta imagem: ",
  },
} as const;

type TaskId = keyof typeof TASKS | "voz" | "musica";

export const Route = createFileRoute("/poderes/estudio/$tarefa")({
  component: StudioTaskPage,
});

function StudioTaskPage() {
  const { tarefa } = Route.useParams();
  const id = tarefa as TaskId;
  if (id !== "imagem" && id !== "video" && id !== "voz" && id !== "musica" && id !== "editar") {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10">
        <p>Esta página não existe.</p>
        <Link to="/poderes/$slug" params={{ slug: "estudio" }} className="mt-4 inline-block min-h-11 text-sm text-gold">
          Voltar ao Estúdio Criativo
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-10 pt-3">
      <Link
        to="/poderes/$slug"
        params={{ slug: "estudio" }}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted"
      >
        <ArrowLeft className="size-4" />
        Voltar ao Estúdio Criativo
      </Link>
      {id === "voz" ? <VoicePage /> : id === "musica" ? <MusicPage /> : <CreatePage task={TASKS[id]} />}
    </main>
  );
}

function CreatePage({ task }: { task: (typeof TASKS)[keyof typeof TASKS] }) {
  const nav = useNavigate();
  return (
    <>
      <div className="mt-3 overflow-hidden rounded-3xl">
        <img src={task.image} alt="" className="h-auto w-full" />
      </div>
      <h1 className="mt-4 font-display text-3xl font-semibold">{task.title}</h1>
      <p className="mt-2 text-muted">{task.detail}</p>
      <div className="mt-6">
        <Composer
          placeholder={task.placeholder}
          onSubmit={(text, files) => {
            const id = uid();
            const clean = text.trim();
            const body = clean.toLowerCase().startsWith(task.lead.toLowerCase()) ? clean : `${task.lead}${clean}`;
            savePending({ id, text: body, attachments: files, power: "estudio", projectId: null });
            nav({ to: "/c/$id", params: { id } });
          }}
        />
      </div>
      <p className="mt-8 text-lg font-semibold leading-snug">A TUA IDEIA. A TUA CRIATIVIDADE. A TUA ASSINATURA.</p>
      <p className="mt-2 text-sm text-gold">Tu pedes. O PILILÍ executa.</p>
    </>
  );
}

function MusicPage() {
  return (
    <>
      <div className="mt-3 overflow-hidden rounded-3xl">
        <img src="/powers/dj-deck.jpg" alt="" className="h-auto w-full" />
      </div>
      <h1 className="mt-4 font-display text-3xl font-semibold">Música</h1>
      <p className="mt-2 text-muted">Cria música a partir do teu conceito.</p>
      <MusicTask />
      <p className="mt-8 text-lg font-semibold leading-snug">A TUA IDEIA. A TUA CRIATIVIDADE. A TUA ASSINATURA.</p>
      <p className="mt-2 text-sm text-gold">Tu pedes. O PILILÍ executa.</p>
    </>
  );
}

function VoicePage() {
  const nav = useNavigate();
  return (
    <>
      <div className="mt-3 overflow-hidden rounded-3xl">
        <img src="/powers/voice.jpg" alt="" className="h-auto w-full" />
      </div>
      <h1 className="mt-4 font-display text-3xl font-semibold">Áudio & Voz</h1>
      <p className="mt-2 text-muted">Transcreve, compila, resume e cria vídeo a partir de áudios.</p>
      <div className="mt-6">
        <Composer
          autoFocus
          placeholder="Diz o que queres fazer com o áudio."
          onSubmit={(text, attached) => {
            const next = uid();
            savePending({
              id: next,
              text: text.trim() || "Analisa o que enviei.",
              attachments: attached,
              power: "estudio",
              projectId: null,
            });
            nav({ to: "/c/$id", params: { id: next } });
          }}
        />
      </div>
      <p className="mt-8 text-lg font-semibold leading-snug">A TUA IDEIA. A TUA CRIATIVIDADE. A TUA ASSINATURA.</p>
      <p className="mt-2 text-sm text-gold">Tu pedes. O PILILÍ executa.</p>
    </>
  );
}
