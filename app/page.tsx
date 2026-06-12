import { supabase } from "../lib/supabase";

export default async function Dashboard() {
  const { data: demandas } = await supabase
    .from("demandas_completas")
    .select("*");

  const total = demandas?.length || 0;

  const recebidas =
    demandas?.filter((d) => d.status === "RECEBIDO").length || 0;

  const emProducao =
    demandas?.filter((d) => d.status === "EM_PRODUCAO").length || 0;

  const emAprovacao =
    demandas?.filter((d) => d.status === "EM_APROVACAO").length || 0;

  const concluidas =
    demandas?.filter((d) => d.status === "CONCLUIDO").length || 0;

  const canceladas =
    demandas?.filter((d) => d.status === "CANCELADO").length || 0;

  const porProduto =
    demandas?.reduce((acc: any, demanda) => {
      const produto = demanda.produto || "Sem produto";
      acc[produto] = (acc[produto] || 0) + 1;
      return acc;
    }, {}) || {};

  const porResponsavel =
    demandas?.reduce((acc: any, demanda) => {
      const nome = demanda.responsavel || "Não atribuído";
      acc[nome] = (acc[nome] || 0) + 1;
      return acc;
    }, {}) || {};

  const porSetor =
    demandas?.reduce((acc: any, demanda) => {
      const setor = demanda.setor || "Sem setor";
      acc[setor] = (acc[setor] || 0) + 1;
      return acc;
    }, {}) || {};

  return (
    <div>
      <h1>Dashboard</h1>

      <p style={{ color: "#94a3b8" }}>
        Visão geral das demandas da Comunicação
      </p>

      <div style={grid}>
        <Card titulo="Total de Demandas" valor={total} />
        <Card titulo="Recebidas" valor={recebidas} />
        <Card titulo="Em Produção" valor={emProducao} />
        <Card titulo="Em Aprovação" valor={emAprovacao} />
        <Card titulo="Concluídas" valor={concluidas} />
        <Card titulo="Canceladas" valor={canceladas} />
      </div>

      <h2 style={{ marginTop: "40px" }}>Produção por Produto</h2>

      <div style={grid}>
        {Object.entries(porProduto).map(([produto, quantidade]) => (
          <Card
            key={produto}
            titulo={produto}
            valor={quantidade as number}
          />
        ))}
      </div>

      <h2 style={{ marginTop: "40px" }}>Demandas por Responsável</h2>

      <div style={grid}>
        {Object.entries(porResponsavel).map(([nome, quantidade]) => (
          <Card
            key={nome}
            titulo={nome}
            valor={quantidade as number}
          />
        ))}
      </div>

      <h2 style={{ marginTop: "40px" }}>Demandas por Setor</h2>

      <div style={grid}>
        {Object.entries(porSetor).map(([setor, quantidade]) => (
          <Card
            key={setor}
            titulo={setor}
            valor={quantidade as number}
          />
        ))}
      </div>
    </div>
  );
}

function Card({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <div style={card}>
      <p style={{ color: "#94a3b8", marginBottom: "10px" }}>
        {titulo}
      </p>

      <strong style={{ fontSize: "32px" }}>
        {valor}
      </strong>
    </div>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginTop: "20px",
};

const card = {
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: "12px",
  padding: "20px",
};