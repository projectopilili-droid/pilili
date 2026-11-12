import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FACEBOOK_PENDING, facebookReady } from "./facebook.ts";

describe("facebook login", () => {
  it("stays off until both keys exist", () => {
    assert.equal(facebookReady("", "secret"), false);
    assert.equal(facebookReady("app", "  "), false);
    assert.equal(facebookReady("app", "secret"), true);
    assert.equal(FACEBOOK_PENDING, "A integração está a ser activada.");
  });
});
