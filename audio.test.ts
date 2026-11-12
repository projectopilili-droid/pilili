import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { audioHtml, audioJob, isAudioFile, isTranscriptDump, parseAudioSections, transcriptSections } from "./audio.ts";

describe("audio", () => {
  it("accepts the audio formats and picks the job from the request", () => {
    assert.equal(isAudioFile("nota.m4a", ""), true);
    assert.equal(isAudioFile("voz.mp3", "audio/mpeg"), true);
    assert.equal(isAudioFile("fala.wav", ""), true);
    assert.equal(isAudioFile("clip.ogg", ""), true);
    assert.equal(isAudioFile("foto.jpg", "image/jpeg"), false);
    assert.equal(audioJob("Transcreve este áudio", 1), "transcribe");
    assert.equal(audioJob("Compila estes áudios", 3), "merge");
    assert.equal(audioJob("Junta num mp3", 2), "merge");
    assert.equal(audioJob("Organiza estes áudios", 3), "summary");
    assert.equal(audioJob("Resume o áudio", 1), "summary");
    assert.equal(audioJob("Tira os pontos principais", 1), "points");
    assert.equal(audioJob("Faz uma proposta com isto", 1), "document");
    assert.equal(audioJob("Cria um vídeo com este áudio", 1), "video");
    assert.equal(audioJob("Analisa o que enviei.", 2), "summary");
  });

  it("keeps only what was transcribed", () => {
    const sections = transcriptSections([
      { name: "a.m4a", text: "Primeira fala." },
      { name: "b.mp3", text: "   " },
    ]);
    assert.deepEqual(sections, [{ heading: "a.m4a", body: "Primeira fala." }]);
    const parsed = parseAudioSections('{"title":"Reunião","sections":[{"heading":"Tema","body":"Só o que foi dito."}]}');
    assert.equal(parsed?.sections[0]?.body, "Só o que foi dito.");
    assert.equal(audioHtml("Reunião", sections).includes("\u2014"), false);
    const sources = transcriptSections([
      { name: "a.m4a", text: "Falamos do orçamento da semana." },
      { name: "b.mp3", text: "Depois repetimos o mesmo orçamento." },
    ]);
    assert.equal(isTranscriptDump(sources, sources), true);
    assert.equal(
      isTranscriptDump(
        [{ heading: "Orçamento", body: "O orçamento da semana foi repetido nos dois áudios." }],
        sources,
      ),
      false,
    );
  });
});
