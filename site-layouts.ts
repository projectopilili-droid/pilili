export type SiteTemplateId = "roupa" | "servicos" | "entregas" | "restaurante";

export type SiteBlock = { heading: string; text: string };

export type SiteLayoutInput = {
  template: SiteTemplateId;
  name: string;
  title: string;
  about: string;
  cta: string;
  phone: string;
  footer: string;
  sections: SiteBlock[];
  hero: string;
  photos: string[];
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  onAccent: string;
};

function esc(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function wa(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#contacto";
}

function svg(paths: string): string {
  return `<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg></span>`;
}

const Ico = {
  hanger: svg('<path d="M12 7a2 2 0 1 0-2-2"/><path d="M12 7v2l7 4v2H5v-2l7-4"/>'),
  shirt: svg('<path d="M8 6l4 2 4-2 4 3-2 2-2-1v9H8V10L6 11 4 9z"/>'),
  gem: svg('<path d="M7 8l5-3 5 3-5 12z"/><path d="M7 8h10"/>'),
  badge: svg('<circle cx="12" cy="9" r="4"/><path d="M8 13l-1 7 5-2 5 2-1-7"/>'),
  lotus: svg('<path d="M12 20c4-4 4-8 0-12-4 4-4 8 0 12z"/><path d="M12 20c-6-2-7-7-4-10 2 4 4 6 4 10z"/><path d="M12 20c6-2 7-7 4-10-2 4-4 6-4 10z"/>'),
  shield: svg('<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  face: svg('<circle cx="12" cy="12" r="8"/><path d="M9 10h.01M15 10h.01M9 15c1.2 1 4.8 1 6 0"/>'),
  drop: svg('<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>'),
  brush: svg('<path d="M14 4l6 6-8 8H6v-6z"/><path d="M4 20c2 0 3-1 3-2"/>'),
  scissors: svg('<circle cx="6" cy="7" r="2"/><circle cx="6" cy="17" r="2"/><path d="M8 8l12-4M8 16l12 4"/>'),
  box: svg('<path d="M3 8l9-4 9 4-9 4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/>'),
  bag: svg('<path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  pin: svg('<path d="M12 21s6-5 6-10a6 6 0 1 0-12 0c0 5 6 10 6 10z"/><circle cx="12" cy="11" r="2"/>'),
  chat: svg('<path d="M5 6h14v9H8l-3 3z"/>'),
  scooter: svg('<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M7 17h8l2-6H11"/><path d="M13 7h4"/>'),
  check: svg('<circle cx="12" cy="12" r="8"/><path d="M8 12l3 3 5-5"/>'),
  bowl: svg('<path d="M4 10h16a7 7 0 0 1-16 0z"/><path d="M8 6c1 2 3 2 4 0 1 2 3 2 4 0"/>'),
  leaf: svg('<path d="M5 15c6-1 10-6 12-12-6 2-11 6-12 12z"/><path d="M9 13c1-2 3-4 6-6"/>'),
  bike: svg('<circle cx="7" cy="16" r="3"/><circle cx="17" cy="16" r="3"/><path d="M7 16l4-7h4l2 4"/>'),
  wa: svg('<path d="M6 18l1-3a7 7 0 1 1 3 3z"/>'),
};

function contact(input: SiteLayoutInput): string {
  return `<section class="contact" id="contacto"><h2>Contacto</h2><p>WhatsApp: ${esc(input.phone || "a indicar")}</p><a class="cta" href="${esc(wa(input.phone))}">${Ico.wa}<span>${esc(input.cta)}</span></a></section>`;
}

function blocks(input: SiteLayoutInput, count: number): SiteBlock[] {
  const ready = input.sections.filter((item) => item.heading || item.text);
  const pad: SiteBlock[] = [
    { heading: "O essencial", text: "O detalhe que faltar fica a indicar." },
    { heading: "Como avançar", text: "Fala pelo WhatsApp. O número fica a indicar." },
    { heading: "O próximo passo", text: "Dizes o que precisas e recebes o passo seguinte." },
  ];
  const out = [...ready];
  for (const item of pad) {
    if (out.length >= count) break;
    out.push(item);
  }
  return out.slice(0, count);
}

function shell(input: SiteLayoutInput, extra: string, body: string): string {
  const css = `*{box-sizing:border-box}html,body{margin:0;background:${input.bg};color:${input.fg}}body{font-family:system-ui,sans-serif;overflow-x:hidden}img{display:block;width:100%;height:100%;object-fit:cover;object-position:center;background:#e7e2da}a{color:inherit;text-decoration:none}h1,h2,h3,p{margin:0}svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.ic{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:14px}.shot{overflow:hidden}.shot img{width:100%;height:100%}.cta{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:10px 16px;border-radius:999px;font-weight:700;font-size:13px}.contact{margin:8px 14px 0;padding:16px;border-radius:18px}footer{padding:18px 16px 28px;color:${input.muted};font-size:11px;letter-spacing:.08em;text-transform:uppercase;text-align:center}a:active{transform:translateY(1px)}${extra}`;
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(input.name)}</title><style>${css}</style></head><body>${body}</body></html>`;
}

function roupa(input: SiteLayoutInput): string {
  const [intro, ...rest] = blocks(input, 4);
  const points = rest.slice(0, 3);
  const icons = [Ico.hanger, Ico.shirt, Ico.gem];
  const rack = input.photos[0] || input.hero;
  return shell(
    input,
    `.top{display:flex;align-items:center;justify-content:space-between;padding:14px 16px}.mark{font-family:Georgia,serif;font-size:26px;line-height:1}.brand small{display:block;letter-spacing:.18em;font-size:9px;color:${input.muted}}.menu{width:22px;height:14px;border-top:2px solid ${input.fg};border-bottom:2px solid ${input.fg};position:relative}.menu:before{content:"";position:absolute;left:0;right:0;top:4px;border-top:2px solid ${input.fg}}.hero{display:grid;grid-template-columns:1.05fr .9fr;gap:8px;align-items:end;padding:4px 14px 18px;min-height:280px}.hero h1{font-family:Georgia,serif;font-size:30px;line-height:.96;font-weight:500}.hero .about{margin-top:10px;color:${input.muted};font-size:13px;line-height:1.4}.wa{margin-top:14px;background:#fff;color:#1c1917;box-shadow:0 0 0 1px rgba(28,25,23,.08)}.hero .shot{height:270px;border-radius:18px}.panel{padding:8px 18px 18px;text-align:center}.kicker{letter-spacing:.16em;font-size:11px;color:${input.muted}}.panel h2{font-family:Georgia,serif;font-size:24px;line-height:1.15;font-weight:500;margin:8px auto;max-width:22ch}.panel .lead{color:${input.muted};font-size:14px;line-height:1.45}.rack{height:168px;border-radius:16px;margin-top:14px}.cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:0 12px 16px}.cols article{text-align:center;padding:8px 4px}.cols h3{font-size:11px;letter-spacing:.04em;margin:8px 0 4px}.cols p{font-size:11px;line-height:1.35;color:${input.muted}}.band{display:flex;align-items:center;gap:10px;margin:0 12px 8px;background:#1c1917;color:#f6f3ee;border-radius:16px;padding:14px}.nav{display:grid;grid-template-columns:repeat(3,1fr);padding:8px 12px 0;text-align:center;font-size:13px}.contact{background:#fff}`,
    `<header class="top"><div class="brand"><div class="mark">${esc(input.name.slice(0, 1) || "M")}</div><small>${esc(input.name)}</small></div><span class="menu"></span></header>
<section class="hero"><div><h1>${esc(input.title)}</h1><p class="about">${esc(input.about)}</p><a class="wa cta" href="${esc(wa(input.phone))}">${Ico.wa}<span>${esc(input.cta)}</span></a></div><figure class="shot"><img src="${esc(input.hero)}" alt=""></figure></section>
<section class="panel"><p class="kicker">${esc(intro.heading)}</p><h2>${esc(intro.text)}</h2><figure class="shot rack"><img src="${esc(rack)}" alt=""></figure></section>
<section class="cols">${points
      .map((item, index) => `<article>${icons[index] || Ico.gem}<h3>${esc(item.heading)}</h3><p>${esc(item.text)}</p></article>`)
      .join("")}</section>
<section class="band">${Ico.pin}<div><strong>${esc(input.name)}</strong><p>Feito para este negócio.</p></div></section>
<nav class="nav"><a href="#topo">Início</a><a href="#colecao">Coleção</a><a href="#contacto">Sobre</a></nav>
${contact(input)}
<footer><p>${esc(input.footer)}</p></footer>`,
  );
}

function servicos(input: SiteLayoutInput): string {
  const items = blocks(input, 6);
  const trust = items.slice(0, 3);
  const services = items.slice(3, 6);
  const trustIcons = [Ico.badge, Ico.lotus, Ico.shield];
  const serviceIcons = [Ico.face, Ico.drop, Ico.brush];
  return shell(
    input,
    `body{background:#111111;color:#f6f1e6}.top{display:flex;align-items:center;justify-content:space-between;padding:16px;letter-spacing:.2em;font-size:12px}.hero{display:grid;grid-template-columns:1.05fr .9fr;gap:10px;align-items:end;padding:4px 14px 20px}.hero h1{font-family:Georgia,serif;font-size:32px;line-height:.95;font-weight:500}.rule{width:64px;height:2px;border:0;background:#d4b07a;margin:12px 0}.hero .about{color:#d9cbb6;font-size:13px;line-height:1.4}.wa{margin-top:14px;background:#fff;color:#1c1917}.hero .shot{height:280px;border-radius:12px 12px 0 0}.trust{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:#0c0c0c}.trust article{padding:14px 8px;text-align:center;border-left:1px solid rgba(212,176,122,.25)}.trust h3{color:#d4b07a;font-size:12px;margin:8px 0 4px}.trust p{color:#d9cbb6;font-size:11px;line-height:1.35}.services{padding:22px 14px;text-align:center}.services .k{letter-spacing:.18em;color:#d4b07a;font-size:11px}.services h2{font-family:Georgia,serif;font-size:26px;font-weight:500;margin:8px 0 14px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.grid article{border:1px solid rgba(212,176,122,.45);border-radius:16px;padding:14px 10px}.grid h3{margin:8px 0 4px;font-size:15px}.grid p{color:#d9cbb6;font-size:12px;line-height:1.35}.book{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:16px 14px 0;padding:14px;border:1px solid rgba(212,176,122,.45);border-radius:18px}.book a{border:1px solid #d4b07a;border-radius:999px;padding:10px 14px;color:#f6f1e6}.contact{background:#161616;color:#f6f1e6}.contact .cta{background:#d4b07a;color:#1c1917}`,
    `<header class="top"><span>${esc(input.name)}</span><span class="menu"></span></header>
<section class="hero"><div><h1>${esc(input.title)}</h1><hr class="rule"><p class="about">${esc(input.about)}</p><a class="wa cta" href="${esc(wa(input.phone))}">${Ico.wa}<span>${esc(input.cta)}</span></a></div><figure class="shot"><img src="${esc(input.hero)}" alt=""></figure></section>
<section class="trust">${trust.map((item, index) => `<article>${trustIcons[index] || Ico.shield}<h3>${esc(item.heading)}</h3><p>${esc(item.text)}</p></article>`).join("")}</section>
<section class="services"><p class="k">Serviços</p><h2>O que podes marcar</h2><div class="grid">${services
      .map((item, index) => `<article>${serviceIcons[index] || Ico.scissors}<h3>${esc(item.heading)}</h3><p>${esc(item.text)}</p></article>`)
      .join("")}</div></section>
<section class="book">${Ico.check}<div><strong>Marca a consulta</strong><p>Escolhe o dia pelo WhatsApp.</p></div><a href="${esc(wa(input.phone))}">Marcar agora</a></section>
${contact(input)}
<footer><p>${esc(input.footer)}</p></footer>`,
  );
}

function entregas(input: SiteLayoutInput): string {
  const items = blocks(input, 3);
  const icons = [Ico.box, Ico.bag, Ico.pin];
  const steps = [
    { icon: Ico.chat, heading: "Pede", text: "Falas no WhatsApp e dizes o que precisas." },
    { icon: Ico.box, heading: "Confirmamos", text: "Confirmamos o detalhe e o valor. Se faltar, fica a indicar." },
    { icon: Ico.scooter, heading: "Seguimos", text: "O percurso fica claro até ao destino." },
    { icon: Ico.check, heading: "Concluído", text: "Recebes a confirmação quando termina." },
  ];
  return shell(
    input,
    `.top{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;font-weight:800}.pin{color:${input.accent}}.hero{display:grid;grid-template-columns:1.08fr .92fr;gap:8px;align-items:center;padding:4px 14px 16px}.hero h1{font-family:Georgia,serif;font-size:32px;line-height:.92;font-weight:700}.rule{width:56px;height:3px;border:0;background:${input.accent};margin:10px 0}.hero .about{color:${input.muted};font-size:13px;line-height:1.4}.wa{margin-top:12px;background:transparent;color:${input.accent};box-shadow:inset 0 0 0 1.5px ${input.accent}}.hero .shot{height:250px;border-radius:0 0 36px 36px}.block{padding:6px 14px 8px}.block h2{font-size:22px;margin-bottom:10px}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.cards article{background:#fff;border-radius:16px;padding:10px 8px;text-align:center;box-shadow:0 0 0 1px rgba(28,25,23,.08)}.cards h3{font-size:13px;margin:6px 0 4px}.cards p{font-size:11px;line-height:1.35;color:${input.muted}}.steps{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 14px}.steps article{background:#fff;border-radius:16px;padding:12px;box-shadow:0 0 0 1px rgba(28,25,23,.08)}.steps h3{margin:8px 0 4px;font-size:14px}.steps p{font-size:12px;line-height:1.35;color:${input.muted}}.trust{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 14px;padding:14px;border-radius:16px;background:#f3f7f4}.contact{background:#fff}`,
    `<header class="top"><span class="pin">${Ico.pin}</span><strong>${esc(input.name)}</strong><span class="menu"></span></header>
<section class="hero"><div><h1>${esc(input.title)}</h1><hr class="rule"><p class="about">${esc(input.about)}</p><a class="wa cta" href="${esc(wa(input.phone))}">${Ico.wa}<span>${esc(input.cta)}</span></a></div><figure class="shot"><img src="${esc(input.hero)}" alt=""></figure></section>
<section class="block"><h2>O que tratamos</h2><div class="cards">${items
      .map((item, index) => `<article>${icons[index] || Ico.box}<h3>${esc(item.heading)}</h3><p>${esc(item.text)}</p></article>`)
      .join("")}</div></section>
<section class="steps">${steps.map((item, index) => `<article>${item.icon}<h3>${index + 1}. ${esc(item.heading)}</h3><p>${esc(item.text)}</p></article>`).join("")}</section>
<section class="trust">${Ico.shield}<div><strong>Fiável. Rápido. Local.</strong><p>O parceiro deste serviço.</p></div></section>
${contact(input)}
<footer><p>${esc(input.footer)}</p></footer>`,
  );
}

function restaurante(input: SiteLayoutInput): string {
  const dishes = blocks(input, 3);
  const steps = blocks(input, 3);
  const stepIcons = [Ico.chat, Ico.bowl, Ico.pin];
  return shell(
    input,
    `body{background:#f6f3ee}.top{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;letter-spacing:.16em;font-size:13px}.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:8px;align-items:center;padding:4px 14px 12px}.hero h1{font-family:Georgia,serif;font-size:30px;line-height:.98;font-weight:500}.hero .about{margin-top:8px;color:${input.muted};font-size:13px;line-height:1.4}.wa{margin-top:12px;background:#2a2118;color:#fff}.hero .shot{height:210px;border-radius:120px 120px 24px 24px}.note{display:flex;align-items:center;gap:6px;color:${input.muted};font-size:12px;padding:0 16px 8px}.menu{margin:8px 12px;background:#fff;border-radius:22px;padding:14px;box-shadow:0 8px 24px rgba(42,33,24,.06)}.menu .k{display:flex;align-items:center;gap:6px;letter-spacing:.14em;font-size:11px;color:${input.muted}}.menu h2{font-family:Georgia,serif;font-size:24px;font-weight:500;margin:6px 0 12px}.dishes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.dishes article{min-width:0}.dishes .shot{height:92px;border-radius:14px}.dishes h3{font-size:13px;margin:8px 0 4px}.dishes p{font-size:11px;line-height:1.35;color:${input.muted}}.steps{display:grid;grid-template-columns:1fr;gap:8px;padding:4px 14px 8px}.steps article{display:grid;grid-template-columns:42px 1fr;gap:8px;align-items:center;background:#fff;border-radius:16px;padding:10px}.band{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 12px;background:#2a2118;color:#f6f3ee;border-radius:18px;padding:14px}.band a{border:1px solid #f6f3ee;border-radius:999px;padding:8px 12px;font-size:13px}.contact{background:#fff}`,
    `<header class="top">${Ico.bowl}<strong>${esc(input.name)}</strong><span class="menu"></span></header>
<section class="hero"><div><h1>${esc(input.title)}</h1><p class="about">${esc(input.about)}</p><a class="wa cta" href="${esc(wa(input.phone))}">${Ico.wa}<span>${esc(input.cta)}</span></a></div><figure class="shot"><img src="${esc(input.hero)}" alt=""></figure></section>
<p class="note">${Ico.bike}<span>Pedido confirmado pelo WhatsApp.</span></p>
<section class="menu"><p class="k">${Ico.leaf}<span>Destaques</span></p><h2>O que podes pedir</h2><div class="dishes">${dishes
      .map((item, index) => {
        const photo = input.photos[index] || input.hero;
        return `<article><figure class="shot"><img src="${esc(photo)}" alt=""></figure><h3>${esc(item.heading)}</h3><p>${esc(item.text)}</p></article>`;
      })
      .join("")}</div></section>
<section class="steps">${steps
      .map((item, index) => `<article>${stepIcons[index] || Ico.pin}<div><h3>${index + 1}. ${esc(item.heading)}</h3><p>${esc(item.text)}</p></div></article>`)
      .join("")}</section>
<section class="band">${Ico.bike}<div><strong>Entrega combinada</strong><p>Horário e zona ficam a indicar se não os deres.</p></div><a href="${esc(wa(input.phone))}">Zonas</a></section>
${contact(input)}
<footer><p>${esc(input.footer)}</p></footer>`,
  );
}

export function renderTemplate(input: SiteLayoutInput): string {
  if (input.template === "roupa") return roupa(input);
  if (input.template === "servicos") return servicos(input);
  if (input.template === "restaurante") return restaurante(input);
  return entregas(input);
}
