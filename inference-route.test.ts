import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferenceRoute, messageNeedsSearch } from "./inference-route.ts";
import { providerFailureMessage } from "../server/provider-error.ts";

describe("search request route", () => {
  it("does not send web_search to chat completions", () => {
    const plain = inferenceRoute(false);
    assert.equal(plain.path, "/chat/completions");
    assert.equal(plain.tools, undefined);
    const search = inferenceRoute(true);
    assert.equal(search.path, "/responses");
    assert.deepEqual(search.tools, [{ type: "web_search" }]);
  });
});

describe("search intent", () => {
  it("does not search an ordinary plan just because it says agora", () => {
    assert.equal(messageNeedsSearch("Organiza o fim-de-semana agora", "vida"), false);
    assert.equal(messageNeedsSearch("Faz a lista para hoje", "executar"), false);
    assert.equal(messageNeedsSearch("Qual é a taxa do AGT", "vida"), true);
    assert.equal(messageNeedsSearch("Organiza a semana", "emprego"), true);
  });
});

describe("provider 422", () => {
  it("does not describe an invalid tool as a quota failure", () => {
    const body =
      "Failed to deserialize the JSON body into the target type: tools[0].type: unknown variant `web_search`, expected `function` or `live_search`";
    const message = providerFailureMessage(422, body);
    assert.equal(message.includes("cota"), false);
    assert.match(message, /422/);
    assert.match(message, /web_search/);
  });

  it("keeps a real spending-limit response as a quota message", () => {
    const message = providerFailureMessage(403, "personal-team-blocked:spending-limit");
    assert.match(message, /cota/);
  });
});
