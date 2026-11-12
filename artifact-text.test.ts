import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupChecklist, plainChecklist, splitBlocks } from "./artifact-text.ts";

describe("artifact structure", () => {
  it("keeps checklist groups in order and does not merge different sections", () => {
    const groups = groupChecklist([
      { text: "Mercado", group: "Sábado" },
      { text: "Família", group: "Domingo" },
      { text: "Fruta", group: "Sábado" },
    ]);
    assert.deepEqual(
      groups.map((g) => g.title),
      ["Sábado", "Domingo"],
    );
    assert.equal(groups[0]?.items.length, 2);
    assert.match(plainChecklist("Fim-de-semana", groups), /Sábado\n1\. Mercado/);
  });

  it("splits bullet lines into a list and leaves prose as prose", () => {
    const blocks = splitBlocks("Uma frase.\n- Preço em Kz\n- WhatsApp\n\nFecho curto.");
    assert.deepEqual(
      blocks.map((b) => b.type),
      ["text", "list", "text"],
    );
    assert.deepEqual(blocks[1]?.lines, ["Preço em Kz", "WhatsApp"]);
  });
});
