import type { PowerId } from "./types";

export type PowerDef = {
  id: PowerId;
  name: string;
  tagline: string;
  promise: string;
  kicker: string;
  image: string;
  gallery: string[];
  examples: string[];
  starters: string[];
  deliverables: string[];
  workflow: string[];
  outputs: string[];
};

export const POWERS: PowerDef[] = [
  {
    id: "vida",
    name: "Vida",
    tagline: "Põe a tua vida em ordem. Avança com clareza.",
    promise:
      "O PILILÍ ajuda-te a organizar as ideias, definir prioridades e transformar o que te preocupa em passos concretos.",
    kicker: "Menos confusão. Mais clareza. Um passo de cada vez.",
    image: "/powers/vida.png",
    gallery: ["/powers/vida.png"],
    examples: [
      "Organiza o fim-de-semana da família",
      "Prepara a lista do supermercado e o orçamento",
      "Ajuda-me a decidir entre duas casas para arrendar",
    ],
    starters: [
      "Preciso de organizar a semana: trabalho, filhos e um jantar no sábado.",
      "Vou viajar este mês. Ajuda-me a planear o percurso, o orçamento e o que levar.",
    ],
    deliverables: [
      "Organizar o teu tempo",
      "Gerir despesas em kwanzas (Kz)",
      "Tomar decisões com clareza",
      "Definir prioridades",
      "Transformar objectivos em passos concretos",
    ],
    workflow: [
      "Percebemos o que precisas de organizar",
      "Definimos o que é mais importante",
      "Criamos um plano com os próximos passos",
    ],
    outputs: ["checklist", "table", "note"],
  },
  {
    id: "negocio",
    name: "Negócio",
    tagline: "Da ideia ao negócio, passo a passo.",
    promise:
      "Cria o negócio e a marca, elabora propostas e planos, prepara marketing, vendas, orçamentos, catálogos, apresentações e o lançamento.",
    kicker: "Da ideia à proposta, ao catálogo e ao plano de lançamento.",
    image: "/powers/negocio.jpg",
    gallery: ["/powers/negocio.jpg"],
    examples: [
      "Quero criar um negócio e a marca",
      "Preciso de uma proposta e de um catálogo",
      "Quero planear o lançamento e as vendas",
    ],
    starters: [
      "Quero criar um negócio e a marca. Ajuda-me com o plano, a proposta e o lançamento.",
      "Prepara um catálogo, um orçamento comercial e uma apresentação para clientes.",
    ],
    deliverables: [
      "Negócio e marca",
      "Proposta e plano de negócio",
      "Marketing e vendas",
      "Orçamento e catálogo",
      "Apresentação e lançamento",
    ],
    workflow: [
      "Conta o que queres criar ou desenvolver.",
      "O PILILÍ organiza a ideia, a oferta e o plano.",
      "Revê o resultado e continua a construir.",
    ],
    outputs: ["brand_kit", "campaign", "image", "proposal"],
  },
  {
    id: "emprego",
    name: "Emprego",
    tagline: "Do teu perfil à próxima oportunidade.",
    promise: "Prepara o teu CV, encontra oportunidades e chega à entrevista com confiança.",
    kicker: "Chegas à entrevista preparado.",
    image: "/powers/emprego.jpg",
    gallery: ["/powers/emprego.jpg"],
    examples: [
      "Preciso de um CV para esta vaga",
      "Prepara-me para a entrevista",
      "Adapta o meu perfil ao anúncio",
    ],
    starters: [
      "Preciso de um CV para uma vaga de comercial. Experiência em vendas.",
      "Ajuda-me a escrever a carta para esta vaga.",
    ],
    deliverables: [
      "CV adaptado à vaga",
      "Carta de candidatura",
      "Preparação para entrevistas",
      "Perfil profissional",
      "Estratégia de procura de emprego",
    ],
    workflow: [
      "Conta ao PILILÍ o que procuras.",
      "O PILILÍ prepara uma solução adaptada ao teu perfil.",
      "Revê, ajusta e prepara-te para avançar.",
    ],
    outputs: ["cv_package", "checklist"],
  },
  {
    id: "estuda",
    name: "Estuda",
    tagline: "Aprende, pratica e prepara-te para alcançar os teus objectivos.",
    promise: "Explicações, exercícios, resumos e planos de estudo para aprenderes com método.",
    kicker: "Línguas, escola, universidade, tecnologia, carreira, negócios e desenvolvimento pessoal.",
    image: "/powers/estuda.jpg",
    gallery: ["/powers/estuda.jpg"],
    examples: [
      "Explica-me este assunto de forma simples",
      "Faz um plano de estudo para o meu exame",
      "Cria exercícios e um resumo para eu rever",
    ],
    starters: [
      "Quero aprender este tema. Explica, faz um plano e dá-me exercícios com soluções.",
      "Prepara-me para o exame com resumo, prática e o que devo rever.",
    ],
    deliverables: ["Explicações claras", "Planos de estudo", "Exercícios com soluções", "Resumos"],
    workflow: ["Perceber o que queres aprender", "Explicar de forma simples", "Praticar com exercícios", "Rever com um resumo"],
    outputs: ["study_pack", "checklist"],
  },
  {
    id: "burocracia",
    name: "Burocracia",
    tagline: "Menos complicação. Mais orientação.",
    promise: "Percebe documentos, requisitos e procedimentos para saberes quais são os próximos passos.",
    kicker: "Procedimentos e documentos, passo a passo.",
    image: "/powers/burocracia.jpg",
    gallery: ["/powers/burocracia.jpg"],
    examples: [
      "O que preciso para abrir actividade",
      "Não percebo este documento da AGT",
      "Checklist para renovar documentos",
    ],
    starters: [
      "Quero perceber o que preciso para abrir uma actividade. Faz uma checklist e diz o que confirmar na entidade.",
      "Não percebo este documento. Explica-me em linguagem simples.",
    ],
    deliverables: ["Explicação simples", "Checklist do que levar", "O que falta", "Fontes para confirmar"],
    workflow: ["Ler o pedido", "Pesquisar o que for actual", "Organizar", "Avisar incertezas"],
    outputs: ["checklist", "document_insight"],
  },
  {
    id: "entende",
    name: "Entende",
    tagline: "Compreende a informação sem complicações.",
    promise:
      "Interpreta documentos, resume informação, traduz conteúdos e esclarece assuntos complexos em linguagem simples.",
    kicker: "Texto, imagem e o que precisares de perceber.",
    image: "/powers/entende.jpg",
    gallery: ["/powers/entende.jpg"],
    examples: [
      "Explica-me este documento em linguagem simples",
      "Resume esta informação e diz o que importa",
      "Traduz este texto e esclarece o que não ficou claro",
    ],
    starters: [
      "Explica este texto: o que significa, o que importa e o que devo fazer a seguir.",
      "Resume esta informação e destaca prazos, valores e pontos por confirmar.",
    ],
    deliverables: ["Explicação simples", "Resumo do que importa", "Tradução clara", "Próximo passo"],
    workflow: ["Ler o que enviaste", "Identificar o essencial", "Explicar em português simples", "Indicar o que confirmar"],
    outputs: ["document_insight", "checklist", "table"],
  },
  {
    id: "estudio",
    name: "Estúdio Criativo",
    tagline: "As tuas ideias merecem ganhar vida.",
    promise: "Transforma as tuas ideias em imagens, vídeos curtos, voz e música.",
    kicker: "Cria imagens, vídeos curtos e conteúdo em voz.",
    image: "/powers/estudio.jpg",
    gallery: ["/powers/estudio.jpg", "/powers/estudio-film.jpg"],
    examples: [
      "Cria a marca toda",
      "Cria uma campanha para a minha loja",
      "Logo, cores e voz da marca",
    ],
    starters: [
      "Cria uma campanha completa para a minha loja de roupa.",
      "Cria a identidade visual de uma marca nova: paleta, direcção de logo e voz.",
    ],
    deliverables: ["Direcção criativa", "Logo / visual", "Campanha e legendas", "Calendário de conteúdos"],
    workflow: ["Perceber a marca", "Criar a identidade", "Gerar o visual", "Empacotar a campanha"],
    outputs: ["brand_kit", "campaign", "image", "video"],
  },
  {
    id: "digital",
    name: "DIGITAL",
    tagline: "O teu negócio merece uma presença digital à altura.",
    promise:
      "Cria e melhora websites, lojas online, catálogos, landing pages, páginas de serviços, conteúdos, estratégia e a apresentação digital do teu negócio.",
    kicker: "Uma presença digital prática, clara e pronta a usar no teu negócio.",
    image: "/powers/digital.jpg",
    gallery: ["/powers/digital.jpg"],
    examples: [
      "Quero um website profissional para o meu negócio",
      "Quero uma loja online com catálogo e preços",
      "Quero melhorar o website e os conteúdos que já tenho",
    ],
    starters: [
      "Quero um website profissional com serviços, contactos e uma chamada para o WhatsApp.",
      "Prepara a loja online, o catálogo e os textos para apresentar os meus produtos.",
    ],
    deliverables: ["Website profissional", "Loja, catálogo e landing page", "Conteúdos e estratégia", "Melhoria de páginas"],
    workflow: ["Perceber o negócio", "Escolher a solução digital", "Escrever a estrutura e os textos", "Entregar o projecto preparado"],
    outputs: ["website_spec", "campaign"],
  },
  {
    id: "constroi",
    name: "Constrói",
    tagline: "Da ideia ao projecto. Com visão e planeamento.",
    promise: "O PILILÍ ajuda-te a estruturar o conceito, organizar os recursos e estimar custos.",
    kicker: "",
    image: "/powers/constroi.jpg",
    gallery: ["/powers/constroi.jpg", "/powers/constroi-concept.jpg"],
    examples: [
      "Quero planear uma casa",
      "Quero organizar um edifício de apartamentos",
      "Quero uma estimativa preliminar para um espaço comercial",
    ],
    starters: [
      "Quero planear uma casa. Organiza as necessidades, os espaços e uma estimativa preliminar.",
      "Tenho um terreno para um edifício comercial. Prepara o conceito e as fases, sem orçamento definitivo.",
    ],
    deliverables: [
      "Necessidades do projecto",
      "Organização dos espaços",
      "Planeamento das fases",
      "Estimativa de custos em kwanzas (Kz)",
      "Próximos passos",
    ],
    workflow: [
      "Percebemos o que pretendes construir",
      "Organizamos as necessidades",
      "Planeamos as fases e estimamos os custos",
    ],
    outputs: ["build_plan", "image", "checklist"],
  },
  {
    id: "agri",
    name: "Agri",
    tagline: "Da preparação da terra à comercialização da produção.",
    promise: "O PILILÍ ajuda-te a organizar a actividade agrícola, controlar custos e planear a venda.",
    kicker: "",
    image: "/powers/agri.jpg",
    gallery: ["/powers/agri.jpg"],
    examples: [
      "Quero organizar a lavra de milho",
      "Quero planear mandioca numa fazenda",
      "Como escoar e vender a produção?",
    ],
    starters: [
      "Tenho uma lavra e quero plantar milho. Organiza o calendário, os recursos e os custos estimados.",
      "Quero mandioca e um plano de escoamento para o mercado local.",
    ],
    deliverables: [
      "Calendário agrícola",
      "Planeamento de recursos",
      "Custos estimados em kwanzas (Kz)",
      "Organização das tarefas",
      "Planeamento da colheita e da venda",
    ],
    workflow: [
      "Percebemos a cultura e os objectivos",
      "Organizamos o ciclo e as tarefas",
      "Preparamos recursos, custos e a comercialização",
    ],
    outputs: ["agri_plan", "table", "checklist"],
  },
  {
    id: "executar",
    name: "Executar agora",
    tagline: "Tens um objectivo? Vamos transformá-lo em acção.",
    promise: "O PILILÍ ajuda-te a definir prioridades, organizar o trabalho e criar planos de acção.",
    kicker: "",
    image: "/powers/executar.jpg",
    gallery: ["/powers/executar.jpg", "/powers/credits.jpg", "/powers/voice.jpg"],
    examples: [
      "Organiza as tarefas de hoje por prioridade",
      "Transforma este objectivo numa lista de execução",
      "Estrutura este documento para eu avançar",
    ],
    starters: [
      "Organiza esta tarefa: prioridades, lista de execução e o próximo passo.",
      "Transforma este objectivo num documento claro, com passos concretos.",
    ],
    deliverables: ["Prioridades", "Lista de execução", "Plano de acção", "Documento estruturado", "Próximo passo"],
    workflow: ["Percebemos o resultado que queres", "Definimos as prioridades", "Preparamos as tarefas e o plano"],
    outputs: ["proposal", "presentation", "note"],
  },
  {
    id: "dj",
    name: "DJ PILILÍ",
    tagline: "O teu DJ. A tua música. A tua vibe.",
    promise: "Define a ocasião, escolhe a vibe e organiza uma sessão musical com princípio, intensidade e final.",
    kicker: "A sessão, o arco e a música.",
    image: "/powers/dj.jpg",
    gallery: ["/powers/dj.jpg", "/powers/dj-deck.jpg"],
    examples: [
      "Festa para 30 pessoas, Kizomba, Semba e Amapiano",
      "Música para um aniversário",
      "Vibe de domingo, calma e elegante",
    ],
    starters: [
      "Tenho uma festa para 30 pessoas. Começa às 20h. Quero Kizomba, Semba e Amapiano.",
      "Quero uma linha musical para um aniversário. Romântica, kuduro suave no fim.",
    ],
    deliverables: ["Arco da sessão", "Géneros e energia", "Referências", "Controlos da sessão"],
    workflow: ["Perceber a ocasião.", "Desenhar o arco musical.", "Escolher as referências.", "Apresentar a sessão."],
    outputs: ["dj_set"],
  },
  {
    id: "prof",
    name: "PROF",
    tagline: "Organiza o trabalho dos professores. Menos papel, mais clareza.",
    promise: "Tira fotos de listas, cadernos ou papéis. O PILILÍ organiza os nomes, notas e dados num documento limpo em PDF.",
    kicker: "",
    image: "/powers/prof-hero.jpg",
    gallery: ["/powers/prof-hero.jpg"],
    examples: [
      "Organiza esta lista de alunos a partir da fotografia.",
      "Passa estas notas para um documento limpo.",
    ],
    starters: ["Organiza os nomes e as notas que estão nestas fotografias."],
    deliverables: ["Lista de alunos", "Notas e avaliações", "Relatórios de turma", "Dados administrativos"],
    workflow: [
      "Tiras fotos dos documentos",
      "O PILILÍ lê e organiza a informação",
      "Recebes um PDF limpo e estruturado",
    ],
    outputs: ["proposal", "table", "checklist"],
  },
  {
    id: "investiga",
    name: "Investiga",
    tagline: "Investigação profunda. Clareza e solução.",
    promise:
      "Ajuda doutores, médicos, cientistas, químicos e investigadores a analisar problemas complexos, cruzar informação e chegar a respostas claras e fundamentadas.",
    kicker: "",
    image: "/powers/investiga-hero.jpg",
    gallery: ["/powers/investiga-hero.jpg"],
    examples: [
      "Analisa este problema e mostra as opções.",
      "Cruza estas fontes e diz o que fica por confirmar.",
    ],
    starters: ["Explica este problema, cruza a informação e prepara os próximos passos."],
    deliverables: [
      "Análise do problema",
      "Cruzamento de fontes",
      "Opções e conclusão",
      "Proposta ou relatório",
      "Caminhos de solução",
    ],
    workflow: [
      "Explicas o problema ou a pergunta com clareza",
      "O PILILÍ pesquisa, analisa e cruza a informação disponível",
      "Recebes uma resposta estruturada, com opções, argumentos e próximos passos",
    ],
    outputs: ["proposal", "note", "table"],
  },
];

export const OUTPUT_LABELS: Record<string, string> = {
  brand_kit: "Identidade",
  cv_package: "Candidatura",
  agri_plan: "Plano da lavra",
  build_plan: "Conceito da obra",
  dj_set: "Sessão",
  campaign: "Campanha",
  website_spec: "Website",
  document_insight: "Leitura",
  study_pack: "Fichas",
  checklist: "Lista",
  table: "Tabela",
  image: "Imagem",
  video: "Vídeo",
  note: "Nota",
  proposal: "Proposta",
  presentation: "Apresentação",
};

export const SHORTCUTS: { label: string; text: string; power: PowerId }[] = [
  {
    label: "Abrir um negócio",
    text: "Quero organizar e lançar um negócio. Ajuda-me a posicionar, preços em Kz e os primeiros 14 dias.",
    power: "negocio",
  },
  {
    label: "Preciso de um CV",
    text: "Preciso de um CV para uma vaga de comercial. Experiência em vendas.",
    power: "emprego",
  },
  {
    label: "Organizar dinheiro",
    text: "Ajuda-me a organizar o dinheiro do mês: entradas, saídas e o que cortar, em Kz.",
    power: "vida",
  },
  {
    label: "Criar um website",
    text: "Quero um website para o meu negócio.",
    power: "digital",
  },
  {
    label: "Vender os meus produtos",
    text: "Cria uma campanha para vender os meus produtos: mensagem, peças e plano de 14 dias.",
    power: "estudio",
  },
  {
    label: "Explica-me este documento",
    text: "Vou enviar um documento. Explica-me o que importa e o que falta.",
    power: "entende",
  },
  {
    label: "Plano de estudo",
    text: "Quero um plano de estudo. Pergunta-me a matéria e o prazo e monta o plano.",
    power: "estuda",
  },
  {
    label: "Abrir uma empresa",
    text: "Quero perceber o que preciso para abrir uma actividade. Faz uma checklist e diz o que confirmar na entidade.",
    power: "burocracia",
  },
  {
    label: "Plano da lavra",
    text: "Tenho 2 hectares e quero plantar milho. Faz o plano da lavra.",
    power: "agri",
  },
  {
    label: "Casa de 4 quartos",
    text: "Tenho um terreno 30x40 e quero uma casa de 4 quartos. Faz o conceito preliminar.",
    power: "constroi",
  },
  {
    label: "Festa",
    text: "Tenho uma festa para 30 pessoas. Começa às 20h. Quero Kizomba, Semba e Amapiano.",
    power: "dj",
  },
];

export const POWER_BY_ID: Record<PowerId, PowerDef> = Object.fromEntries(
  POWERS.map((p) => [p.id, p]),
) as Record<PowerId, PowerDef>;

export const SPECIALISTS = [
  { id: "odonto", name: "PILILÍ Odonto", status: "A integração está a ser activada" },
  { id: "saude", name: "Saúde", status: "A integração está a ser activada" },
  { id: "direito", name: "Direito", status: "A integração está a ser activada" },
  { id: "contabilidade", name: "Contabilidade", status: "A integração está a ser activada" },
  { id: "engenharia", name: "Engenharia", status: "A integração está a ser activada" },
  { id: "arquitectura", name: "Arquitectura", status: "A integração está a ser activada" },
  { id: "educacao", name: "Educação", status: "A integração está a ser activada" },
  { id: "hotelaria", name: "Hotelaria", status: "A integração está a ser activada" },
  { id: "imobiliario", name: "Imobiliário", status: "A integração está a ser activada" },
  { id: "comercio", name: "Comércio", status: "A integração está a ser activada" },
] as const;
