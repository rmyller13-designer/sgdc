"use client";

import Image from "next/image";
import Link from "next/link";
import { corrigirTextoExibicao } from "@/lib/display-text";

type Item = {
  titulo: string;
  valor: number;
};

type EvolucaoItem = {
  mes: string;
  demandas: number;
};

const cores = ["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#a855f7", "#eab308"];

export default function DashboardClient(props: {
  total: number;
  recebidas: number;
  emProducao: number;
  emAprovacao: number;
  apParaPublicar: number;
  concluidas: number;
  canceladas: number;
  prazos: {
    atrasadas: number;
    hoje: number;
    ateTresDias: number;
    noPrazo: number;
    semPrazo: number;
  };
  produtos: Item[];
  canais: Item[];
  eixos: Item[];
  responsaveis: Item[];
  setores: Item[];
  status: Item[];
  evolucaoMensal: EvolucaoItem[];
}) {
  return (
    <div>
      <div style={logoWrap}>
        <Image
          src="/logo-sc.png"
          alt="Logomarca da instituição"
          width={220}
          height={220}
          priority
          style={logoInicio}
        />
      </div>

      <div style={hero}>
        <div>
          <p style={eyebrow}>Painel Executivo</p>
          <h1 style={title}>Dashboard ASCOM STACASA</h1>
          <p style={subtitle}>
            Visão geral das demandas, produção, prazos, canais e eixos da comunicação.
          </p>
        </div>

        <Link href="/demandas" style={botaoKanban}>
          Abrir Kanban
        </Link>
      </div>

      <div style={gridResumo}>
        <Card titulo="Total de Demandas" valor={props.total} destaque />
        <Card titulo="Recebidas" valor={props.recebidas} />
        <Card titulo="Em Produção" valor={props.emProducao} />
        <Card titulo="Em Aprovação" valor={props.emAprovacao} />
        <Card titulo="AP. para Publicar" valor={props.apParaPublicar} />
        <Card titulo="Concluídas" valor={props.concluidas} />
        <Card titulo="Canceladas" valor={props.canceladas} />
      </div>

      <div style={dashboardGrid}>
        <Painel titulo="Pulso mensal das demandas">
          <TrendColumns dados={props.evolucaoMensal} />
        </Painel>

        <Painel titulo="Matriz de status">
          <StatusDonut dados={props.status} />
        </Painel>

        <Painel titulo="Controle de prazos">
          <div style={prazosGrid}>
            <Card titulo="Atrasadas" valor={props.prazos.atrasadas} alerta />
            <Card titulo="Vencem Hoje" valor={props.prazos.hoje} />
            <Card titulo="Até 3 dias" valor={props.prazos.ateTresDias} />
            <Card titulo="No Prazo" valor={props.prazos.noPrazo} />
            <Card titulo="Sem Prazo" valor={props.prazos.semPrazo} />
          </div>
        </Painel>

        <Painel titulo="Produtos mais produzidos">
          <FloatingBars dados={props.produtos} cor="#ef4444" />
        </Painel>

        <Painel titulo="Canais mais utilizados">
          <FloatingBars dados={props.canais} cor="#f97316" />
        </Painel>

        <Painel titulo="Eixos mais utilizados">
          <FloatingBars dados={props.eixos} cor="#3b82f6" />
        </Painel>

        <Painel titulo="Demandas por responsável">
          <FloatingBars dados={props.responsaveis} cor="#a855f7" />
        </Painel>

        <Painel titulo="Demandas por setor">
          <FloatingBars dados={props.setores} cor="#22c55e" />
        </Painel>
      </div>
    </div>
  );
}

function Card({
  titulo,
  valor,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: number;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div style={alerta ? cardAlerta : destaque ? cardDestaque : card}>
      <p style={cardTitulo}>{titulo}</p>
      <strong style={cardValor}>{valor}</strong>
    </div>
  );
}

function Painel({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section style={painel}>
      <h2 style={sectionTitle}>{titulo}</h2>
      {children}
    </section>
  );
}

function TrendColumns({ dados }: { dados: EvolucaoItem[] }) {
  const lista = dados.slice(0, 12);
  const maximo = Math.max(...lista.map((item) => item.demandas), 1);

  if (lista.length === 0) {
    return <p style={vazio}>Nenhum dado encontrado.</p>;
  }

  return (
    <div style={trendWrap}>
      {lista.map((item, index) => {
        const altura = Math.max(14, (item.demandas / maximo) * 220);

        return (
          <div
            key={`${item.mes}-${index}`}
            style={trendItem}
            title={`${item.mes}: ${item.demandas}`}
          >
            <div style={trendValue}>{item.demandas}</div>
            <div
              style={{
                ...trendBar,
                height: `${altura}px`,
                background:
                  "linear-gradient(180deg, rgba(248,113,113,1), rgba(220,38,38,.22))",
              }}
            />
            <div style={trendLabel}>{item.mes}</div>
          </div>
        );
      })}
    </div>
  );
}

function StatusDonut({ dados }: { dados: Item[] }) {
  const total = dados.reduce((soma, item) => soma + item.valor, 0);

  if (dados.length === 0) {
    return <p style={vazio}>Nenhum dado encontrado.</p>;
  }

  const acumulados = dados.reduce<number[]>((lista, item, index) => {
    const anterior = index === 0 ? 0 : lista[index - 1];
    lista.push(anterior + item.valor);
    return lista;
  }, []);

  const gradiente = dados
    .map((item, index) => {
      const inicio = index === 0 ? 0 : acumulados[index - 1];
      const fim = acumulados[index];
      return `${cores[index % cores.length]} ${(inicio / total) * 100}% ${(fim / total) * 100}%`;
    })
    .join(", ");

  return (
    <div style={donutWrap}>
      <div
        style={{
          ...donut,
          background: `conic-gradient(${gradiente})`,
        }}
      >
        <div style={donutCenter}>
          <strong style={donutTotal}>{total}</strong>
          <span style={donutSub}>demandas</span>
        </div>
      </div>

      <div style={donutLegend}>
        {dados.map((item, index) => (
          <div key={item.titulo} style={legendRow}>
            <span
              style={{
                ...legendDot,
                background: cores[index % cores.length],
              }}
            />
            <span style={legendLabel}>{corrigirTextoExibicao(item.titulo)}</span>
            <strong>{item.valor}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingBars({ dados, cor }: { dados: Item[]; cor: string }) {
  const lista = dados.slice(0, 8);
  const maximo = Math.max(...lista.map((item) => item.valor), 1);

  if (lista.length === 0) {
    return <p style={vazio}>Nenhum dado encontrado.</p>;
  }

  return (
    <div style={floatingList}>
      {lista.map((item) => {
        const largura = Math.max(8, (item.valor / maximo) * 100);

        return (
          <div
            key={item.titulo}
            style={floatingCard}
            title={`${corrigirTextoExibicao(item.titulo)}: ${item.valor}`}
          >
            <div style={floatingHeader}>
              <span style={floatingTitle}>{corrigirTextoExibicao(item.titulo)}</span>
              <strong style={floatingValue}>{item.valor}</strong>
            </div>

            <div style={floatingTrack}>
              <div
                style={{
                  ...floatingFill,
                  width: `${largura}%`,
                  background: `linear-gradient(90deg, ${cor}, rgba(255,255,255,.88))`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "26px",
};

const logoWrap = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: "22px",
};

const logoInicio = {
  width: "auto",
  height: "auto",
  objectFit: "contain" as const,
};

const eyebrow = {
  color: "#fecaca",
  fontSize: "13px",
  margin: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const title = {
  fontSize: "36px",
  margin: "6px 0",
};

const subtitle = {
  color: "#fecaca",
  margin: 0,
  maxWidth: "760px",
};

const botaoKanban = {
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "white",
  textDecoration: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  border: "1px solid rgba(254, 202, 202, 0.35)",
  fontWeight: "bold",
  whiteSpace: "nowrap" as const,
};

const gridResumo = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginBottom: "24px",
};

const dashboardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(320px, 1fr))",
  gap: "18px",
  marginTop: "18px",
};

const card = {
  background: "rgba(15, 23, 42, 0.75)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "14px",
  padding: "18px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.24)",
  backdropFilter: "blur(10px)",
};

const cardDestaque = {
  ...card,
  background:
    "linear-gradient(135deg, rgba(220,38,38,0.96), rgba(127,29,29,0.96))",
};

const cardAlerta = {
  ...card,
  background:
    "linear-gradient(135deg, rgba(127,29,29,0.98), rgba(239,68,68,0.78))",
};

const cardTitulo = {
  color: "#fecaca",
  margin: 0,
  marginBottom: "8px",
  fontSize: "13px",
};

const cardValor = {
  fontSize: "34px",
};

const painel = {
  background: "linear-gradient(180deg, rgba(15,23,42,.82), rgba(30,41,59,.74))",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 18px 42px rgba(0,0,0,0.28)",
  backdropFilter: "blur(14px)",
};

const sectionTitle = {
  marginTop: 0,
  marginBottom: "18px",
  fontSize: "18px",
};

const trendWrap = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(42px, 1fr))",
  alignItems: "end",
  gap: "12px",
  minHeight: "300px",
  paddingTop: "10px",
  paddingBottom: "8px",
  borderBottom: "1px solid rgba(255,255,255,.08)",
};

const trendItem = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: "8px",
};

const trendValue = {
  color: "#fecaca",
  fontSize: "12px",
  fontWeight: 700,
};

const trendBar = {
  width: "100%",
  maxWidth: "44px",
  borderRadius: "14px 14px 6px 6px",
  boxShadow: "0 16px 22px rgba(239,68,68,.18)",
  border: "1px solid rgba(255,255,255,.12)",
};

const trendLabel = {
  color: "#cbd5e1",
  fontSize: "11px",
  writingMode: "vertical-rl" as const,
  transform: "rotate(180deg)",
  minHeight: "56px",
  textAlign: "center" as const,
};

const donutWrap = {
  display: "grid",
  gridTemplateColumns: "200px 1fr",
  gap: "18px",
  alignItems: "center",
};

const donut = {
  width: "180px",
  height: "180px",
  borderRadius: "999px",
  position: "relative" as const,
  boxShadow: "0 22px 38px rgba(0,0,0,.26)",
};

const donutCenter = {
  position: "absolute" as const,
  inset: "24px",
  borderRadius: "999px",
  background: "rgba(15,23,42,.98)",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  color: "white",
};

const donutTotal = {
  fontSize: "34px",
  lineHeight: "34px",
};

const donutSub = {
  color: "#cbd5e1",
  fontSize: "12px",
  marginTop: "6px",
};

const donutLegend = {
  display: "grid",
  gap: "10px",
};

const legendRow = {
  display: "grid",
  gridTemplateColumns: "12px 1fr auto",
  gap: "10px",
  alignItems: "center",
  color: "#e5e7eb",
  fontSize: "13px",
};

const legendDot = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
};

const legendLabel = {
  overflowWrap: "anywhere" as const,
};

const prazosGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
};

const floatingList = {
  display: "grid",
  gap: "12px",
};

const floatingCard = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(252,165,165,.14)",
  borderRadius: "14px",
  padding: "14px",
  boxShadow: "0 18px 32px rgba(0,0,0,.18)",
};

const floatingHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
  marginBottom: "10px",
};

const floatingTitle = {
  color: "#e5e7eb",
  fontSize: "13px",
  overflowWrap: "anywhere" as const,
};

const floatingValue = {
  color: "#fff",
  fontSize: "18px",
};

const floatingTrack = {
  width: "100%",
  height: "14px",
  background: "rgba(255,255,255,.08)",
  borderRadius: "999px",
  overflow: "hidden",
};

const floatingFill = {
  height: "100%",
  borderRadius: "999px",
  boxShadow: "0 10px 22px rgba(255,255,255,.14)",
};

const vazio = {
  color: "#fecaca",
};
