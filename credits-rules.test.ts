import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateCost, isSimpleSocial, isUsableReply, testAllowanceGrant } from "./credits.ts";

describe("credit tariffs", () => {
  it("charges an isolated greeting as simple chat", () => {
    assert.equal(isSimpleSocial("Ola"), true);
    assert.equal(isSimpleSocial("Olá!"), true);
    assert.equal(isSimpleSocial("Bom dia, PILILÍ"), true);
    const cost = estimateCost({ power: "vida", message: "Ola" });
    assert.equal(cost.op, "simple_chat");
    assert.equal(cost.cost, 1);
  });

  it("does not treat a real request as a greeting", () => {
    assert.equal(isSimpleSocial("Olá, organiza a minha semana"), false);
    const vida = estimateCost({ power: "vida", message: "Organiza o dinheiro do mês" });
    assert.equal(vida.op, "complex_reasoning");
    assert.equal(vida.cost, 4);
    const heavy = estimateCost({ power: "negocio", message: "Quero abrir uma loja" });
    assert.equal(heavy.op, "multi_step_execution");
    assert.equal(heavy.cost, 10);
  });

  it("keeps search, documents, image and video on their own tariffs", () => {
    assert.equal(estimateCost({ message: "Olá", wantsSearch: true }).cost, 6);
    assert.equal(estimateCost({ message: "Olá", hasDocument: true }).cost, 5);
    assert.equal(estimateCost({ message: "Olá", wantsImage: true }).cost, 15);
    assert.equal(estimateCost({ message: "Olá", wantsVideo: true }).cost, 40);
  });

  it("tops up only trial accounts that are under the temporary test floor", () => {
    assert.equal(testAllowanceGrant("trial", 36), 1964);
    assert.equal(testAllowanceGrant("trial", 2000), 0);
    assert.equal(testAllowanceGrant("trial", 5000), 0);
    assert.equal(testAllowanceGrant("pro", 10), 0);
  });

  it("rejects an empty or tag-only reply", () => {
    assert.equal(isUsableReply(""), false);
    assert.equal(isUsableReply("   "), false);
    assert.equal(isUsableReply("..."), false);
    assert.equal(isUsableReply("<pilili_meta>{}</pilili_meta>"), false);
    assert.equal(isUsableReply("Olá. Em que posso ajudar?"), true);
  });
});
