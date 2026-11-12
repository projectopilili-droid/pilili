import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachCvPhoto, cvDocument, cvPdfName, cvPdfSource, cvPlainText, hydrateCvPayload, readCv, resolveCvStyle, skipGeneratedCvImage } from "./cv.ts";
import { downloadCvPdf, renderCvPdf } from "../client/cv-pdf.ts";

describe("cv templates", () => {
  it("keeps only given data and skips sections that were not given", () => {
    const data = readCv({
      name: "Marta Sousa",
      role: "Comercial",
      email: "a indicar",
      experience: [{ title: "Vendas", org: "Loja do Bairro", dates: "2021-2024", bullets: ["Atendimento"] }],
      projects: [{ title: "a indicar", org: "a indicar", dates: "a indicar", bullets: [] }],
    });
    assert.equal(data.name, "Marta Sousa");
    assert.equal(data.email, "");
    assert.equal(data.phone, "");
    assert.equal(data.projects.length, 0);
    assert.equal(data.skills.length, 0);
    assert.equal(data.photo, "");
    const html = cvDocument(data, "classico");
    assert.equal(html.includes("Empresa Inventada"), false);
    assert.equal(html.includes("a indicar"), false);
    assert.equal(html.includes("Projecto"), false);
    assert.equal(html.includes("\u2014"), false);
    assert.match(html, /Vendas/);
    assert.match(html, /Clássico|classico|c6a15b/);
  });

  it("does not invent a photo or a company", () => {
    const data = readCv({ photo: "javascript:alert(1)", experience: [] });
    assert.equal(data.photo, "");
    assert.equal(data.experience.length, 0);
  });

  it("builds the three visual styles and defaults to classico", () => {
    assert.equal(resolveCvStyle(undefined), "classico");
    assert.equal(resolveCvStyle("Moderno com Barra Lateral"), "barra");
    assert.equal(resolveCvStyle("moderno claro"), "claro");
    const data = readCv({ name: "Ana", email: "ana@exemplo.ao" });
    assert.match(cvDocument(data, "barra"), /#16324f/);
    assert.match(cvDocument(data, "claro"), /#f6f1e8/);
    assert.match(cvDocument(data, "classico"), /#c6a15b/);
    assert.equal(cvPlainText(data, "barra").includes("\u2014"), false);
  });

  it("names the download as a pdf and keeps the chosen style", () => {
    assert.equal(cvPdfName("CV \u2014 Comercial"), "CV-Comercial.pdf");
    assert.equal(cvPdfName("   "), "cv.pdf");
    const data = readCv({ name: "Ana", role: "Comercial" });
    const source = cvPdfSource(cvDocument(data, "barra"));
    assert.match(source, /<body class="pdf">/);
    assert.match(source, /#16324f/);
    assert.equal(source.includes("\u2014"), false);
  });

  it("puts only an attached image in the photo slot", () => {
    const url = "data:image/jpeg;base64,abc";
    const payload: { [key: string]: string } = { name: "Ana" };
    assert.equal(attachCvPhoto(payload, "javascript:alert(1)"), false);
    assert.equal(attachCvPhoto(payload, url), true);
    const data = readCv(payload);
    assert.equal(data.photo, url);
    assert.match(cvDocument(data, "classico"), /src="data:image\/jpeg;base64,abc"/);
    const empty = cvDocument(readCv({ name: "Ana" }), "barra");
    assert.equal(empty.includes("a indicar"), false);
    assert.equal(empty.includes("<img"), false);
    const withProject = cvDocument(
      readCv({ name: "Ana", projects: [{ title: "Feira", org: "Mercado", dates: "2024", bullets: ["Banca"] }] }),
      "classico",
    );
    assert.match(withProject, /Projecto/);
    assert.match(withProject, /Feira/);
  });

  it("builds a real pdf for each visual style", () => {
    const data = readCv({ name: "Ana Costa", role: "Comercial", email: "ana@exemplo.ao" });
    const files = (["classico", "barra", "claro"] as const).map((style) => {
      const pdf = renderCvPdf(data, style);
      assert.equal(pdf.internal.pageSize.getWidth(), 210);
      assert.ok(pdf.internal.pageSize.getHeight() >= 211);
      const bytes = new Uint8Array(pdf.output("arraybuffer"));
      const head = String.fromCharCode(...bytes.slice(0, 5));
      assert.equal(head, "%PDF-");
      assert.notEqual(bytes[0], 0x89);
      const body = Buffer.from(bytes).toString("latin1");
      assert.equal(body.includes("<html"), false);
      assert.match(body, /Ana Costa/);
      assert.equal(body.includes("Projecto"), false);
      return body;
    });
    assert.notEqual(files[0], files[1]);
    assert.notEqual(files[1], files[2]);
  });

  it("does not generate another portrait for a CV photo", () => {
    assert.equal(skipGeneratedCvImage("emprego", "Faz o meu CV com a foto que anexei"), true);
    assert.equal(skipGeneratedCvImage("estudio", "Cria um cartaz"), false);
    assert.equal(skipGeneratedCvImage("emprego", "Cria um cartaz para a candidatura"), false);
  });

  it("puts the attached photo in the pdf and does not replace it", () => {
    const jpeg =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";
    const data = readCv({ name: "Ana Costa", photo: jpeg });
    assert.equal(data.photo, jpeg);
    const bytes = new Uint8Array(renderCvPdf(data, "classico").output("arraybuffer"));
    const body = Buffer.from(bytes).toString("latin1");
    assert.equal(String.fromCharCode(...bytes.slice(0, 5)), "%PDF-");
    assert.match(body, /DCTDecode|\/Image/);
    assert.equal(body.includes("Foto a indicar"), false);
  });

  it("opens print when a pdf cannot be saved here", async () => {
    let opened = "";
    const result = await downloadCvPdf("CV", readCv({ name: "Ana" }), "classico", (_title, html) => {
      opened = html;
    });
    assert.equal(result, "print");
    assert.match(opened, /Ana/);
    assert.equal(opened.includes("a indicar"), false);
  });

  it("shows the written CV when the package only has a photo", () => {
    const payload: { [key: string]: string } = { raw: "Mara Rosa. Comercial. ana@exemplo.ao. Experiência na loja do bairro." };
    const data = readCv(payload, "CV Mara Rosa");
    assert.equal(data.name, "Mara Rosa");
    assert.match(data.profile, /loja do bairro/);
    const html = cvDocument(data, "claro");
    assert.match(html, /Mara Rosa/);
    assert.match(html, /loja do bairro/);
    assert.equal(html.includes("a indicar"), false);
    assert.equal(html.includes("Projecto"), false);
    hydrateCvPayload({}, "CV", "Faz o CV");
    const empty: { [key: string]: string } = {};
    hydrateCvPayload(empty, "CV Ana Sousa", "Sou Ana Sousa, comercial, com experiência em vendas desde 2020.");
    assert.match(String(empty.profile), /experiência em vendas/);
    assert.equal(empty.name, "Ana Sousa");
  });

  it("turns a long dash in the source data into a hyphen", () => {
    const data = readCv({ profile: "Vendas \u2014 atendimento" });
    assert.equal(data.profile, "Vendas - atendimento");
  });
});
