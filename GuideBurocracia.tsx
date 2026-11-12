import { useMemo, useState } from "react";
import { BookOpen, Building2, Car, FileText, Search, Shield, Wallet, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Category = "todos" | "identidade" | "empresas" | "impostos" | "trabalho" | "veiculos";

type Service = {
  id: string;
  title: string;
  entity: string;
  category: Exclude<Category, "todos">;
  note: string;
  url: string;
};

const CATEGORIES: { id: Category; label: string; count?: string; image?: string; icon: typeof Shield }[] = [
  { id: "todos", label: "Todos", count: "Ver tudo", icon: Shield },
  { id: "identidade", label: "Identidade", count: "2 serviços", image: "/powers/burocracia.jpg", icon: FileText },
  { id: "empresas", label: "Empresas", count: "2 serviços", image: "/powers/burocracia.jpg", icon: Building2 },
  { id: "impostos", label: "Impostos", count: "3 serviços", image: "/powers/burocracia.jpg", icon: Wallet },
  { id: "trabalho", label: "Trabalho", count: "2 serviços", image: "/powers/emprego.jpg", icon: Briefcase },
  { id: "veiculos", label: "Veículos", count: "1 serviço", image: "/powers/constroi.jpg", icon: Car },
];

const SERVICES: Service[] = [
  {
    id: "bi",
    title: "Bilhete de Identidade (BI)",
    entity: "Conservatória do Registo Civil",
    category: "identidade",
    note: "Documentos, prazos e locais mudam. O PILILÍ organiza o que perguntar. Confirma sempre no serviço competente.",
    url: "https://www.sepe.gov.ao",
  },
  {
    id: "passaporte",
    title: "Passaporte",
    entity: "Serviços de Identificação e Migração",
    category: "identidade",
    note: "Requisitos e taxas oficiais só valem na entidade. Aqui fazes a checklist para não ires duas vezes.",
    url: "https://www.sepe.gov.ao",
  },
  {
    id: "alvara",
    title: "Licença Comercial / Alvará",
    entity: "Entidade competente conforme a actividade",
    category: "empresas",
    note: "O alvará depende do tipo de negócio. Não inventamos o licenciamento. Listamos o que costuma ser preciso e o que confirmar.",
    url: "https://www.sepe.gov.ao",
  },
  {
    id: "empresa",
    title: "Constituição de Empresa",
    entity: "Registo Comercial / Conservatória",
    category: "empresas",
    note: "Sociedade ou empresário em nome individual muda o guião. Confirma no Guiché Único e no serviço actual.",
    url: "https://www.gue.gov.ao",
  },
  {
    id: "nif",
    title: "Número de Identificação Fiscal (NIF)",
    entity: "Administração Geral Tributária",
    category: "impostos",
    note: "O NIF identifica o contribuinte. Passos e documentos: confirmar na AGT.",
    url: "https://agt.minfin.gov.ao",
  },
  {
    id: "ii",
    title: "Inscrição no Imposto Industrial",
    entity: "Administração Geral Tributária",
    category: "impostos",
    note: "Regime e prazos mudam. Pesquisa actual + confirmação na AGT.",
    url: "https://agt.minfin.gov.ao",
  },
  {
    id: "inss",
    title: "Inscrição na Segurança Social",
    entity: "Instituto Nacional de Segurança Social",
    category: "trabalho",
    note: "Inscrição de trabalhador ou entidade empregadora. Confirma no INSS.",
    url: "https://www.inss.gov.ao",
  },
  {
    id: "contrato",
    title: "Contrato de trabalho: o que levar",
    entity: "Ministério da tutoria / INSS conforme o caso",
    category: "trabalho",
    note: "Isto não é parecer jurídico. É uma leitura simples do que costuma constar e o que perguntar.",
    url: "https://www.sepe.gov.ao",
  },
  {
    id: "veiculo",
    title: "Registo de Veículo",
    entity: "Direcção Nacional de Trânsito",
    category: "veiculos",
    note: "Documentos de propriedade, inspeção e taxas: só a entidade oficial confirma o que vale hoje.",
    url: "https://www.sepe.gov.ao",
  },
];

const KNOWLEDGE = [
  {
    id: "trabalho-dir",
    title: "Direitos do Trabalho",
    blurb: "Direitos básicos do trabalhador, a confirmar na lei e no serviço competente.",
  },
  {
    id: "ensino",
    title: "Ensino Superior",
    blurb: "Universidades, equivalências e candidaturas. Confirma na instituição.",
  },
  {
    id: "pe",
    title: "Microempresa e Pequenas Empresas",
    blurb: "Enquadramento típico. O regime exacto confirma-se na AGT e no registo comercial.",
  },
  {
    id: "nif-kb",
    title: "NIF (Número de Identificação Fiscal)",
    blurb: "O NIF identifica o contribuinte. Não inventamos o passo a passo oficial.",
  },
  {
    id: "iva",
    title: "IVA (Imposto sobre o Valor Acrescentado)",
    blurb: "Imposto indirecto. A taxa, isenções e prazos só valem se confirmados na AGT.",
  },
  {
    id: "irt",
    title: "IRT (Imposto sobre o Rendimento do Trabalho)",
    blurb: "Retenção na fonte e obrigações. Confirma tabelas e prazos na AGT.",
  },
  {
    id: "inss-kb",
    title: "INSS (Instituto Nacional de Segurança Social)",
    blurb: "O INSS trata da segurança social. Contribuições e inscrição: confirmar no instituto.",
  },
  {
    id: "const-kb",
    title: "Constituição de Empresa",
    blurb: "Abrir empresa em Angola: o guião muda com o tipo societário. Confirma no serviço actual.",
  },
];

export function GuideBurocracia({ onLaunch }: { onLaunch: (text: string) => void }) {
  const [cat, setCat] = useState<Category>("todos");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return SERVICES.filter((s) => {
      if (cat !== "todos" && s.category !== cat) return false;
      if (!needle) return true;
      return `${s.title} ${s.entity} ${s.note}`.toLowerCase().includes(needle);
    });
  }, [cat, q]);

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-semibold">Vamos descomplicar o processo</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Organiza os requisitos, identifica os documentos necessários e prepara os passos seguintes com mais clareza. Isto não submete pedidos a uma entidade pública. Taxas, prazos e requisitos oficiais têm de ser confirmados na fonte.
      </p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 size-5 text-subtle" />
        <Input
          className="pl-11"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar serviço..."
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const selected = cat === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className="relative min-h-28 overflow-hidden rounded-2xl p-3 text-left"
            >
              {c.image ? (
                <img src={c.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-45" />
              ) : (
                <span className="absolute inset-0 bg-elevated" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/45 to-transparent" />
              <span className="relative block">
                <span className="grid size-9 place-items-center rounded-xl bg-bg/70 text-gold">
                  <Icon className="size-4" />
                </span>
                <span className={cn("mt-3 block font-medium", selected && "text-gold")}>{c.label}</span>
                <span className="text-xs text-subtle">{c.count}</span>
              </span>
            </button>
          );
        })}
      </div>

      <ul className="mt-5 space-y-2">
        {filtered.map((s) => {
          const expanded = open === s.id;
          return (
            <li key={s.id} className="rounded-2xl bg-surface shadow-[var(--shadow-border)]">
              <button
                type="button"
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => setOpen(expanded ? null : s.id)}
                aria-expanded={expanded}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-elevated text-gold">
                  <FileText className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{s.title}</span>
                  <span className="block truncate text-sm text-subtle">{s.entity}</span>
                </span>
                <span className="text-gold">{expanded ? "–" : "+"}</span>
              </button>
              {expanded ? (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted">{s.note}</p>
                  <Button
                    className="mt-3 w-full"
                    onClick={() =>
                      onLaunch(
                        `Preciso de tratar de: ${s.title}. Entidade típica: ${s.entity}. Explica em linguagem simples, faz uma checklist do que levar, diz o que é incerto e o que confirmar na entidade oficial. Não inventes taxas, prazos nem contactos. Termina a resposta com esta frase exacta: Para avançar, confirma no site oficial: ${s.url}`,
                      )
                    }
                  >
                    Preparar o pedido
                  </Button>
                  <a href={s.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-gold">
                    Para avançar, confirma no site oficial: {s.url.replace(/^https:\/\//, "")}
                  </a>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-8">
        <p className="flex items-center gap-2 font-medium">
          <BookOpen className="size-4 text-gold" /> Base de conhecimento
        </p>
        <p className="mt-2 text-sm text-muted">
          Guias sobre impostos, documentos e burocracia angolana. Confirma junto da entidade oficial.
        </p>
        <ul className="mt-4 space-y-2">
          {KNOWLEDGE.map((k) => {
            const expanded = open === k.id;
            return (
              <li key={k.id} className="rounded-2xl bg-surface shadow-[var(--shadow-border)]">
                <button
                  type="button"
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setOpen(expanded ? null : k.id)}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-elevated text-gold">
                    <BookOpen className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{k.title}</span>
                    <span className="block truncate text-sm text-subtle">{k.blurb}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-ok/20 px-2 py-1 text-[10px] uppercase tracking-wide text-ok">
                    Guia
                  </span>
                </button>
                {expanded ? (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted">{k.blurb}</p>
                    <Button
                      className="mt-3 w-full"
                      onClick={() =>
                        onLaunch(
                          `Explica ${k.title} em português de Angola, simples e honesto. Diz o que costuma aplicar-se, o que é incerto, e onde confirmar (AGT, INSS, ministério ou serviço competente). Sem taxas oficiais inventadas.`,
                        )
                      }
                    >
                      Explicar isto
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
