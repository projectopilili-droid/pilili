import type { Artifact, PowerId } from "./types";

/** Labeled illustrative examples of the real artifact format. Never presented as live engine output. */
export const SAMPLE_BY_POWER: Record<PowerId, Artifact> = {
  vida: {
    id: "ex-vida",
    type: "checklist",
    title: "Fim-de-semana da família",
    payload: {
      title: "Sábado e domingo, sem drama",
      items: [
        { text: "Mercado e fruta da semana", group: "Sábado", done: false },
        { text: "Almoço em casa: peixe, funge, tomate, cebola, limão", group: "Sábado", done: false },
        { text: "Praia ou parque, volta antes do trânsito pesado", group: "Sábado", done: false },
        { text: "Visita à família e almoço", group: "Domingo", done: false },
        { text: "Comida e transporte: 45.000 Kz, só se este valor for teu", group: "Dinheiro", done: false, note: "Não inventar preços" },
        { text: "Reservar o gerador se faltar luz ao jantar", group: "Casa", done: false },
      ],
    },
  },
  negocio: {
    id: "ex-negocio",
    type: "brand_kit",
    title: "Loja de beleza: formato de marca",
    payload: {
      name: "A tua loja",
      tagline: "Beleza que chega. Sem fila.",
      positioning: "Loja de produtos de beleza que vende no WhatsApp com catálogo claro, preços em Kz e entrega no mesmo dia na zona combinada.",
      audience: "Mulheres dos 22 aos 40 que já compram por WhatsApp e querem confiança no produto.",
      voice: "Directa, calorosa, sem exagero de influencer. Tu falas como vizinha que percebe do assunto.",
      logoDirection: "Letra geométrica, ouro velho sobre carvão. Sem clipart, sem mapa de África.",
      typography: { display: "Syne", body: "Figtree" },
      palette: [
        { name: "Carvão", hex: "#3b3126" },
        { name: "Areia", hex: "#fff9f0" },
        { name: "Ouro", hex: "#ebc57a" },
        { name: "Vinho", hex: "#6b2d3c" },
      ],
      contentIdeas: [
        "Antes/depois honesto, com luz natural",
        "Preço em Kz no primeiro ecrã",
        "Stock da semana no estado do WhatsApp",
      ],
      launchPlan: [
        { day: "Dia 1", action: "Nome, cores, 6 fotos do catálogo" },
        { day: "Dia 4", action: "Catálogo WhatsApp + preços" },
        { day: "Dia 7", action: "10 clientes piloto na tua zona" },
        { day: "Dia 14", action: "Ajuste de stock e entrega" },
      ],
    },
  },
  emprego: {
    id: "ex-emprego",
    type: "cv_package",
    title: "CV · Comercial",
    payload: {
      role: "Comercial",
      profile:
        "Comercial com 6 anos a fechar contas. À vontade no terreno, no WhatsApp e na reunião. Números que se podem verificar, sem floreados.",
      experience: [
        {
          title: "Comercial sénior",
          org: "Distribuidora",
          dates: "2021 a presente",
          bullets: [
            "Carteira de 40 lojas",
            "Crescimento de encomendas mensais em 2024 (valores a confirmar consigo)",
            "Negociação com mercearias e salões, pagamento Multicaixa e transferência",
          ],
        },
        {
          title: "Comercial",
          org: "Retalho",
          dates: "2018 a 2021",
          bullets: ["Prospecção porta-a-porta", "Relatórios semanais para a gerência"],
        },
      ],
      education: ["12.ª classe", "Formação de vendas (certificado interno)"],
      skills: ["Negociação", "WhatsApp Business", "Excel básico", "Português"],
      coverLetter:
        "Candidato-me à vaga de comercial. Conheço o ritmo do terreno: trânsito, gerador, cliente que responde à noite. Chego com carteira, não com discurso.",
      interviewAngles: [
        "Peça um exemplo de cliente difícil e como fechou",
        "Pergunte como organiza o dia entre visitas e follow-up",
      ],
      gaps: ["Confirmar números exactos de vendas consigo antes de enviar"],
    },
  },
  estuda: {
    id: "ex-estuda",
    type: "study_pack",
    title: "Juros compostos em Kwanzas",
    payload: {
      topic: "Juros compostos",
      explanation:
        "Juro composto é juro sobre juro. Se pões 100.000 Kz a 10% ao ano, no segundo ano o juro já incide sobre 110.000 Kz, não só sobre os 100.000.",
      plan: [
        "Dia 1: perceber a fórmula",
        "Dia 2: 5 exercícios em Kz",
        "Dia 3: um problema de exame",
      ],
      exercises: [
        { q: "100.000 Kz a 10% ao ano, 2 anos. Qual o montante?", a: "121.000 Kz" },
        { q: "50.000 Kz a 8% ao ano, 3 anos. Qual o montante (sem arredondar no meio)?", a: "62.985,6 Kz" },
      ],
      summary: "Capital × (1 + taxa)^tempo. Em Angola pensa sempre em Kz, não em exemplos de euro.",
    },
  },
  burocracia: {
    id: "ex-burocracia",
    type: "checklist",
    title: "Abrir actividade: a confirmar",
    payload: {
      title: "O que costuma ser preciso (confirmar nas fontes oficiais)",
      items: [
        { text: "Identificar se é empresário em nome individual ou sociedade", done: false, note: "Muda o guião." },
        { text: "Reunir BI / passaporte e NIF", done: false },
        { text: "Confirmar o acto no Guiché Único / Ministério da tutoria actual", done: false, note: "Os nomes dos serviços mudam. Pesquisa hoje." },
        { text: "Perguntar na AGT o que vale para o teu caso", done: false },
        { text: "Não pagar a intermediários sem recibo", done: false },
      ],
    },
  },
  entende: {
    id: "ex-entende",
    type: "document_insight",
    title: "Leitura de uma factura",
    payload: {
      summary: "Factura de serviços com total em Kz, prazo de 8 dias e uma linha de IVA que convém confirmar.",
      keyPoints: ["Fornecedor identificado", "Total a pagar em Kwanzas", "Prazo curto"],
      amounts: ["Total: valor a ler do documento", "IVA: confirmar a taxa aplicável"],
      dates: ["Emissão", "Vencimento (+8 dias, se for o que o papel diz)"],
      actions: ["Confirmar o NIF", "Pagar por transferência ou Express e guardar o comprovativo"],
      uncertainties: ["A taxa de IVA e o regime do fornecedor só valem se estiverem no papel ou na AGT."],
    },
  },
  estudio: {
    id: "ex-estudio",
    type: "campaign",
    title: "Campanha · loja de roupa",
    payload: {
      objective: "Abrir a estação com 3 looks e uma oferta de 7 dias, sem fingir desconto inventado.",
      audience: "Mulheres 20–35, Instagram e WhatsApp.",
      channels: ["Instagram", "WhatsApp Status"],
      messages: [
        "Peça que aguenta o calor e o dia a dia.",
        "Preço em Kz no primeiro ecrã.",
        "Provador na loja. Entrega na zona combinada.",
      ],
      calendar: [
        { day: "Qui", asset: "Look 1: foto de rua", channel: "Instagram" },
        { day: "Sáb", asset: "Look 2: Reels 12s", channel: "Instagram" },
        { day: "Seg", asset: "Catálogo no WhatsApp", channel: "WhatsApp" },
      ],
      captions: [
        "Três looks. Preços em Kz. Provador esta semana.\nEnvia mensagem.",
      ],
    },
  },
  digital: {
    id: "ex-digital",
    type: "website_spec",
    title: "Website · negócio de beleza",
    payload: {
      name: "A tua loja",
      pages: [
        { path: "/", purpose: "Hero, 3 produtos, CTA WhatsApp" },
        { path: "/catalogo", purpose: "Lista com preço em Kz" },
        { path: "/contacto", purpose: "WhatsApp e zona de entrega" },
      ],
      copy: {
        hero: "Beleza que chega. Sem fila.",
        cta: "Falar no WhatsApp",
      },
      whatsappCta: "Falar no WhatsApp",
      html: `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>A tua loja</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#1a1713;color:#f8f2e8}main{padding:32px 20px;max-width:520px}p.k{letter-spacing:.2em;text-transform:uppercase;color:#d4b07a;font-size:11px}h1{font-size:32px;margin:8px 0 16px}a{display:inline-block;margin-top:16px;background:#d4b07a;color:#1a140c;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:600}</style></head><body><main><p class="k">Catálogo</p><h1>Beleza que chega. Sem fila.</h1><p>Catálogo em Kwanzas. Entrega na zona combinada.</p><a href="#">Falar no WhatsApp</a></main></body></html>`,
    },
  },
  constroi: {
    id: "ex-constroi",
    type: "build_plan",
    title: "Casa 4 quartos · terreno 30×40",
    payload: {
      site: "Local a indicar",
      plot: "30 × 40 m",
      concept: "Casa térrea com pátio central para sombra, sala virada ao fundo do lote, quartos a nascente. Conceito preliminar. Não é projecto de obra.",
      layoutNotes: "Acesso pela frente. Área de serviço e gerador no lado do muro. Estacionamento para 2 carros.",
      program: [
        { space: "Sala / jantar", areaM2: 42 },
        { space: "Cozinha", areaM2: 18 },
        { space: "4 quartos", areaM2: 64 },
        { space: "Pátio", areaM2: 28 },
      ],
      materials: ["Bloco", "Laje", "Chapa / telha a definir", "Caixilharia com sombra"],
      phases: [
        { name: "1. Fundação", tasks: "Sondagem, implante, sapatas" },
        { name: "2. Estrutura", tasks: "Paredes, laje, cobertura" },
        { name: "3. Acabamentos", tasks: "Reboco, piso, electricidade, água" },
      ],
      costBands: [
        { item: "Estrutura (faixa)", kzMin: 18000000, kzMax: 32000000 },
        { item: "Acabamentos (faixa)", kzMin: 12000000, kzMax: 25000000 },
      ],
      disclaimer: "Conceito preliminar. Não substitui arquitecto, engenheiro nem licenças. Faixas de custo são estimativa, não orçamento.",
    },
  },
  agri: {
    id: "ex-agri",
    type: "agri_plan",
    title: "Milho · 2 ha",
    payload: {
      location: "Província a indicar",
      hectares: 2,
      crop: "Milho",
      calendar: [
        { month: "Set–Out", tasks: "Preparar terra e sementeira (ajustar à chuva do ano)" },
        { month: "Nov–Jan", tasks: "Sachas, pragas, água se falhar a chuva" },
        { month: "Mar–Abr", tasks: "Colheita e secagem" },
      ],
      inputs: [
        { item: "Semente", qty: "a confirmar no agrónomo local", note: "Variedade adaptada à zona" },
        { item: "Adubo", qty: "estimativa a validar", note: "Não inventar dose" },
      ],
      costs: [
        { item: "Semente + preparo (faixa)", kz: "estimativa: confirmar preços locais" },
        { item: "Mão-de-obra", kz: "conforme o que pagas na zona" },
      ],
      production: { qty: "a estimar", unit: "", note: "Sem garantia de colheita. Depende da chuva e do trato." },
      market: ["Mercado local", "Intermediários: preço do dia, não o da conversa"],
      risks: ["Chuva irregular", "Transporte", "Preço na colheita"],
      disclaimer: "Números são estimativa. Não há garantia de colheita nem de preço.",
    },
  },
  executar: {
    id: "ex-executar",
    type: "presentation",
    title: "PILILÍ · formato de apresentação",
    payload: {
      title: "PILILÍ",
      subtitle: "Tu pedes. O PILILÍ executa.",
      slides: [
        {
          title: "O problema",
          bullets: [
            "Chatbots genéricos deixam o trabalho a meio.",
            "Ferramentas soltas. Prompts. Inglês.",
            "Em Angola, o que conta é a papa feita.",
          ],
        },
        {
          title: "O produto",
          bullets: [
            "Um produto. Doze Super Poderes.",
            "Marca, CV, casa, lavra, festa, website.",
            "Tu dizes o que precisas. O PILILÍ executa.",
          ],
        },
        {
          title: "Porquê agora",
          bullets: [
            "Telemóvel primeiro. WhatsApp. Kwanzas.",
            "Um fornecedor hoje. Vários motores no passo seguinte.",
            "Angola primeiro. PALOP a seguir, sem copiar o motor.",
          ],
        },
        {
          title: "O ensaio",
          bullets: [
            "Pagamentos: a integração está a ser activada.",
            "Especialistas com fonte verificada: a integração está a ser activada.",
            "O que está ligado entrega o resultado na conversa.",
          ],
        },
      ],
    },
  },
  dj: {
    id: "ex-dj",
    type: "dj_set",
    title: "Festa para 30 · Kizomba, Semba, Amapiano",
    payload: {
      occasion: "Festa em casa",
      audience: "30 pessoas, 25–40 anos",
      start: "20h",
      genres: ["Kizomba", "Semba", "Amapiano"],
      exclusions: ["Funk pesado", "Música que o anfitrião pedir para cortar"],
      arc: [
        { phase: "warm-up", minutes: 40, energy: 3, style: "Semba suave + Kizomba antiga", notes: "Chegada, copo, conversa.", references: ["Semba clássico", "Kizomba lenta"] },
        { phase: "peak", minutes: 70, energy: 8, style: "Kizomba + Amapiano", notes: "Pista cheia. Sobe sem partir o chão.", references: ["Kizomba contemporânea", "Amapiano dançável"] },
        { phase: "cool-down", minutes: 35, energy: 4, style: "Kizomba romântica", notes: "Últimos convites. Luz mais baixa.", references: ["Kizomba close"] },
      ],
      controls: ["Se a pista esvaziar, desce a energia. Não aumentes o volume.", "Um pedido do aniversariante entra já.", "O arco e as referências ficam nesta entrega."],
    },
  },
  prof: {
    id: "ex-prof",
    type: "proposal",
    title: "Lista da turma",
    payload: {
      title: "Lista da turma",
      sections: [{ heading: "Nomes", lines: ["A indicar a partir da fotografia. Não inventar alunos nem notas."] }],
    },
  },
  investiga: {
    id: "ex-investiga",
    type: "proposal",
    title: "Análise do problema",
    payload: {
      title: "Análise do problema",
      sections: [
        { heading: "O que se sabe", lines: ["Só o que foi indicado."] },
        { heading: "O que falta confirmar", lines: ["Fontes e dados em falta."] },
      ],
    },
  },
};
