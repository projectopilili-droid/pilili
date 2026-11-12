import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAnswerText } from "./format-answer.ts";
import { applySmallSiteEdit, continuesSite, draftSitePayload, ensureWebsitePayload, htmlReady, landingHtml, resolveSiteTemplate, siteHeroPrompt, siteReply, smallSiteEdit, stockImages, styleWebsite, userWantsCustomImages, userWantsPeople, userWantsSiteVideo } from "./website.ts";

const cut = `A landing da NAROQ ficou pronta.
<pilili_artifact type=website_spec title=Landing NAROQ>
{name:NAROQ,pages:[{path:/,purpose:Landing da loja}],copy:{hero:NAROQ. Roupa moderna com presenca.,cta:Falar no WhatsApp,about:Loja de roupa moderna em Luanda. Preto e dourado.},html:`;

describe("website preview", () => {
  it("builds a full page from a cut-off artefact and hides the tag", () => {
    const body = cut.slice(cut.indexOf("{"));
    const payload = ensureWebsitePayload({ raw: body });
    const html = String(payload.html ?? "");
    assert.equal(htmlReady(html), true);
    assert.match(html, /Falar no WhatsApp/);
    assert.match(html, /NAROQ/);
    const shown = formatAnswerText(cut);
    assert.equal(shown.includes("pilili"), false);
    assert.equal(shown.includes("html:"), false);
    assert.equal(shown.includes("<style"), false);
    assert.match(shown, /NAROQ ficou pronta/);
    const plain = landingHtml({ name: "Oficina", hero: "Serviço simples", about: "Preto e dourado.", cta: "Contactar" });
    assert.equal(plain.includes("#d4b07a"), false);
    assert.equal(plain.includes("#120f0c"), false);
    const asked = landingHtml({ name: "NAROQ", hero: "Roupa", about: "Peças novas.", cta: "Falar", ask: "Quero preto e dourado." });
    assert.match(asked, /#d4b07a|#16130f/);
    const branded = `<html><head><style>body{background:#120f0c;color:#f6f1e7}a{background:#d4b07a}</style></head><body><h1>Loja</h1></body></html>`;
    const neutral = styleWebsite(branded, "Quero uma landing page para a loja.", { image: "https://exemplo.test/hero.jpg" });
    assert.equal(neutral.includes("#d4b07a"), false);
    assert.equal(neutral.includes("#120f0c"), false);
    assert.match(neutral, /hero\.jpg/);
    assert.match(neutral, /object-fit:cover/);
    assert.match(neutral, /color:#1c1917/);
    assert.match(neutral, /background:#f6f3ee/);
    const withBox = styleWebsite(
      `<html><head><style>body{background:#fff;color:#fff}</style></head><body><h1>Loja</h1><div class="produto" style="height:180px"></div></body></html>`,
      "Quero uma loja de roupa.",
      { images: ["https://exemplo.test/hero.jpg", "https://exemplo.test/peca.jpg"] },
    );
    assert.match(withBox, /peca\.jpg/);
    assert.match(withBox, /hero\.jpg/);
    assert.equal(/<div\b[^>]*>\s*<\/div>/.test(withBox), false);
    assert.equal((withBox.match(/<img /g) ?? []).length, 2);
    assert.match(withBox, /background:#f6f3ee/);
    assert.match(withBox, /color:#1c1917/);
    assert.equal(userWantsSiteVideo("Quero uma loja de roupa."), false);
    assert.equal(userWantsSiteVideo("Quero uma loja com vídeo."), true);
    assert.equal(userWantsCustomImages("Quero uma loja de roupa."), false);
    assert.equal(userWantsCustomImages("Gera as fotos da loja."), true);
    const stock = stockImages("Loja de roupa em Talatona.");
    assert.ok(stock.length >= 2);
    assert.equal(new Set(stock).size, stock.length);
    assert.match(stock[0], /images\.unsplash\.com/);
    assert.notEqual(stock[0], stockImages("Site para a padaria.")[0]);
    const page = styleWebsite("<html><body><h1>NAROQ</h1><p>Roupa para o dia a dia.</p></body></html>", "Loja de roupa NAROQ em Talatona.", {});
    assert.match(page, /Contacto/);
    assert.match(page, /WhatsApp: a indicar/);
    assert.equal((page.match(/Talatona/g) ?? []).length, 1);
    assert.equal(page.includes("Talatona - Talatona"), false);
    assert.equal(page.includes("Camisa"), false);
    assert.equal(page.includes("O que encontras"), false);
    assert.equal(page.toLowerCase().includes("peça"), false);
    assert.equal(page.toLowerCase().includes("prova"), false);
    const written = styleWebsite(
      "<html><body><h1>Titulo velho</h1></body></html>",
      "Cria um site para a padaria.",
      {},
      {
        name: "Pao Quente",
        copy: { hero: "Pao do dia.", about: "Padaria de bairro.", cta: "Encomendar" },
        sections: [
          { heading: "O que ha hoje", text: "Pao, bolos e sumo." },
          { heading: "Horario", text: "Abre cedo." },
        ],
      },
    );
    assert.match(written, /Pao Quente/);
    assert.match(written, /O que ha hoje/);
    assert.match(written, /Abre cedo/);
    assert.match(written, /Encomendar/);
    assert.equal(written.includes("Camisa"), false);
    const once = landingHtml({
      name: "NAROQ",
      hero: "Roupa",
      about: "Loja de roupa moderna em Luanda.",
      cta: "Falar",
      ask: "Loja em Luanda",
    });
    assert.equal(once.includes("Luanda - Luanda"), false);
    assert.equal((once.match(/Luanda/g) ?? []).length, 1);
    const clothing = "Cria um site para a minha loja de roupa em Luanda";
    assert.equal(siteReply("Como se chama a loja? Qual é o WhatsApp?"), "O site profissional ficou pronto.");
    assert.equal(siteReply("Criei uma página simples."), "O site profissional ficou pronto.");
    const drafted = styleWebsite("", clothing, {}, draftSitePayload(clothing));
    assert.match(drafted, /Loja de roupa/);
    assert.match(drafted, /Contacto/);
    assert.match(drafted, /a indicar/);
    assert.equal(drafted.toLowerCase().includes("página"), false);
    assert.equal((drafted.match(/Luanda/g) ?? []).length, 1);
    assert.equal(resolveSiteTemplate("modelo do site: entregas. Quero transporte escolar"), "entregas");
    assert.equal(resolveSiteTemplate("modelo do site: restaurante"), "restaurante");
    assert.equal(userWantsPeople("Cria um site de transporte"), false);
    assert.match(siteHeroPrompt("Cria um site de transporte"), /Do not include any people/);
    const transport = styleWebsite(
      "",
      "modelo do site: entregas. Cria um site de transporte escolar",
      { image: "https://exemplo.test/transporte.jpg" },
      { name: "Rota", copy: { hero: "Chega a tempo.", about: "Transporte escolar.", cta: "Falar no WhatsApp" } },
    );
    assert.match(transport, /transporte\.jpg/);
    assert.match(transport, /Contacto/);
    assert.equal(transport.toLowerCase().includes("página"), false);
    const clinic = styleWebsite("", "modelo do site: servicos. Clínica de estética", { image: "https://exemplo.test/clinica.jpg" });
    assert.match(clinic, /clinica\.jpg/);
    assert.match(clinic, /#d4b07a|#111111/);
    assert.equal(continuesSite("Muda a cor e acrescenta este produto", true), true);
    assert.equal(continuesSite("Olá", true), false);
    assert.equal(continuesSite("Cria um site para a loja", false), true);
    const samplePage = "<html><body><h1>Loja</h1><a href=\"https://wa.me/244923000000\">WhatsApp</a><p style=\"color:#d4b07a\">Olá</p></body></html>";
    const started = performance.now();
    const edited = applySmallSiteEdit(samplePage, "Muda o WhatsApp para 923 111 222");
    const took = performance.now() - started;
    assert.match(edited || "", /wa\.me\/244923111222/);
    assert.equal(smallSiteEdit("Muda a cor para azul"), true);
    assert.equal(smallSiteEdit("Cria um site novo"), false);
    assert.ok(took < 50, `edição pequena demorou ${took.toFixed(2)} ms`);
    console.log(`small-edit-ms ${took.toFixed(2)}`);
  });
});
