/** Chat completions accepts function or live_search, not web_search. Web search belongs on the responses API. */
export function inferenceRoute(search: boolean): {
  path: "/chat/completions" | "/responses";
  tools?: Array<{ type: "web_search" }>;
} {
  if (search) return { path: "/responses", tools: [{ type: "web_search" }] };
  return { path: "/chat/completions" };
}

/** Everyday plans stay on the normal stream. Only real current-fact requests search. */
export function messageNeedsSearch(text: string, power?: string | null): boolean {
  if (power === "burocracia" || power === "emprego") return true;
  return /preço|preco|taxa|lei|agt|minfin|inss|actual|atual|procedimento|visto|passaporte|multicaixa|unitel|emprego|vaga|mercado|regulament|alvará|alvara|sme|sepe/i.test(
    text,
  );
}
