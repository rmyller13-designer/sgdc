"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
  const totalCriticos =
    alertas.atrasadas + alertas.hoje + alertas.semResponsavel + alertas.emAprovacao;

  const filaDoDia = [
    {
      titulo: "Resolver atrasos",
      valor: alertas.atrasadas,
      descricao: "Demandas vencidas que precisam de resposta rápida.",
      tom: "critico" as const,
    },
    {
      titulo: "Vence hoje",
      valor: alertas.hoje,
      descricao: "Entregas com prazo do dia pedindo execução ou retorno.",
      tom: "urgente" as const,
    },
    {
      titulo: "Aprovação pendente",
      valor: alertas.emAprovacao,
      descricao: "Peças aguardando validação antes de seguir no fluxo.",
      tom: "roxo" as const,
    },
    {
      titulo: "Prontas para publicar",
      valor: alertas.prontasPublicar,
      descricao: "Conteúdos que já podem avançar para publicação.",
      tom: "verde" as const,
    },
  ];

  return (
    <div style={page}>
      <section style={hero}>
        <div style={heroCopy}>
          <p style={eyebrow}>Home operacional</p>
          <h1 style={title}>Central de comando da ASCOM</h1>
          <p style={subtitle}>
            Uma visão viva do fluxo: prioridades do dia, gargalos, últimas movimentações
            e atalhos para a equipe agir rápido.
          </p>

          <div style={heroSignals}>
            <SignalChip
              label="Atenção imediata"
              value={totalCriticos}
              tone="critico"
            />
            <SignalChip
              label="Em andamento"
              value={resumo.abertas}
              tone="neutro"
            />
            <SignalChip
              label="Fechadas"
              value={resumo.concluidas}
              tone="verde"
            />
          </div>
        </div>

        <div style={heroActions}>
          <Link href="/nova-demanda" style={primaryAction}>
            Nova demanda
          </Link>
          <Link href="/demandas" style={secondaryAction}>
            Abrir quadro
          </Link>
          <Link href="/relatorios-quantitativos" style={ghostAction}>
            Ver indicadores
          </Link>
        </div>
      </section>

      <section style={snapshotGrid}>
        <SnapshotCard
          titulo="Total cadastrado"
          valor={resumo.total}
          detalhe="Base geral de demandas registradas no sistema."
          destaque
        />
        <SnapshotCard
          titulo="Fluxo ativo"
          valor={resumo.abertas}
          detalhe="Tudo que ainda está em produção, aprovação ou publicação."
        />
        <SnapshotCard
          titulo="Concluídas"
          valor={resumo.concluidas}
          detalhe="Entregas já finalizadas e fechadas pela equipe."
        />
        <SnapshotCard
          titulo="Canceladas"
          valor={resumo.canceladas}
          detalhe="Solicitações encerradas sem execução."
        />
      </section>

      <section style={commandGrid}>
        <Panel
          titulo="Painel do dia"
          subtitulo="O que merece atenção agora, sem precisar garimpar o sistema."
        >
          <div style={focusGrid}>
            {filaDoDia.map((item) => (
              <FocusCard
                key={item.titulo}
                titulo={item.titulo}
                valor={item.valor}
                descricao={item.descricao}
                tom={item.tom}
              />
            ))}
          </div>
        </Panel>

        <Panel
          titulo="Atalhos rápidos"
          subtitulo="Entradas úteis para não perder tempo no fluxo."
        >
          <div style={shortcutGrid}>
            <Shortcut
              href="/nova-demanda"
              eyebrow="Solicitação"
              titulo="Cadastrar uma nova demanda"
              descricao="Abrir o formulário completo com anexos, briefing e memória editorial."
            />
            <Shortcut
              href="/demandas"
              eyebrow="Produção"
              titulo="Trabalhar no quadro Kanban"
              descricao="Mover cards, revisar responsáveis e acompanhar prazos sem sair da operação."
            />
            <Shortcut
              href="/calendario-editorial"
              eyebrow="Agenda"
              titulo="Visualizar o calendário editorial"
              descricao="Enxergar distribuição por datas e antecipar entregas da semana."
            />
            <Shortcut
              href="/clipping"
              eyebrow="Imagem"
              titulo="Monitorar clipping e repercussão"
              descricao="Acompanhar produção ASCOM, clipping externo e leitura executiva."
            />
          </div>
        </Panel>
      </section>

      <section style={contentGrid}>
        <Panel
          titulo="Listas de ação"
          subtitulo="Recortes práticos para a equipe atacar primeiro."
          destaque
        >
          <div style={laneGrid}>
            <DemandLane
              titulo="Atrasadas"
              badge={demandasAtrasadas.length}
              tom="critico"
              demandas={demandasAtrasadas}
              emptyText="Nenhuma demanda atrasada."
            />
            <DemandLane
              titulo="Sem responsável"
              badge={demandasSemResponsavel.length}
              tom="neutro"
              demandas={demandasSemResponsavel}
              emptyText="Todas as demandas já têm responsável."
            />
            <DemandLane
              titulo="Em aprovação"
              badge={demandasEmAprovacao.length}
              tom="roxo"
              demandas={demandasEmAprovacao}
              emptyText="Nenhuma demanda aguardando aprovação."
            />
            <DemandLane
              titulo="Prontas para publicar"
              badge={demandasProntas.length}
              tom="verde"
              demandas={demandasProntas}
              emptyText="Nada pronto para publicar no momento."
            />
          </div>
        </Panel>

        <div style={stackColumn}>
          <Panel
            titulo="Últimas demandas"
            subtitulo="As entradas mais recentes no SGDC."
          >
            <CompactDemandList
              demandas={ultimasDemandas}
              emptyText="Nenhuma demanda cadastrada ainda."
            />
          </Panel>

          <Panel
            titulo="Últimas movimentações"
            subtitulo="O que aconteceu agora há pouco no fluxo."
          >
            <Timeline itens={atividadesRecentes} />
          </Panel>
        </div>
      </section>

      <section style={rankingGrid}>
        <Panel
          titulo="Carga por responsável"
          subtitulo="Quem está segurando mais demandas abertas neste momento."
        >
          <RankingOperacional
            itens={cargaResponsaveis}
            emptyText="Nenhuma demanda aberta no momento."
            cor="linear-gradient(90deg, #8b5cf6, #c084fc)"
          />
        </Panel>

        <Panel
          titulo="Setores mais demandantes"
          subtitulo="Origem das solicitações com maior volume."
        >
          <RankingOperacional
            itens={setoresTop}
            emptyText="Nenhum setor com demandas registradas."
            cor="linear-gradient(90deg, #22c55e, #86efac)"
          />
        </Panel>
      </section>
    </div>
  );
}

function SnapshotCard({
  titulo,
  valor,
  detalhe,
  destaque,
}: {
  titulo: string;
  valor: number;
  detalhe: string;
  destaque?: boolean;
}) {
  return (
    <div
      style={destaque ? snapshotCardMain : snapshotCard}
      className="sg-hover-lift"
    >
      <span style={snapshotLabel}>{titulo}</span>
      <strong style={snapshotValue}>{valor}</strong>
      <p style={snapshotDetail}>{detalhe}</p>
    </div>
  );
}

function SignalChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof signalThemes;
}) {
  const theme = signalThemes[tone];

  return (
    <span
      style={{
        ...signalChip,
        background: theme.background,
        borderColor: theme.border,
        color: theme.color,
      }}
    >
      <span style={{ ...signalDot, background: theme.dot }} />
      {label}: {value}
    </span>
  );
}

function FocusCard({
  titulo,
  valor,
  descricao,
  tom,
}: {
  titulo: string;
  valor: number;
  descricao: string;
  tom: keyof typeof signalThemes;
}) {
  const theme = signalThemes[tom];

  return (
    <div
      style={{
        ...focusCard,
        borderColor: theme.border,
        background: theme.panel,
      }}
      className="sg-hover-lift"
    >
      <div style={focusHeader}>
        <span style={focusTitle}>{titulo}</span>
        <strong style={{ ...focusValue, color: theme.color }}>{valor}</strong>
      </div>
      <p style={focusDescription}>{descricao}</p>
    </div>
  );
}

function Panel({
  titulo,
  subtitulo,
  children,
  destaque,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  destaque?: boolean;
}) {
  return (
    <section style={destaque ? panelHighlight : panel}>
      <div style={panelHeader}>
        <h2 style={panelTitle}>{titulo}</h2>
        {subtitulo ? <p style={panelSubtitle}>{subtitulo}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Shortcut({
  href,
  eyebrow,
  titulo,
  descricao,
}: {
  href: string;
  eyebrow: string;
  titulo: string;
  descricao: string;
}) {
  return (
    <Link href={href} style={shortcutCard} className="sg-interactive sg-card-lift">
      <span style={shortcutEyebrow}>{eyebrow}</span>
      <strong style={shortcutTitle}>{titulo}</strong>
      <p style={shortcutDescription}>{descricao}</p>
    </Link>
  );
}

function DemandLane({
  titulo,
  badge,
  tom,
  demandas,
  emptyText,
}: {
  titulo: string;
  badge: number;
  tom: keyof typeof signalThemes;
  demandas: DemandaResumo[];
  emptyText: string;
}) {
  const theme = signalThemes[tom];

  return (
    <div style={lane}>
      <div style={laneHeader}>
        <span
          style={{
            ...lanePill,
            background: theme.background,
            borderColor: theme.border,
            color: theme.color,
          }}
        >
          <span style={{ ...signalDot, background: theme.dot }} />
          {titulo}
        </span>
        <span style={laneCount}>{badge}</span>
      </div>

      {demandas.length === 0 ? (
        <p style={emptyTextStyle}>{emptyText}</p>
      ) : (
        <div style={laneList}>
          {demandas.map((demanda) => (
            <Link
              key={demanda.id}
              href={`/demandas/${demanda.id}`}
              style={laneCard}
              className="sg-interactive sg-card-lift"
            >
              <div style={laneCardTop}>
                <span style={laneId}>#{demanda.id}</span>
                <span style={priorityBadge(demanda.prioridade)}>
                  {formatarTituloHumano(demanda.prioridade || "NORMAL")}
                </span>
              </div>
              <strong style={laneCardTitle}>
                {corrigirTextoExibicao(demanda.titulo) || "Sem título"}
              </strong>
              <div style={laneMetaRow}>
                <span style={laneMetaChip}>{formatarSetorExibicao(demanda.setor)}</span>
                <span style={laneMetaChip}>{formatarResponsavel(demanda.responsavel)}</span>
              </div>
              <div style={laneFooter}>
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

function CompactDemandList({
  demandas,
  emptyText,
}: {
  demandas: DemandaResumo[];
  emptyText: string;
}) {
  if (demandas.length === 0) {
    return <p style={emptyTextStyle}>{emptyText}</p>;
  }

  return (
    <div style={compactList}>
      {demandas.map((demanda) => (
        <Link
          key={demanda.id}
          href={`/demandas/${demanda.id}`}
          style={compactCard}
          className="sg-interactive sg-card-lift"
        >
          <div style={compactTop}>
            <strong style={compactTitle}>
              {corrigirTextoExibicao(demanda.titulo) || "Sem título"}
            </strong>
            <span style={compactId}>#{demanda.id}</span>
          </div>
          <div style={compactFooter}>
            <span>{formatarSetorExibicao(demanda.setor)}</span>
            <span>{formatarStatusExibicao(demanda.status)}</span>
            <span>{formatarPrazoExibicao(demanda.data_entrega)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Timeline({ itens }: { itens: AtividadeResumo[] }) {
  if (itens.length === 0) {
    return <p style={emptyTextStyle}>Nenhuma atividade recente encontrada.</p>;
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
                <Link
                  href={`/demandas/${item.demandaId}`}
                  style={timelineLink}
                  className="sg-interactive"
                >
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
  emptyText,
  cor,
}: {
  itens: Item[];
  emptyText: string;
  cor: string;
}) {
  const lista = itens.slice(0, 6);
  const maximo = Math.max(...lista.map((item) => item.valor), 1);

  if (lista.length === 0) {
    return <p style={emptyTextStyle}>{emptyText}</p>;
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

function priorityBadge(prioridade?: string | null) {
  const valor = (prioridade || "NORMAL").toUpperCase();

  if (valor === "ALTA" || valor === "URGENTE") {
    return {
      ...priorityBase,
      background: "rgba(239,68,68,.16)",
      border: "1px solid rgba(248,113,113,.32)",
      color: "#fecaca",
    };
  }

  if (valor === "MEDIA") {
    return {
      ...priorityBase,
      background: "rgba(245,158,11,.16)",
      border: "1px solid rgba(251,191,36,.28)",
      color: "#fde68a",
    };
  }

  if (valor === "BAIXA") {
    return {
      ...priorityBase,
      background: "rgba(34,197,94,.16)",
      border: "1px solid rgba(74,222,128,.28)",
      color: "#bbf7d0",
    };
  }

  return {
    ...priorityBase,
    background: "rgba(59,130,246,.16)",
    border: "1px solid rgba(147,197,253,.22)",
    color: "#bfdbfe",
  };
}

const signalThemes = {
  critico: {
    background: "rgba(127,29,29,.26)",
    border: "rgba(248,113,113,.32)",
    color: "#fecaca",
    dot: "#ef4444",
    panel: "linear-gradient(135deg, rgba(127,29,29,.24), rgba(15,23,42,.58))",
  },
  urgente: {
    background: "rgba(120,53,15,.22)",
    border: "rgba(251,146,60,.32)",
    color: "#fdba74",
    dot: "#fb923c",
    panel: "linear-gradient(135deg, rgba(120,53,15,.22), rgba(15,23,42,.58))",
  },
  roxo: {
    background: "rgba(88,28,135,.22)",
    border: "rgba(196,181,253,.3)",
    color: "#ddd6fe",
    dot: "#a855f7",
    panel: "linear-gradient(135deg, rgba(88,28,135,.2), rgba(15,23,42,.58))",
  },
  verde: {
    background: "rgba(20,83,45,.24)",
    border: "rgba(74,222,128,.28)",
    color: "#bbf7d0",
    dot: "#22c55e",
    panel: "linear-gradient(135deg, rgba(20,83,45,.2), rgba(15,23,42,.58))",
  },
  neutro: {
    background: "rgba(51,65,85,.26)",
    border: "rgba(148,163,184,.24)",
    color: "#e2e8f0",
    dot: "#94a3b8",
    panel: "linear-gradient(135deg, rgba(51,65,85,.18), rgba(15,23,42,.58))",
  },
} as const;

const page = {
  display: "grid",
  gap: "18px",
};

const hero = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.3fr) auto",
  gap: "18px",
  alignItems: "end",
};

const heroCopy = {
  display: "grid",
  gap: "10px",
};

const eyebrow = {
  margin: 0,
  color: "var(--sg-text-secondary)",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const title = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.05,
};

const subtitle = {
  margin: 0,
  color: "var(--sg-text-secondary)",
  maxWidth: "780px",
  lineHeight: "22px",
};

const heroSignals = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const signalChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid transparent",
  fontSize: "12px",
  fontWeight: 700,
};

const signalDot = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  flexShrink: 0,
};

const heroActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
  justifyContent: "flex-end",
};

const actionBase = {
  textDecoration: "none",
  borderRadius: "10px",
  padding: "11px 15px",
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
  background: "var(--sg-button-neutral-bg)",
  color: "var(--sg-button-neutral-text)",
};

const ghostAction = {
  ...actionBase,
  background: "var(--sg-panel-bg-soft)",
  color: "var(--sg-text-secondary)",
};

const snapshotGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
};

const snapshotCard = {
  display: "grid",
  gap: "8px",
  padding: "18px",
  borderRadius: "16px",
  background: "var(--sg-panel-bg)",
  border: "1px solid var(--sg-border-strong)",
  boxShadow: "var(--sg-shadow-card)",
};

const snapshotCardMain = {
  ...snapshotCard,
  background:
    "linear-gradient(135deg, rgba(15,23,42,.92), rgba(127,29,29,.38), rgba(220,38,38,.34))",
  border: "1px solid rgba(248,113,113,.24)",
};

const snapshotLabel = {
  color: "var(--sg-text-secondary)",
  fontSize: "12px",
};

const snapshotValue = {
  fontSize: "34px",
  lineHeight: 1,
};

const snapshotDetail = {
  margin: 0,
  color: "var(--sg-text-muted)",
  fontSize: "12px",
  lineHeight: "18px",
};

const commandGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, .8fr)",
  gap: "16px",
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, .85fr)",
  gap: "16px",
  alignItems: "start",
};

const rankingGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px",
};

const panel = {
  background: "var(--sg-panel-bg)",
  border: "1px solid var(--sg-border-strong)",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "var(--sg-shadow-card)",
};

const panelHighlight = {
  ...panel,
  background:
    "linear-gradient(180deg, rgba(15,23,42,.88), rgba(15,23,42,.72), rgba(127,29,29,.18))",
};

const panelHeader = {
  marginBottom: "14px",
};

const panelTitle = {
  margin: 0,
  fontSize: "18px",
};

const panelSubtitle = {
  margin: "6px 0 0",
  color: "var(--sg-text-secondary)",
  fontSize: "12px",
  lineHeight: "18px",
};

const focusGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const focusCard = {
  display: "grid",
  gap: "10px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid transparent",
};

const focusHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "baseline",
};

const focusTitle = {
  fontSize: "13px",
  color: "var(--sg-text-primary)",
  fontWeight: 700,
};

const focusValue = {
  fontSize: "26px",
  lineHeight: 1,
};

const focusDescription = {
  margin: 0,
  color: "var(--sg-text-muted)",
  fontSize: "12px",
  lineHeight: "18px",
};

const shortcutGrid = {
  display: "grid",
  gap: "10px",
};

const shortcutCard = {
  display: "grid",
  gap: "6px",
  padding: "14px",
  borderRadius: "14px",
  background: "var(--sg-card-bg-soft)",
  border: "1px solid var(--sg-border-soft)",
  textDecoration: "none",
  color: "var(--sg-text-primary)",
};

const shortcutEyebrow = {
  fontSize: "11px",
  fontWeight: 700,
  color: "var(--sg-text-subtle)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const shortcutTitle = {
  fontSize: "15px",
  lineHeight: "21px",
};

const shortcutDescription = {
  margin: 0,
  color: "var(--sg-text-muted)",
  fontSize: "12px",
  lineHeight: "18px",
};

const laneGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const lane = {
  display: "grid",
  gap: "10px",
  minWidth: 0,
};

const laneHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const lanePill = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  padding: "6px 10px",
  borderRadius: "999px",
  border: "1px solid transparent",
  fontSize: "12px",
  fontWeight: 700,
};

const laneCount = {
  color: "var(--sg-text-subtle)",
  fontSize: "12px",
};

const laneList = {
  display: "grid",
  gap: "8px",
};

const laneCard = {
  display: "grid",
  gap: "8px",
  background: "var(--sg-card-bg-alt)",
  border: "1px solid var(--sg-border-soft)",
  borderRadius: "14px",
  padding: "12px",
  textDecoration: "none",
  color: "var(--sg-text-primary)",
};

const laneCardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const laneId = {
  color: "var(--sg-text-subtle)",
  fontSize: "11px",
  fontWeight: 700,
};

const priorityBase = {
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "10px",
  fontWeight: 700,
};

const laneCardTitle = {
  fontSize: "14px",
  lineHeight: "20px",
};

const laneMetaRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const laneMetaChip = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 8px",
  borderRadius: "999px",
  background: "var(--sg-card-bg-soft)",
  border: "1px solid var(--sg-border-soft)",
  color: "var(--sg-text-muted)",
  fontSize: "11px",
};

const laneFooter = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  flexWrap: "wrap" as const,
  color: "var(--sg-text-subtle)",
  fontSize: "12px",
};

const stackColumn = {
  display: "grid",
  gap: "16px",
};

const compactList = {
  display: "grid",
  gap: "8px",
};

const compactCard = {
  display: "grid",
  gap: "8px",
  padding: "12px",
  borderRadius: "14px",
  background: "var(--sg-card-bg-soft)",
  border: "1px solid var(--sg-border-soft)",
  textDecoration: "none",
  color: "var(--sg-text-primary)",
};

const compactTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
};

const compactTitle = {
  fontSize: "14px",
  lineHeight: "20px",
};

const compactId = {
  color: "var(--sg-text-subtle)",
  fontSize: "11px",
  fontWeight: 700,
};

const compactFooter = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
  color: "var(--sg-text-muted)",
  fontSize: "11px",
};

const timeline = {
  display: "grid",
  gap: "10px",
};

const timelineRow = {
  display: "grid",
  gridTemplateColumns: "18px 1fr",
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
  minHeight: "24px",
  background: "var(--sg-border-soft)",
  marginTop: "5px",
};

const timelineCard = {
  background: "var(--sg-card-bg-soft)",
  border: "1px solid var(--sg-border-soft)",
  borderRadius: "14px",
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
  color: "var(--sg-text-primary)",
  textDecoration: "none",
  fontWeight: 700,
};

const timelineTime = {
  color: "var(--sg-text-subtle)",
  fontSize: "11px",
};

const timelineText = {
  margin: 0,
  color: "var(--sg-text-muted)",
  lineHeight: "19px",
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
  color: "var(--sg-text-muted)",
  fontSize: "13px",
};

const rankingValue = {
  color: "var(--sg-text-primary)",
};

const rankingTrack = {
  width: "100%",
  height: "8px",
  borderRadius: "999px",
  background: "var(--sg-border-soft)",
  overflow: "hidden" as const,
};

const rankingFill = {
  height: "100%",
  borderRadius: "999px",
};

const emptyTextStyle = {
  margin: 0,
  color: "var(--sg-text-subtle)",
  fontSize: "13px",
};
