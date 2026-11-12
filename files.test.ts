import assert from "node:assert/strict";
import test from "node:test";
import { blockedAttachmentReason, isDocx, isPdf } from "./files.ts";
import { isAudioFile } from "./audio.ts";

test("pdf and docx are accepted for local reading", () => {
  assert.equal(blockedAttachmentReason("cv.pdf", "application/pdf"), null);
  assert.equal(blockedAttachmentReason("carta.docx", ""), null);
  assert.equal(isPdf("cv.pdf", ""), true);
  assert.equal(isDocx("carta.docx", ""), true);
});

test("sheets, slides and old word stay unread", () => {
  assert.match(blockedAttachmentReason("folha.xlsx", "application/vnd.ms-excel") ?? "", /ainda não é lido/i);
  assert.match(blockedAttachmentReason("carta.doc", "") ?? "", /docx/i);
  assert.equal(blockedAttachmentReason("notas.txt", "text/plain"), null);
  assert.equal(blockedAttachmentReason("foto.jpg", "image/jpeg"), null);
  assert.equal(isAudioFile("reuniao.m4a", "audio/mp4"), true);
  assert.equal(blockedAttachmentReason("reuniao.m4a", "audio/mp4"), null);
});
