import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executionStatus, formatElapsed, openingDetail, siteProgress } from "./execution-status.ts";

describe("execution status", () => {
  it("uses a power-specific message as soon as preparation starts", () => {
    assert.equal(executionStatus({ phase: "preparando", power: "vida", detail: "preparar" }), "A organizar as tuas prioridades…");
    assert.equal(executionStatus({ phase: "preparando", power: null, detail: "preparar" }), "O PILILÍ está a preparar a resposta…");
    assert.equal(executionStatus({ phase: "a_executar", power: "emprego" }), "A preparar os próximos passos…");
  });

  it("names search, documents, images and video only from a real stage", () => {
    const waiting = executionStatus({ phase: "preparando", power: "burocracia" });
    assert.equal(waiting?.includes("pesquis") ?? true, false);
    assert.equal(executionStatus({ phase: "a_executar", power: "burocracia", detail: "pesquisa" }), "A pesquisar fontes relevantes…");
    assert.equal(executionStatus({ phase: "a_executar", power: "entende", detail: "documento" }), "A analisar o documento…");
    assert.equal(executionStatus({ phase: "a_executar", power: "estudio", detail: "audio" }), "A analisar os áudios…");
    assert.equal(executionStatus({ phase: "a_executar", power: "estudio", detail: "audio_juntar" }), "A juntar os ficheiros…");
    assert.equal(executionStatus({ phase: "a_executar", power: "estudio", detail: "audio_texto" }), "A organizar o texto…");
    assert.equal(executionStatus({ phase: "a_executar", power: "vida", detail: "escrever" }), "A escrever a resposta…");
    assert.equal(executionStatus({ phase: "a_executar", power: "estudio", detail: "imagem" }), "A gerar a imagem…");
    assert.equal(executionStatus({ phase: "a_executar", power: "dj", detail: "Vídeo: queued" }), "A gerar o vídeo…");
    assert.equal(executionStatus({ phase: "preparando", power: "digital", detail: "site" }), "A gerar o site…");
    assert.equal(executionStatus({ phase: "a_executar", power: "digital", detail: "site_update" }), "A actualizar o site…");
    assert.equal(executionStatus({ phase: "a_executar", power: "digital", detail: "site_layout" }), "A preparar o layout…");
    assert.equal(executionStatus({ phase: "a_executar", power: "digital", detail: "site_apply" }), "A aplicar as alterações…");
    assert.equal(openingDetail("digital", "Quero um website profissional para a loja"), "site");
    assert.equal(openingDetail("estudio", "Cria um vídeo curto"), "video");
    assert.equal(openingDetail("estudio", "Cria uma imagem do produto"), "imagem");
    assert.equal(openingDetail("estudio", "Juntar esses áudios num só"), "audio_ouvir");
    const plain = executionStatus({ phase: "a_executar", power: "vida", detail: "Perceber a vida real" });
    assert.equal(plain?.includes("pesquis") ?? true, false);
  });

  it("clears on terminal states and keeps verification honest", () => {
    assert.equal(executionStatus({ phase: "a_verificar", power: "vida", detail: "verificar" }), "A verificar o resultado…");
    assert.equal(executionStatus({ phase: "concluido", power: "vida" }), null);
    assert.equal(executionStatus({ phase: "erro", power: "vida" }), null);
    assert.equal(executionStatus({ phase: null, power: "vida" }), null);
    assert.equal(formatElapsed(12), "0:12");
    assert.equal(formatElapsed(45), "0:45");
    assert.equal(formatElapsed(60), "1:00");
    assert.equal(formatElapsed(72), "1:12");
    assert.equal(formatElapsed(74), "1:14");
    assert.equal(
      executionStatus({ phase: "preparando", power: "vida", detail: "preparar", elapsed: 8 }),
      "A escrever a resposta…",
    );
    assert.equal(siteProgress("site_layout")?.index, 0);
    assert.equal(siteProgress("site_update")?.index, 1);
    assert.equal(siteProgress("site_apply")?.index, 2);
    assert.equal(siteProgress("imagem"), null);
  });
});
