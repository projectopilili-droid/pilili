import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDoneMarks, parseTaskList, taskProgress } from "./tasks.ts";

describe("task lists", () => {
  it("reads steps and keeps a note that is not a task", () => {
    const body = "Semana\n- Mercado\n- Casa\nNota: não enviar a ninguém.";
    const parsed = parseTaskList(body);
    assert.equal(parsed?.tasks.length, 2);
    assert.equal(parsed?.tasks[0]?.done, false);
    const next = applyDoneMarks(body, [true, false]);
    assert.match(next ?? "", /- \[x\] Mercado/);
    assert.match(next ?? "", /Nota: não enviar/);
    assert.equal(parseTaskList(next ?? "")?.tasks[0]?.done, true);
  });

  it("turns short lines into steps and keeps the mark after a reload", () => {
    const next = applyDoneMarks("Mercado\nCasa", [true, false]);
    assert.equal(next, "- [x] Mercado\n- [ ] Casa");
    assert.equal(parseTaskList(next ?? "")?.tasks[0]?.done, true);
  });

  it("does not turn a paragraph into tasks", () => {
    assert.equal(parseTaskList("Quero organizar a semana com calma e sem pressa."), null);
  });

  it("counts what is done and what is open", () => {
    assert.equal(taskProgress(1, 3), "1 feita · 2 por fazer.");
    assert.equal(taskProgress(2, 2), "2 feitas. Nada por fazer.");
  });
});
