"use client";

import Link from "next/link";
import {
  corrigirTextoExibicao,
  formatarSetorExibicao,
  formatarStatusExibicao,
  formatarTituloHumano,
} from "@/lib/display-text";

type Resumo = {
  total: number;
  abertas: number;
  concluidas: number;
  canceladas: number;
};

type Alertas = {
  atrasadas: number;
  hoje: number;
  proximas: number;
  semResponsavel: number;
  emAprovacao: number;
  prontasPublicar: number;
};

type DemandaResumo = {
  id: number;
  titulo: string | null;
  status: string | null;
  responsavel: string | null;
  setor: string | null;
  data_entrega: string | null;
  prioridade?: string | null;
  cadastrado_por?: string | null;
};

type AtividadeResumo = {
  id: number;
  demandaId: number | null;
  demandaTitulo: string;
  acao: string;
  criadoEm: string;
};

type Item = {
  titulo: string;
  valor: number;
};

export default function DashboardClient({
  resumo,
  alertas,
  demandasAtrasadas,
  demandasSemResponsavel,
  demandasEmAprovacao,
  demandasProntas,
  ultimasDemandas,
  atividadesRecentes,
  cargaResponsaveis,
  setoresTop,
}: {
  resumo: Resumo;
  alertas: Alertas;
  demandasAtrasadas: DemandaResumo[];
  demandasSemResponsavel: DemandaResumo[];
  demandasEmAprovacao: DemandaResumo[];
  demandasProntas: DemandaResumo[];
  ultimasDemandas: DemandaResumo[];
  atividadesRecentes: AtividadeResumo[];
  cargaResponsaveis: Item[];
  setoresTop: Item[];
}) {
  return (
    <div style={page}>
      <section style={hero}>
        <div>
          <p style={eyebrow}>Central operacional</p>
          <h1 style={title}>Visão geral da ASCOM</h1>
          <p style={subtitle}>
            Acompanhe prioridades, demandas que exigem ação e os últimos movimentos da equipe.
          </p>
        </div>

        <div style={actions}>
          <Link href="/nova-demanda" style={primaryAction}>
            Nova demanda
          </Link>
          <Link href="/demandas" style={secondaryAction}>
            Abrir Kanban
          </Link>
          <Link href="/relatorios-quantitativos" style={ghostAction}>
            Indicadores
          </Link>
        </div>
      </section>

      <section style={summaryGrid}>
        <ResumoCard titulo="Demandas totais" valor={resumo.total} destaque />
        <ResumoCard titulo="Abertas" valor={resumo.abertas} />
        <ResumoCard titulo="Concluídas" valor={resumo.concluidas} />
        <ResumoCard titulo="Canceladas" valor={resumo.canceladas} />
      </section>

      <section style={alertsGrid}>
        <AlertaCard titulo="Atrasadas" valor={alertas.atrasadas} tom="critico" />
        <AlertaCard titulo="Vencem hoje" valor={alertas.hoje} tom="urgente" />
        <AlertaCard titulo="Próximas 72h" valor={alertas.proximas} tom="atencao" />
        <AlertaCard titulo="Sem responsável" valor={alertas.semResponsavel} tom="neutro" />
        <AlertaCard titulo="Em aprovação" valor={alertas.emAprovacao} tom="roxo" />
        <AlertaCard titulo="Prontas para publicar" valor={alertas.prontasPublicar} tom="verde" />
      </section>

      <section style={mainGrid}>
        <Panel
          titulo="Demandas que exigem ação"
          subtitulo="Recortes operacionais para a equipe atacar primeiro."
        >
          <div style={attentionGrid}>
            <ListaDemandas
              titulo="Atrasadas"
              demandas={demandasAtrasadas}
              vazio="Nenhuma demanda atrasada."
              tom="critico"
            />
            <ListaDemandas
              titulo="Sem responsável"
              demandas={demandasSemResponsavel}
              vazio="Todas as demandas já têm responsável."
              tom="neutro"
            />
            <ListaDemandas
              titulo="Em aprovação"
              demandas={demandasEmAprovacao}
              vazio="Nenhuma demanda aguardando aprovação."
              tom="roxo"
            />
            <ListaDemandas
              titulo="Prontas para publicar"
              demandas={demandasProntas}
              vazio="Nenhuma demanda pronta para publicar."
              tom="verde"
            />
          </div>
        </Panel>

        <Panel titulo="Atalhos rápidos" subtitulo="Acessos diretos para o fluxo diário da equipe.">
          <div style={shortcutList}>
            <Shortcut href="/nova-demanda" titulo="Cadastrar solicitação" descricao="Abrir uma nova demanda com anexos e descrição completa." />
            <Shortcut href="/demandas" titulo="Gerenciar no Kanban" descricao="Mover cards, revisar responsáveis e acompanhar prazos." />
            <Shortcut href="/calendario-editorial" titulo="Ver calendário" descricao="Consultar a agenda editorial e a distribuição das entregas." />
            <Shortcut href="/relatorios" titulo="Consultar relatórios" descricao="Abrir visão tabular para conferência e exportação." />
          </div>
        </Panel>

        <Panel titulo="Últimas demandas criadas" subtitulo="As entradas mais recentes no sistema.">
          <ListaDemandasCompacta demandas={ultimasDemandas} vazio="Nenhuma demanda cadastrada ainda." />
        </Panel>

        <Panel titulo="Últimas movimentações" subtitulo="O que acabou de acontecer na operação.">
          <TimelineAtividades itens={atividadesRecentes} />
        </Panel>

        <Panel titulo="Carga por responsável" subtitulo="Quem está com mais demandas abertas agora.">
          <RankingOperacional
            itens={cargaResponsaveis}
            vazio="Nenhuma demanda aberta no momento."
            cor="linear-gradient(90deg, #8b5cf6, #c084fc)"
          />
        </Panel>

        <Panel titulo="Setores mais demandantes" subtitulo="Origem das solicitações mais frequentes.">
          <RankingOperacional
            itens={setoresTop}
            vazio="Nenhum setor com demandas registradas."
            cor="linear-gradient(90deg, #22c55e, #86efac)"
          />
        </Panel>
      </section>
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div style={destaque ? summaryCardMain : summaryCard}>
      <p style={summaryTitle}>{titulo}</p>
      <strong style={summaryValue}>{valor}</strong>
    </div>
  );
}

function AlertaCard({
  titulo,
  valor,
  tom,
}: {
  titulo: string;
  valor: number;
  tom: keyof typeof alertThemes;
}) {
  const tema = alertThemes[tom];

  return (
    <div
      style={{
        ...alertCard,
        borderColor: tema.border,
        background: tema.background,
      }}
    >
      <div style={alertHeader}>
        <span style={{ ...alertDot, background: tema.dot }} />
        <span style={alertTitle}>{titulo}</span>
      </div>
      <strong style={alertValue}>{valor}</strong>
    </div>
  );
}

function Panel({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={panel}>
      <div style={panelHeader}>
        <h2 style={panelTitle}>{titulo}</h2>
        {subtitulo ? <p style={panelSubtitle}>{subtitulo}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ListaDemandas({
  titulo,
  demandas,
  vazio,
  tom,
}: {
  titulo: string;
  demandas: DemandaResumo[];
  vazio: string;
  tom: keyof typeof alertThemes;
}) {
  const tema = alertThemes[tom];

  return (
    <div style={listBlock}>
      <div style={listHeader}>
        <span style={{ ...listPill, background: tema.pill }}>{titulo}</span>
        <span style={listCount}>{demandas.length}</span>
      </div>

      {demandas.length === 0 ? (
        <p style={emptyText}>{vazio}</p>
      ) : (
        <div style={listStack}>
          {demandas.map((demanda) => (
            <Link key={demanda.id} href={`/demandas/${demanda.id}`} style={demandCard}>
              <div style={demandTop}>
                <span style={demandId}>#{demanda.id}</span>
                <span style={priorityBadge}>{formatarTituloHumano(demanda.prioridade || "Normal")}</span>
              </div>
              <strong style={demandTitle}>{corrigirTextoExibicao(demanda.titulo) || "Sem título"}</strong>
              <div style={metaWrap}>
                <span style={metaChip}>{formatarSetorExibicao(demanda.setor)}</span>
                <span style={metaChip}>{formatarResponsavel(demanda.responsavel)}</span>
              </div>
              <div style={metaFooter}>
                <span>{formatarStatusExibicao(demanda.status)}</span>
                <span>{formatarPrazoExibicao(demanda.data_entrega)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ListaDemandasCompacta({
  demandas,
  vazio,
}: {
  demandas: DemandaResumo[];
  vazio: string;
}) {
  if (demandas.length === 0) {
    return <p style={emptyText}>{vazio}</p>;
  }

  return (
    <div style={compactList}>
      {demandas.map((demanda) => (
        <Link key={demanda.id} href={`/demandas/${demanda.id}`} style={compactCard}>
          <div style={compactHeader}>
            <strong style={compactTitle}>{corrigirTextoExibicao(demanda.titulo) || "Sem título"}</strong>
            <span style={compactId}>#{demanda.id}</span>
          </div>
          <div style={compactMeta}>
            <span>{formatarSetorExibicao(demanda.setor)}</span>
            <span>{formatarStatusExibicao(demanda.status)}</span>
            <span>{formatarPrazoExibicao(demanda.data_entrega)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function TimelineAtividades({ itens }: { itens: AtividadeResumo[] }) {
  if (itens.length === 0) {
    return <p style={emptyText}>Nenhuma atividade recente encontrada.</p>;
  }

  return (
    <div style={timeline}>
      {itens.map((item, index) => (
        <div key={item.id} style={timelineRow}>
          <div style={timelineRail}>
            <span style={timelineDot} />
            {index < itens.length - 1 ? <span style={timelineLine} /> : null}
          </div>
          <div style={timelineCard}>
            <div style={timelineHeader}>
              {item.demandaId ? (
                <Link href={`/demandas/${item.demandaId}`} style={timelineLink}>
                  {corrigirTextoExibicao(item.demandaTitulo)}
                </Link>
              ) : (
                <strong>{corrigirTextoExibicao(item.demandaTitulo)}</strong>
              )}
              <time style={timelineTime}>{formatarDataHora(item.criadoEm)}</time>
            </div>
            <p style={timelineText}>{corrigirTextoExibicao(item.acao)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankingOperacional({
  itens,
  vazio,
  cor,
}: {
  itens: Item[];
  vazio: string;
  cor: string;
}) {
  const lista = itens.slice(0, 6);
  const maximo = Math.max(...lista.map((item) => item.valor), 1);

  if (lista.length === 0) {
    return <p style={emptyText}>{vazio}</p>;
  }

  return (
    <div style={rankingList}>
      {lista.map((item, index) => (
        <div key={item.titulo} style={rankingRow}>
          <div style={rankingTop}>
            <span style={rankingLabel}>
              {index + 1}. {corrigirTextoExibicao(item.titulo)}
            </span>
            <strong style={rankingValue}>{item.valor}</strong>
          </div>
          <div style={rankingTrack}>
            <div
              style={{
                ...rankingFill,
                width: `${Math.max(10, (item.valor / maximo) * 100)}%`,
                background: cor,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Shortcut({
  href,
  titulo,
  descricao,
}: {
  href: string;
  titulo: string;
  descricao: string;
}) {
  return (
    <Link href={href} style={shortcutCard}>
      <strong style={shortcutTitle}>{titulo}</strong>
      <p style={shortcutDescription}>{descricao}</p>
    </Link>
  );
}

function formatarResponsavel(valor?: string | null) {
  return corrigirTextoExibicao(valor) || "Não definido";
}

function formatarPrazoExibicao(valor?: string | null) {
  if (!valor) return "Sem prazo";
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(valor: string) {
  return new Date(valor).toLocaleString("pt-BR");
}

const alertThemes = {
  critico: {
    background: "linear-gradient(135deg, rgba(127,29,29,.92), rgba(239,68,68,.24))",
    border: "rgba(248,113,113,.34)",
    dot: "#ef4444",
    pill: "rgba(127,29,29,.72)",
  },
  urgente: {
    background: "linear-gradient(135deg, rgba(120,53,15,.92), rgba(251,146,60,.2))",
    border: "rgba(251,146,60,.34)",
    dot: "#fb923c",
    pill: "rgba(120,53,15,.72)",
  },
  atencao: {
    background: "linear-gradient(135deg, rgba(113,63,18,.92), rgba(250,204,21,.16))",
    border: "rgba(250,204,21,.28)",
    dot: "#facc15",
    pill: "rgba(113,63,18,.72)",
  },
  neutro: {
    background: "linear-gradient(135deg, rgba(30,41,59,.92), rgba(148,163,184,.12))",
    border: "rgba(148,163,184,.22)",
    dot: "#94a3b8",
    pill: "rgba(51,65,85,.72)",
  },
  roxo: {
    background: "linear-gradient(135deg, rgba(88,28,135,.92), rgba(168,85,247,.14))",
    border: "rgba(192,132,252,.28)",
    dot: "#c084fc",
    pill: "rgba(88,28,135,.72)",
  },
  verde: {
    background: "linear-gradient(135deg, rgba(20,83,45,.92), rgba(34,197,94,.14))",
    border: "rgba(74,222,128,.28)",
    dot: "#4ade80",
    pill: "rgba(20,83,45,.72)",
  },
} as const;

const page = {
  display: "grid",
  gap: "16px",
};

const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap" as const,
};

const eyebrow = {
  margin: 0,
  color: "#fecaca",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const title = {
  margin: "8px 0",
  fontSize: "30px",
};

const subtitle = {
  margin: 0,
  color: "#fecaca",
  maxWidth: "720px",
  lineHeight: "22px",
};

const actions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const actionBase = {
  textDecoration: "none",
  borderRadius: "9px",
  padding: "10px 14px",
  fontWeight: 700,
  border: "1px solid rgba(255,255,255,.12)",
  fontSize: "13px",
};

const primaryAction = {
  ...actionBase,
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "#fff",
};

const secondaryAction = {
  ...actionBase,
  background: "rgba(15,23,42,.78)",
  color: "#fff",
};

const ghostAction = {
  ...actionBase,
  background: "rgba(15,23,42,.45)",
  color: "#fecaca",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))",
  gap: "12px",
};

const summaryCard = {
  background: "rgba(15, 23, 42, 0.74)",
  border: "1px solid rgba(252,165,165,.14)",
  borderRadius: "12px",
  padding: "16px",
  boxShadow: "0 12px 28px rgba(0,0,0,.18)",
};

const summaryCardMain = {
  ...summaryCard,
  background: "linear-gradient(135deg, rgba(220,38,38,.96), rgba(127,29,29,.96))",
};

const summaryTitle = {
  margin: 0,
  marginBottom: "6px",
  fontSize: "12px",
  color: "#fecaca",
};

const summaryValue = {
  fontSize: "30px",
};

const alertsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
  gap: "10px",
};

const alertCard = {
  borderRadius: "12px",
  border: "1px solid transparent",
  padding: "14px",
  boxShadow: "0 10px 24px rgba(0,0,0,.14)",
};

const alertHeader = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "8px",
};

const alertDot = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
};

const alertTitle = {
  fontSize: "12px",
  color: "#fff",
};

const alertValue = {
  fontSize: "26px",
};

const mainGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "16px",
};

const panel = {
  background: "linear-gradient(180deg, rgba(15,23,42,.82), rgba(30,41,59,.74))",
  border: "1px solid rgba(252,165,165,.16)",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 14px 32px rgba(0,0,0,.18)",
};

const panelHeader = {
  marginBottom: "14px",
};

const panelTitle = {
  margin: 0,
  fontSize: "17px",
};

const panelSubtitle = {
  margin: "6px 0 0",
  color: "#fecaca",
  fontSize: "12px",
  lineHeight: "18px",
};

const attentionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "12px",
};

const listBlock = {
  display: "grid",
  gap: "10px",
};

const listHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const listPill = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 700,
};

const listCount = {
  color: "#cbd5e1",
  fontSize: "12px",
};

const listStack = {
  display: "grid",
  gap: "8px",
};

const demandCard = {
  display: "grid",
  gap: "8px",
  background: "rgba(2,6,23,.42)",
  border: "1px solid rgba(148,163,184,.12)",
  borderRadius: "12px",
  padding: "12px",
  textDecoration: "none",
  color: "#fff",
};

const demandTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const demandId = {
  color: "#94a3b8",
  fontSize: "12px",
};

const priorityBadge = {
  background: "rgba(37,99,235,.16)",
  border: "1px solid rgba(96,165,250,.2)",
  color: "#dbeafe",
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "11px",
  fontWeight: 700,
};

const demandTitle = {
  fontSize: "14px",
  lineHeight: "20px",
};

const metaWrap = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const metaChip = {
  background: "rgba(255,255,255,.06)",
  borderRadius: "999px",
  padding: "4px 8px",
  color: "#e2e8f0",
  fontSize: "10px",
};

const metaFooter = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  color: "#cbd5e1",
  fontSize: "12px",
  flexWrap: "wrap" as const,
};

const compactList = {
  display: "grid",
  gap: "8px",
};

const compactCard = {
  textDecoration: "none",
  color: "#fff",
  background: "rgba(2,6,23,.34)",
  border: "1px solid rgba(148,163,184,.1)",
  borderRadius: "12px",
  padding: "12px",
};

const compactHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
  marginBottom: "6px",
};

const compactTitle = {
  fontSize: "14px",
  lineHeight: "20px",
};

const compactId = {
  color: "#94a3b8",
  fontSize: "12px",
};

const compactMeta = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
  color: "#cbd5e1",
  fontSize: "11px",
};

const timeline = {
  display: "grid",
  gap: "10px",
};

const timelineRow = {
  display: "grid",
  gridTemplateColumns: "20px 1fr",
  gap: "10px",
};

const timelineRail = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
};

const timelineDot = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  background: "#ef4444",
  boxShadow: "0 0 0 3px rgba(239,68,68,.12)",
};

const timelineLine = {
  flex: 1,
  width: "1px",
  minHeight: "22px",
  background: "rgba(148,163,184,.2)",
  marginTop: "5px",
};

const timelineCard = {
  background: "rgba(2,6,23,.34)",
  border: "1px solid rgba(148,163,184,.1)",
  borderRadius: "12px",
  padding: "12px",
};

const timelineHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
  marginBottom: "6px",
  flexWrap: "wrap" as const,
};

const timelineLink = {
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700,
};

const timelineTime = {
  color: "#94a3b8",
  fontSize: "12px",
};

const timelineText = {
  margin: 0,
  color: "#e2e8f0",
  lineHeight: "20px",
  fontSize: "13px",
};

const rankingList = {
  display: "grid",
  gap: "10px",
};

const rankingRow = {
  display: "grid",
  gap: "8px",
};

const rankingTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
};

const rankingLabel = {
  color: "#e2e8f0",
  fontSize: "13px",
};

const rankingValue = {
  color: "#fff",
};

const rankingTrack = {
  width: "100%",
  height: "8px",
  borderRadius: "999px",
  background: "rgba(255,255,255,.08)",
  overflow: "hidden" as const,
};

const rankingFill = {
  height: "100%",
  borderRadius: "999px",
};

const shortcutList = {
  display: "grid",
  gap: "10px",
};

const shortcutCard = {
  display: "block",
  background: "rgba(2,6,23,.34)",
  border: "1px solid rgba(148,163,184,.1)",
  borderRadius: "12px",
  padding: "14px",
  textDecoration: "none",
  color: "#fff",
};

const shortcutTitle = {
  display: "block",
  marginBottom: "4px",
  fontSize: "14px",
};

const shortcutDescription = {
  margin: 0,
  color: "#cbd5e1",
  lineHeight: "19px",
  fontSize: "12px",
};

const emptyText = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "13px",
};
