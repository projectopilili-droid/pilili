import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  audioHtml,
  audioJob,
  audioPlain,
  isTranscriptDump,
  parseAudioSections,
  transcriptSections,
  type AudioSection,
} from "@/lib/pilili/audio";
import { chatCompletion } from "./grok";

const SHAPE: Record<string, string> = {
  compile:
    "Cria um único texto. Agrupa por temas, tira repetições e mantém a linguagem natural. Não faças uma secção por ficheiro. Não copies as transcrições uma a seguir à outra. O título de cada secção é um tema, nunca o nome do ficheiro.",
  summary: "Resume tudo num único texto curto, por temas. Não listes os áudios um a um.",
  points: "Tira os pontos principais num único texto. Não copies as transcrições.",
  document: "Transforma o que foi dito num texto com secções. Não listes os ficheiros.",
  video: "Organiza o que foi dito em secções curtas para um vídeo. Não acrescentes cenas nem listes os ficheiros.",
};

export async function transcribeFile(file: { name: string; mime: string; dataUrl: string }): Promise<string> {
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) return "";
  const comma = file.dataUrl.indexOf(",");
  const b64 = comma >= 0 ? file.dataUrl.slice(comma + 1) : file.dataUrl;
  const bytes = Buffer.from(b64, "base64");
  if (!bytes.length) return "";
  const form = new FormData();
  form.append("model", "grok-voice-transcribe-2.0");
  form.append("format", "true");
  form.append("language", "pt");
  form.append("file", new Blob([bytes], { type: file.mime || "audio/mpeg" }), file.name || "audio.m4a");
  const res = await fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) return "";
  const json = (await res.json()) as { text?: string };
  return typeof json.text === "string" ? json.text.trim() : "";
}

const AUDIO_DIR = path.join(process.cwd(), "public", "audio");

export async function joinAudioFiles(
  files: { name: string; mime: string; dataUrl: string }[],
  id: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Não consegui preparar o ficheiro." };
  if (files.length < 2) return { ok: false, message: "Anexa pelo menos dois áudios para juntar num só ficheiro." };
  const work = await mkdtemp(path.join(tmpdir(), "pilili-audio-"));
  try {
    const inputs: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const comma = file.dataUrl.indexOf(",");
      const b64 = comma >= 0 ? file.dataUrl.slice(comma + 1) : file.dataUrl;
      const bytes = Buffer.from(b64, "base64");
      if (!bytes.length) return { ok: false, message: "Um dos áudios chegou vazio." };
      const ext = audioExt(file.name, file.mime);
      const part = path.join(work, `part-${index}${ext}`);
      await writeFile(part, bytes);
      inputs.push(part);
    }
    await mkdir(AUDIO_DIR, { recursive: true });
    const out = path.join(AUDIO_DIR, `${id}.mp3`);
    const filter = `${inputs.map((_, index) => `[${index}:a]`).join("")}concat=n=${inputs.length}:v=0:a=1[a]`;
    const args = ["-y"];
    for (const input of inputs) args.push("-i", input);
    args.push("-filter_complex", filter, "-map", "[a]", "-c:a", "libmp3lame", "-q:a", "4", out);
    const code = await run("ffmpeg", args);
    if (code !== 0) return { ok: false, message: "Não consegui juntar os áudios num só ficheiro." };
    return { ok: true, url: `/audio/${id}.mp3` };
  } catch {
    return { ok: false, message: "Não consegui juntar os áudios num só ficheiro." };
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}

function audioExt(name: string, mime: string): string {
  const file = name.toLowerCase();
  const type = mime.toLowerCase();
  if (file.endsWith(".wav") || type.includes("wav")) return ".wav";
  if (file.endsWith(".ogg") || type.includes("ogg")) return ".ogg";
  if (file.endsWith(".m4a") || type.includes("mp4") || type.includes("m4a")) return ".m4a";
  return ".mp3";
}

function run(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

export async function prepareAudio(opts: {
  message: string;
  files: { name: string; text: string }[];
}): Promise<
  | { ok: true; title: string; reply: string; plain: string; html: string; sections: AudioSection[]; video: boolean }
  | { ok: false; message: string }
> {
  const heard = transcriptSections(opts.files);
  if (!heard.length) return { ok: false, message: "Não consegui ouvir fala nestes áudios." };
  const job = audioJob(opts.message, opts.files.length);
  const shaped = job === "transcribe" ? null : await shapedOnce(job, opts.message, heard);
  if (job !== "transcribe" && !shaped) {
    return { ok: false, message: "Não consegui juntar os áudios num texto único. Tenta outra vez." };
  }
  const sections = shaped ? shaped.sections : transcriptionCard(heard);
  const title = shaped?.title || "Transcrição";
  return {
    ok: true,
    title,
    reply: replyFor(job),
    plain: audioPlain(title, sections),
    html: audioHtml(title, sections),
    sections,
    video: job === "video",
  };
}

function transcriptionCard(sections: AudioSection[]): AudioSection[] {
  if (sections.length === 1) return [{ heading: "Transcrição", body: sections[0].body }];
  return sections;
}

async function shapedOnce(
  job: string,
  message: string,
  sources: AudioSection[],
): Promise<{ title: string; sections: AudioSection[] } | null> {
  const first = await shapeAudio(job, message, sources);
  if (first && !isTranscriptDump(first.sections, sources)) return first;
  const again = await shapeAudio(
    job,
    `${message}\nIsto tem de ser um texto só, organizado por temas. Não devolvas as transcrições uma a seguir à outra.`,
    sources,
  );
  if (again && !isTranscriptDump(again.sections, sources)) return again;
  return null;
}

function replyFor(job: string): string {
  if (job === "compile") return "Juntei os áudios num só texto.";
  if (job === "summary") return "O resumo ficou pronto.";
  if (job === "points") return "Estes são os pontos principais.";
  if (job === "document") return "O texto ficou pronto.";
  if (job === "video") return "O vídeo curto sai do que foi dito nos áudios.";
  return "A transcrição ficou pronta.";
}

async function shapeAudio(
  job: string,
  message: string,
  sections: AudioSection[],
): Promise<{ title: string; sections: AudioSection[] } | null> {
  const source = sections.map((section) => `${section.heading}\n${section.body}`).join("\n\n");
  try {
    const result = await chatCompletion({
      role: "fast",
      maxTokens: 1200,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Responde só com JSON {title, sections:[{heading, body}]}. Um texto só, com título e secções por tema. Português de Angola, com tu e teu. Sem português do Brasil. Sem travessão longo. Não acrescentes factos que não estejam nas transcrições. Não uses o nome do ficheiro como secção.",
        },
        {
          role: "user",
          content: `${SHAPE[job] || SHAPE.compile}\nPedido: ${message.slice(0, 400)}\n\nTranscrições:\n${source.slice(0, 12000)}`,
        },
      ],
    });
    return parseAudioSections(result.text);
  } catch {
    return null;
  }
}
