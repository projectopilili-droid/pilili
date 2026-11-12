import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deliveryLinks } from "./deliver-message.ts";

describe("support delivery", () => {
  it("addresses the message without being a page label", () => {
    const links = deliveryLinks("Apoio PILILÍ", "Quero apoiar o projecto.");
    assert.match(links.email, /^mailto:projectopilili@gmail\.com\?/);
    assert.match(links.whatsapp, /^https:\/\/wa\.me\/244923939211\?text=/);
    assert.match(links.whatsapp, /Quero%20apoiar/);
    assert.equal(links.email.includes("\u2014"), false);
  });
});
