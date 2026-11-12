import type { PowerId } from "./types";

export const POWER_HONEST: Record<PowerId, { now: string; later: string }> = {
  vida: {
    now: "",
    later: "",
  },
  negocio: {
    now: "Prepara o negócio, a marca, a proposta, o plano, o catálogo, o orçamento e o lançamento.",
    later: "",
  },
  emprego: {
    now: "Agora: guarda o perfil na tua conta e prepara CV, carta e orientação de pesquisa.",
    later: "",
  },
  estuda: {
    now: "Explica, resume, cria exercícios e monta planos de estudo para línguas, escola, universidade, tecnologia, carreira, negócios e desenvolvimento pessoal.",
    later: "",
  },
  burocracia: {
    now: "Agora: explica procedimentos e lista documentos a partir do que se sabe.",
    later: "",
  },
  entende: {
    now: "Explica, resume e traduz o texto que partilhares. Uma fotografia também pode ser lida.",
    later: "",
  },
  estudio: {
    now: "Cria imagens, vídeos curtos e conteúdo em voz.",
    later: "",
  },
  digital: {
    now: "Prepara websites, lojas, catálogos, páginas, conteúdos e a melhoria do que já tens. O resultado é um projecto, não um site publicado.",
    later: "",
  },
  constroi: {
    now: "",
    later: "",
  },
  agri: {
    now: "",
    later: "",
  },
  executar: {
    now: "",
    later: "",
  },
  dj: {
    now: "Desenha o arco da sessão e abre a criação de música.",
    later: "",
  },
  prof: {
    now: "",
    later: "",
  },
  investiga: {
    now: "",
    later: "",
  },
};

export type PowerFace = {
  placeholder: string;
  ideas: string[];
  close: string;
  /** Lower suggestion chips repeat the guide. Keep the phrase, hide the chips. */
  hideIdeas?: boolean;
  hideSample: boolean;
  process?: string;
};

export const POWER_FACE: Partial<Record<PowerId, PowerFace>> = {
  digital: {
    placeholder: "O que queres criar ou melhorar no digital?",
    ideas: [
      "Quero um website profissional para apresentar a minha empresa.",
      "Quero uma loja online com catálogo, preços e categorias.",
      "Prepara conteúdos e uma estratégia digital para o meu negócio.",
      "Quero melhorar o website e a apresentação dos meus serviços.",
    ],
    close: "A tua ideia merece sair do papel.",
    hideIdeas: true,
    hideSample: true,
  },
  entende: {
    placeholder: "O que precisas de compreender?",
    ideas: [
      "Explica-me este documento em linguagem simples.",
      "Resume esta informação e destaca o que importa.",
      "Traduz este texto para português de Angola.",
      "Esclarece este assunto e diz o que devo confirmar.",
    ],
    close: "Menos confusão. Mais clareza. Mais compreensão.",
    hideSample: true,
  },
  executar: {
    placeholder: "Explica o que pretendes alcançar e o prazo, se houver.",
    ideas: [
      "Organiza as tarefas que preciso de concluir hoje.",
      "Divide este projecto em etapas.",
      "Prepara um plano de acção para o meu objectivo.",
      "Tenho um prazo apertado. Organiza o meu trabalho.",
    ],
    close: "A TUA TAREFA. AS TUAS ACÇÕES. O TEU RESULTADO.",
    hideSample: true,
  },
  vida: {
    placeholder: "Descreve o que precisas de organizar ou decidir.",
    ideas: [
      "Ajuda-me a organizar a minha semana",
      "Quero definir as minhas prioridades para este mês",
      "Ajuda-me a organizar as despesas",
      "Tenho uma decisão importante para tomar",
    ],
    close: "A TUA VIDA. AS TUAS PRIORIDADES. O TEU PRÓXIMO PASSO.",
    hideSample: true,
  },
  burocracia: {
    placeholder: "Que documento ou procedimento precisas de resolver?",
    ideas: [
      "Ajuda-me a perceber os documentos necessários.",
      "Explica-me este procedimento passo a passo.",
      "Ajuda-me a preparar uma lista de documentos.",
      "Quero perceber como tratar deste processo.",
    ],
    close: "PERCEBE O PROCESSO. PREPARA OS DOCUMENTOS. AVANÇA COM CONFIANÇA.",
    hideSample: true,
  },
  estudio: {
    placeholder: "O que queres criar?",
    ideas: [
      "Cria uma imagem de um conceito visual simples.",
      "Cria a imagem de um cartaz.",
      "Cria uma imagem de um logo simples.",
      "Cria uma imagem quadrada para uma publicação.",
    ],
    close: "A TUA IDEIA. A TUA CRIATIVIDADE. A TUA ASSINATURA.",
    hideIdeas: true,
    hideSample: true,
  },
  constroi: {
    placeholder: "Descreve o projecto. Indica localização, dimensões e orçamento, se já tiveres.",
    ideas: [
      "Quero planear a construção da minha casa.",
      "Ajuda-me a estruturar um projecto de apartamentos.",
      "Tenho um terreno e quero avaliar os próximos passos.",
      "Prepara uma estimativa preliminar para a minha casa.",
    ],
    close: "A TUA IDEIA. O TEU PROJECTO. O PRÓXIMO PASSO.",
    hideSample: true,
  },
  agri: {
    placeholder: "Explica o que produzes, a área e os recursos disponíveis.",
    ideas: [
      "Organiza o calendário da minha lavra de milho.",
      "Ajuda-me a planear os custos da produção de mandioca.",
      "Prepara uma lista de insumos para a próxima campanha.",
      "Quero calcular uma estimativa dos custos da minha produção.",
    ],
    close: "A TUA PRODUÇÃO. A TUA ORGANIZAÇÃO. O TEU PRÓXIMO PASSO.",
    hideSample: true,
  },
  dj: {
    placeholder: "O que precisas no DJ PILILÍ?",
    ideas: [],
    close: "A FESTA TEM UM ARCO. NÃO É UMA LISTA SOLTA.",
    hideIdeas: true,
    hideSample: true,
    process: "Como funciona",
  },
};
