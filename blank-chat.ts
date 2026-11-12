import { usePilili } from "@/lib/store";
import { uid } from "@/lib/utils";

export type StudyLang = "EN" | "ES" | "FR" | "AO";

const STUDY_NOTES: Record<StudyLang, string> = {
  EN: "Contexto fixo de toda esta conversa: o cartão aberto é Inglês. Mantém o inglês em todas as perguntas seguintes, até a pessoa sair desta conversa ou abrir outro cartão. Não é preciso reabrir o cartão. Se a pergunta for sobre uma palavra, expressão ou conceito, responde no contexto do inglês. Se o termo não existir em inglês, diz logo que não é uma palavra inglesa. Se for um nome próprio angolano, diz isso. Se houver equivalente útil em inglês, explica-o a seguir. Exemplo: Benvindo não é inglês; é um nome próprio usado em Angola. A saudação em inglês é welcome. Se fizer sentido, pergunta se a pessoa quer aprender isso em inglês. Não respondas como uma aula geral de português.",
  ES: "Contexto fixo de toda esta conversa: o cartão aberto é Espanhol. Mantém o espanhol em todas as perguntas seguintes, até a pessoa sair desta conversa ou abrir outro cartão. Não é preciso reabrir o cartão. Se a pergunta for sobre uma palavra, expressão ou conceito, responde no contexto do espanhol. Se o termo não existir em espanhol, diz logo que não é uma palavra espanhola. Se for um nome próprio angolano, diz isso. Se houver equivalente útil em espanhol, explica-o a seguir. Exemplo: Benvindo não é espanhol; é um nome próprio usado em Angola. A saudação em espanhol é bienvenido ou bienvenida. Se fizer sentido, pergunta se a pessoa quer aprender isso em espanhol.",
  FR: "Contexto fixo de toda esta conversa: o cartão aberto é Francês. Mantém o francês em todas as perguntas seguintes, até a pessoa sair desta conversa ou abrir outro cartão. Não é preciso reabrir o cartão. Se a pergunta for sobre uma palavra, expressão ou conceito, responde no contexto do francês. Se o termo não existir em francês, diz logo que não é uma palavra francesa. Se for um nome próprio angolano, diz isso. Se houver equivalente útil em francês, explica-o a seguir. Exemplo: Benvindo não é francês; é um nome próprio usado em Angola. A saudação em francês é bienvenue. Se fizer sentido, pergunta se a pessoa quer aprender isso em francês.",
  AO: "Contexto fixo de toda esta conversa: o cartão aberto é Português. Mantém o português de Angola em todas as perguntas seguintes, até a pessoa sair desta conversa ou abrir outro cartão. Não é preciso reabrir o cartão. Se a pergunta for sobre uma palavra, expressão ou conceito, responde nesse contexto. Distingue nome próprio e palavra comum. Se o termo for de outra língua, diz que não é português e, se fizer sentido, dá o equivalente em português.",
};

export function isStudyLang(value: string | null | undefined): value is StudyLang {
  return value === "EN" || value === "ES" || value === "FR" || value === "AO";
}

export function studyLanguageNote(lang: string | null | undefined): string | undefined {
  return isStudyLang(lang) ? STUDY_NOTES[lang] : undefined;
}

export function rememberStudyLanguage(id: string, lang: StudyLang) {
  try {
    localStorage.setItem(`pilili.lang.${id}`, lang);
  } catch {
    /* ignore */
  }
}

export function recallStudyLanguage(id: string): StudyLang | null {
  try {
    const value = localStorage.getItem(`pilili.lang.${id}`);
    return isStudyLang(value) ? value : null;
  } catch {
    return null;
  }
}

export type BlankChat = {
  power: string;
  placeholder: string;
  intro?: string;
  back?: boolean;
  context?: string;
  lang?: StudyLang;
};

export function saveBlankChat(id: string, blank: BlankChat) {
  try {
    sessionStorage.setItem(`pilili.blank.${id}`, JSON.stringify(blank));
  } catch {
    /* ignore */
  }
}

export function readBlankChat(id: string): BlankChat | null {
  try {
    const raw = sessionStorage.getItem(`pilili.blank.${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BlankChat;
    if (!parsed?.placeholder) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function startBlankChat(
  nav: (opts: { to: "/c/$id"; params: { id: string } }) => void,
  power: string,
  placeholder: string,
  intro?: string,
  back?: boolean,
  context?: string,
  lang?: StudyLang,
) {
  usePilili.getState().setDraft({ text: "", power });
  usePilili.getState().setAttachments([]);
  const id = uid();
  saveBlankChat(id, { power, placeholder, intro, back, context, lang });
  if (lang) rememberStudyLanguage(id, lang);
  nav({ to: "/c/$id", params: { id } });
}
