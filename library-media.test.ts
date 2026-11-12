import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shapeLibraryRecord } from "./library-image.ts";
import {
  LIBRARY_MISS,
  MAX_IMAGE_CHARS,
  keepVideoFile,
  mediaFromStored,
  slimArtifact,
  visibleImageUrl,
} from "./library-media.ts";
import type { Json } from "./types.ts";

describe("biblioteca", () => {
  it("does not ship video bytes or oversized images in the list", () => {
    assert.equal(visibleImageUrl(null), null);
    assert.equal(visibleImageUrl("data:video/mp4;base64,aaaa"), null);
    assert.equal(visibleImageUrl("https://vidgen.x.ai/clip.mp4"), "https://vidgen.x.ai/clip.mp4");
    const big = `data:image/png;base64,${"a".repeat(MAX_IMAGE_CHARS + 30_000)}`;
    assert.equal(visibleImageUrl(big), null);
    assert.equal(visibleImageUrl("data:image/png;base64,aaaa"), "data:image/png;base64,aaaa");
  });

  it("drops inline data urls from the message copy", () => {
    const slim = slimArtifact({
      id: "1",
      payload: { url: `data:image/png;base64,${"a".repeat(500)}`, alt: "Marca" } as { [key: string]: Json },
    });
    assert.equal(slim.payload.url, "");
    assert.equal(slim.payload.stored, true);
    assert.equal(slim.payload.alt, "Marca");
    const kept = slimArtifact({ id: "2", payload: { url: "https://exemplo.test/a.png" } as { [key: string]: Json } });
    assert.equal(kept.payload.url, "https://exemplo.test/a.png");
    const photo = slimArtifact({
      id: "3",
      payload: { name: "Mara", photo: `data:image/jpeg;base64,${"b".repeat(MAX_IMAGE_CHARS + 10)}` } as {
        [key: string]: Json;
      },
    });
    assert.equal(photo.payload.photo, "");
    assert.equal(photo.payload.name, "Mara");
    assert.equal(photo.payload.stored, true);
  });

  it("keeps text and stores the image beside a short body", async () => {
    const note = await shapeLibraryRecord("checklist", { title: "Lista", items: ["Pagar", "Ligar"] });
    assert.equal(note.imageUrl, null);
    assert.match(note.body, /Pagar/);
    assert.equal(note.body.includes("\u2014"), false);

    const url = "data:image/png;base64,iVBORw0KGgo=";
    const image = await shapeLibraryRecord("image", { url, alt: "Logo" });
    assert.equal(image.imageUrl, url);
    assert.equal(image.live.url, url);
    const body = JSON.parse(image.body) as { url: string; stored: boolean; alt: string };
    assert.equal(body.url, "");
    assert.equal(body.stored, true);
    assert.equal(body.alt, "Logo");
  });

  it("saves the CV text even when the photo cannot be shrunk", async () => {
    const huge = `data:image/png;base64,${"a".repeat(MAX_IMAGE_CHARS)}`;
    const cv = await shapeLibraryRecord("cv_package", { name: "Mara", photo: huge });
    assert.equal(cv.live.photo, huge);
    const body = JSON.parse(cv.body) as { name: string; photo: string };
    assert.equal(body.name, "Mara");
    assert.equal(body.photo, "");
  });

  it("does not download video from other sites", async () => {
    assert.equal(await keepVideoFile("http://vidgen.x.ai/a.mp4"), null);
    assert.equal(await keepVideoFile("https://exemplo.test/a.mp4"), null);
    const remote = await shapeLibraryRecord("video", {
      url: "https://exemplo.test/a.mp4",
      status: "done",
    });
    assert.equal(remote.imageUrl, "https://exemplo.test/a.mp4");
    assert.equal(remote.live.stored, false);
    assert.match(LIBRARY_MISS, /Biblioteca/);
    assert.equal(LIBRARY_MISS.includes("\u2014"), false);
  });

  it("reads a saved file from the row when the list hid it", () => {
    assert.equal(mediaFromStored("data:video/mp4;base64,aaa", '{"stored":true}'), "data:video/mp4;base64,aaa");
    assert.equal(
      mediaFromStored(null, JSON.stringify({ url: "data:image/jpeg;base64,bbb", stored: true })),
      "data:image/jpeg;base64,bbb",
    );
    assert.equal(mediaFromStored("https://vidgen.x.ai/x.mp4", "{}"), "https://vidgen.x.ai/x.mp4");
    assert.equal(mediaFromStored(null, "texto"), null);
  });
});
