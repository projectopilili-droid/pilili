import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input, Select, Textarea } from "@/components/ui/input";
import { savePowerNote } from "@/lib/server/functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { setNextPath } from "@/lib/client/pending";
import { useAccountItems } from "@/components/powers/AccountSaves";
import { CV_STYLES, type CvStyle } from "@/lib/pilili/cv";

type Profile = {
  cargo: string;
  localizacao: string;
  anos: string;
  educacao: string;
  competencias: string[];
  tipo: string;
  modalidade: string;
  salario: string;
  resumo: string;
};

const EMPTY: Profile = {
  cargo: "",
  localizacao: "",
  anos: "",
  educacao: "",
  competencias: [],
  tipo: "Tempo inteiro",
  modalidade: "Presencial",
  salario: "",
  resumo: "",
};

function parseProfile(body: string | null): Profile | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as Partial<Profile>;
    return { ...EMPTY, ...parsed, competencias: Array.isArray(parsed.competencias) ? parsed.competencias : [] };
  } catch {
    return null;
  }
}

function profilePrompt(p: Profile, intent: string, style?: CvStyle) {
  const visual = CV_STYLES.find((item) => item.id === style);
  return [
    intent,
    p.cargo ? `Cargo pretendido: ${p.cargo}.` : null,
    p.localizacao ? `Localização: ${p.localizacao}.` : null,
    p.anos ? `Anos de experiência: ${p.anos}.` : null,
    p.educacao ? `Educação: ${p.educacao}.` : null,
    p.competencias.length ? `Competências: ${p.competencias.join(", ")}.` : null,
    `Tipo: ${p.tipo}. Modalidade: ${p.modalidade}.`,
    p.salario ? `Expectativa salarial: ${p.salario}.` : null,
    p.resumo ? `Resumo: ${p.resumo}` : null,
    visual ? `Estilo visual do CV: ${visual.label} (${visual.id}).` : null,
    "Usa só o que está neste pedido. Não cries secções que a pessoa não pediu, incluindo Projecto e Objectivo. Não escrevas a indicar.",
  ]
    .filter(Boolean)
    .join(" ");
}

const JOB_PORTALS =
  'Termina com a frase exacta "Para encontrar vagas, procura nestes portais:" e estes links, sem mudar os endereços: [Jobartis](https://www.jobartis.com) [Ango Emprego](https://angoemprego.com) [Angola Emprego](https://angolaemprego.com) [Empregos Yoyota](https://empregosyoyota.net) [Angorecruta](https://angorecruta.com) [LinkedIn](https://www.linkedin.com/jobs)';

export function GuideEmprego({ onLaunch }: { onLaunch: (text: string, context?: string) => void }) {
  const [tab, setTab] = useState<"perfil" | "procurar" | "candidaturas">("perfil");
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [skill, setSkill] = useState("");
  const [saved, setSaved] = useState("");
  const [jobQuery, setJobQuery] = useState("");
  const [cvStyle, setCvStyle] = useState<CvStyle>("classico");
  const [fromAccount, setFromAccount] = useState(false);
  const { user, isPending } = useCurrentUserState();
  const items = useAccountItems("emprego");
  const qc = useQueryClient();
  const nav = useNavigate();
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      if (loadedFor.current === "out") return;
      loadedFor.current = "out";
      setProfile(EMPTY);
      setFromAccount(false);
      return;
    }
    if (!items.isSuccess) return;
    if (loadedFor.current === user.id) return;
    loadedFor.current = user.id;
    const remote = (items.data ?? []).find((item) => item.kind === "emprego_profile");
    const parsed = parseProfile(remote?.body ?? null);
    setProfile(parsed ?? EMPTY);
    setFromAccount(Boolean(parsed));
  }, [user, isPending, items.isSuccess, items.data]);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved("");
  }

  function addSkill() {
    const t = skill.trim();
    if (!t) return;
    if (profile.competencias.includes(t)) {
      setSkill("");
      return;
    }
    set("competencias", [...profile.competencias, t]);
    setSkill("");
  }

  async function save() {
    if (isPending) return;
    if (!user) {
      setNextPath("/poderes/emprego");
      nav({ to: "/login" });
      return;
    }
    try {
      const result = await savePowerNote({
        data: {
          kind: "emprego_profile",
          title: profile.cargo.trim() || "Perfil profissional",
          body: JSON.stringify(profile),
          replace: true,
        },
      });
      if (!result.ok) {
        setSaved(result.error);
        return;
      }
      setFromAccount(true);
      setSaved("Guardado nesta conta. Noutro aparelho, entra com a mesma conta para o ver.");
      await qc.invalidateQueries({ queryKey: ["account-items"] });
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
    } catch {
      setSaved("Não ficou na conta. Entra e tenta outra vez.");
    }
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap gap-2">
        <Chip selected={tab === "perfil"} onClick={() => setTab("perfil")}>
          Perfil
        </Chip>
        <Chip selected={tab === "procurar"} onClick={() => setTab("procurar")}>
          Procurar oportunidades
        </Chip>
        <Chip selected={tab === "candidaturas"} onClick={() => setTab("candidaturas")}>
          Candidaturas
        </Chip>
      </div>

      {tab === "perfil" ? (
        <div className="mt-5 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="font-display text-xl font-semibold">O teu perfil profissional</h2>
            <button
              type="button"
              className="min-h-11 text-left text-sm text-gold"
              onClick={() =>
                onLaunch(
                  "Quero importar os dados do meu CV.",
                  "Vou anexar ou descrever o meu CV. Extrai só o que estiver no CV: cargo, experiência, educação e competências. Não inventes nome, empresas, datas, contactos nem secções. Não escrevas a indicar.",
                )
              }
            >
              Importar dados do CV
            </button>
          </div>
          {fromAccount ? (
            <p className="mt-3 rounded-xl bg-elevated px-3 py-3 text-sm">
              <span className="text-[11px] uppercase tracking-[0.14em] text-gold">Na tua conta</span>
              <span className="mt-1 block">{profile.cargo || "Perfil profissional"}</span>
              <span className="mt-1 block text-xs text-subtle">
                {profile.localizacao || "Sem localização"} · {profile.competencias.length} competências
              </span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-subtle">
              {user ? "Ainda não há perfil guardado nesta conta." : "Entra para guardar o perfil nesta conta. Não fica só neste aparelho."}
            </p>
          )}

          <label className="mt-4 block text-sm text-subtle">
            Que função procuras?
            <Input
              className="mt-2"
              value={profile.cargo}
              onChange={(e) => set("cargo", e.target.value)}
              placeholder="Ex: Gestor de Marketing"
            />
          </label>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-subtle">
              Onde queres trabalhar?
              <Input
                className="mt-2"
                value={profile.localizacao}
                onChange={(e) => set("localizacao", e.target.value)}
                placeholder="Ex: cidade ou província"
              />
            </label>
            <label className="text-sm text-subtle">
              Quantos anos de experiência tens?
              <Input
                className="mt-2"
                value={profile.anos}
                onChange={(e) => set("anos", e.target.value)}
                placeholder="Ex: 5"
              />
            </label>
          </div>

          <label className="mt-4 block text-sm text-subtle">
            Qual é a tua formação?
            <Input
              className="mt-2"
              value={profile.educacao}
              onChange={(e) => set("educacao", e.target.value)}
              placeholder="Ex: Licenciatura em Gestão"
            />
          </label>

          <p className="mt-4 text-sm text-subtle">Adiciona as tuas competências</p>
          <div className="mt-2 flex gap-2">
            <Input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="Adicionar competência..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
            />
            <Button variant="line" type="button" onClick={addSkill}>
              Adicionar
            </Button>
          </div>
          {profile.competencias.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.competencias.map((c) => (
                <Chip
                  key={c}
                  selected
                  onClick={() => set("competencias", profile.competencias.filter((x) => x !== c))}
                >
                  {c} ×
                </Chip>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm text-subtle">
              Tipo de emprego
              <Select className="mt-2" value={profile.tipo} onChange={(e) => set("tipo", e.target.value)}>
                <option>Tempo inteiro</option>
                <option>Tempo parcial</option>
                <option>Estágio</option>
                <option>Freelance</option>
              </Select>
            </label>
            <label className="text-sm text-subtle">
              Modalidade
              <Select className="mt-2" value={profile.modalidade} onChange={(e) => set("modalidade", e.target.value)}>
                <option>Presencial</option>
                <option>Híbrido</option>
                <option>Remoto</option>
              </Select>
            </label>
          </div>

          <label className="mt-4 block text-sm text-subtle">
            Qual é a tua expectativa salarial?
            <Input
              className="mt-2"
              value={profile.salario}
              onChange={(e) => set("salario", e.target.value)}
              placeholder="Ex: 150.000 Kz"
            />
          </label>

          <label className="mt-4 block text-sm text-subtle">
            Apresenta a tua experiência, os teus pontos fortes e os teus objectivos profissionais.
            <Textarea
              className="mt-2"
              value={profile.resumo}
              onChange={(e) => set("resumo", e.target.value)}
              placeholder="Descreve brevemente a tua experiência e objectivos..."
            />
          </label>

          <Button className="mt-5 w-full" type="button" onClick={() => void save()}>
            {user ? "Guardar o meu perfil" : "Entra para guardar na conta"}
          </Button>
          <p className="mt-2 text-xs text-subtle">{saved || "Guardar não pede nada ao motor."}</p>

          <div className="mt-4 rounded-2xl bg-elevated px-4 py-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-gold" />
              <div>
                <p className="font-medium">Precisas de um CV?</p>
                <p className="text-sm text-muted">Cria ou melhora o teu CV a partir deste perfil.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Estilo do CV">
              {CV_STYLES.map((item) => (
                <Chip key={item.id} selected={cvStyle === item.id} onClick={() => setCvStyle(item.id)}>
                  {item.label}
                </Chip>
              ))}
            </div>
            <Button
              variant="line"
              className="mt-3 w-full"
              onClick={() =>
                onLaunch(
                  "Quero criar ou melhorar o meu CV.",
                  profilePrompt(profile, "Cria ou melhora o meu CV com este perfil.", cvStyle),
                )
              }
            >
              Criar ou melhorar CV
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "procurar" ? (
        <div className="mt-5 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl font-semibold">Procurar oportunidades</h2>
          <p className="mt-1 text-sm text-muted">
            O PILILÍ não inventa vagas. Ajuda-te a preparar pesquisas, identificar palavras-chave e adaptar o teu perfil às oportunidades que procuras.
          </p>
          <Input
            className="mt-4"
            value={jobQuery}
            onChange={(e) => setJobQuery(e.target.value)}
            placeholder="Que vaga procuras?"
          />
          <Button
            className="mt-4 w-full"
            onClick={() => {
              const vaga = jobQuery.trim();
              onLaunch(
                vaga ? `Quero procurar: ${vaga}.` : "Quero procurar uma vaga.",
                profilePrompt(
                  { ...profile, cargo: vaga || profile.cargo },
                  `Prepara palavras-chave e adapta o perfil a esta procura. Não inventes anúncios. ${JOB_PORTALS}`,
                ),
              );
            }}
          >
            Preparar pesquisa
          </Button>
        </div>
      ) : null}

      {tab === "candidaturas" ? (
        <div className="mt-5 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-xl font-semibold">As tuas candidaturas</h2>
          <p className="mt-2 text-sm text-muted">Ainda não tens candidaturas guardadas neste aparelho.</p>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Estilo do CV">
            {CV_STYLES.map((item) => (
              <Chip key={item.id} selected={cvStyle === item.id} onClick={() => setCvStyle(item.id)}>
                {item.label}
              </Chip>
            ))}
          </div>
          <Button
            className="mt-4 w-full"
            onClick={() =>
              onLaunch(
                "Quero preparar uma candidatura.",
                profilePrompt(
                  profile,
                  "Prepara um pacote de candidatura: CV, carta e ângulos de entrevista. Se faltar a vaga, pede o anúncio e mesmo assim entrega um rascunho forte.",
                  cvStyle,
                ),
              )
            }
          >
            Preparar uma candidatura
          </Button>
        </div>
      ) : null}
    </section>
  );
}
