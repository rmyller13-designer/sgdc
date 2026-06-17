"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
            Visão geral das demandas, produção, prazos, canais e eixos da Comunicação.
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
        <Painel titulo="Evolução das demandas">
          <div style={chartGrande}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={props.evolucaoMensal}>
                <defs>
                  <linearGradient id="dashboard-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.08)" strokeDasharray="3 3" />
                <XAxis dataKey="mes" stroke="#fecaca" />
                <YAxis allowDecimals={false} stroke="#fecaca" />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="demandas"
                  stroke="#f87171"
                  strokeWidth={3}
                  fill="url(#dashboard-area)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Painel>

        <Painel titulo="Distribuição por status">
          <div style={chartGrande}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={props.status}
                  dataKey="valor"
                  nameKey="titulo"
                  innerRadius={72}
                  outerRadius={112}
                  paddingAngle={3}
                >
                  {props.status.map((item, index) => (
                    <Cell key={item.titulo} fill={cores[index % cores.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
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
          <GraficoBarras dados={props.produtos} cor="#ef4444" />
        </Painel>

        <Painel titulo="Canais mais utilizados">
          <GraficoBarras dados={props.canais} cor="#f97316" />
        </Painel>

        <Painel titulo="Eixos mais utilizados">
          <GraficoBarras dados={props.eixos} cor="#3b82f6" />
        </Painel>

        <Painel titulo="Demandas por responsável">
          <GraficoBarras dados={props.responsaveis} cor="#a855f7" />
        </Painel>

        <Painel titulo="Demandas por setor">
          <GraficoBarras dados={props.setores} cor="#22c55e" />
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

function GraficoBarras({
  dados,
  cor,
}: {
  dados: Item[];
  cor: string;
}) {
  const lista = dados.slice(0, 8);

  if (lista.length === 0) {
    return <p style={vazio}>Nenhum dado encontrado.</p>;
  }

  return (
    <div style={chartNormal}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={lista} layout="vertical" margin={{ left: 8, right: 12 }}>
          <CartesianGrid stroke="rgba(255,255,255,.08)" strokeDasharray="3 3" />
          <XAxis type="number" stroke="#fecaca" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="titulo"
            stroke="#fecaca"
            width={132}
            tick={{ fontSize: 12 }}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="valor" fill={cor} radius={[0, 10, 10, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const tooltipStyle = {
  background: "rgba(15,23,42,.96)",
  border: "1px solid rgba(252,165,165,.22)",
  borderRadius: "10px",
  color: "#fff",
};

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

const chartGrande = {
  width: "100%",
  height: "340px",
};

const chartNormal = {
  width: "100%",
  height: "320px",
};

const prazosGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
};

const vazio = {
  color: "#fecaca",
};
