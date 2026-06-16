import { connection } from "next/server";
import { supabase } from "../../lib/supabase";

type DemandaRelatorio = {
  id: number;
  titulo: string | null;
  produto: string | null;
  responsavel: string | null;
  cadastrado_por?: string | null;
  setor: string | null;
  status: string | null;
  data_solicitacao: string | null;
};

export default async function Relatorios({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  await connection();

  const params = await searchParams;

  let query = supabase
    .from("demandas_completas")
    .select("*")
    .order("id", { ascending: false });

  if (params.inicio) query = query.gte("data_solicitacao", params.inicio);
  if (params.fim) query = query.lte("data_solicitacao", params.fim);

  const { data: demandasData } = await query;
  const demandas = (demandasData || []) as DemandaRelatorio[];

  const total = demandas.length;

  function nomeResponsavel(demanda: DemandaRelatorio) {
    return demanda.responsavel || demanda.cadastrado_por || "NÃ£o atribuÃ­do";
  }

  const porStatus = demandas.reduce<Record<string, number>>((acc, demanda) => {
    const status = demanda.status || "Sem status";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const porProduto = demandas.reduce<Record<string, number>>((acc, demanda) => {
    const produto = demanda.produto || "Sem produto";
    acc[produto] = (acc[produto] || 0) + 1;
    return acc;
  }, {});

  const porResponsavel = demandas.reduce<Record<string, number>>((acc, demanda) => {
    const responsavel = nomeResponsavel(demanda);
    acc[responsavel] = (acc[responsavel] || 0) + 1;
    return acc;
  }, {});

  const porSetor = demandas.reduce<Record<string, number>>((acc, demanda) => {
    const setor = demanda.setor || "Sem setor";
    acc[setor] = (acc[setor] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1>RelatÃ³rios</h1>

      <form style={form}>
        <div>
          <label>Data inicial</label>
          <input type="date" name="inicio" defaultValue={params.inicio || ""} style={campo} />
        </div>

        <div>
          <label>Data final</label>
          <input type="date" name="fim" defaultValue={params.fim || ""} style={campo} />
        </div>

        <button type="submit" style={botao}>Filtrar</button>
      </form>

      <h2 style={{ marginTop: "30px" }}>Resumo</h2>

      <div style={grid}>
        <Card titulo="Total no perÃ­odo" valor={total} />
      </div>

      <h2 style={{ marginTop: "30px" }}>ProduÃ§Ã£o por Status</h2>

      <div style={grid}>
        {Object.entries(porStatus).map(([status, quantidade]) => (
          <Card key={status} titulo={status} valor={quantidade} />
        ))}
      </div>

      <h2 style={{ marginTop: "30px" }}>ProduÃ§Ã£o por Produto</h2>

      <div style={grid}>
        {Object.entries(porProduto).map(([produto, quantidade]) => (
          <Card key={produto} titulo={produto} valor={quantidade} />
        ))}
      </div>

      <h2 style={{ marginTop: "30px" }}>ProduÃ§Ã£o por ResponsÃ¡vel</h2>

      <div style={grid}>
        {Object.entries(porResponsavel).map(([responsavel, quantidade]) => (
          <Card key={responsavel} titulo={responsavel} valor={quantidade} />
        ))}
      </div>

      <h2 style={{ marginTop: "30px" }}>ProduÃ§Ã£o por Setor</h2>

      <div style={grid}>
        {Object.entries(porSetor).map(([setor, quantidade]) => (
          <Card key={setor} titulo={setor} valor={quantidade} />
        ))}
      </div>

      <h2 style={{ marginTop: "40px" }}>Demandas do perÃ­odo</h2>

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>TÃ­tulo</th>
            <th style={th}>Produto</th>
            <th style={th}>ResponsÃ¡vel</th>
            <th style={th}>Setor</th>
            <th style={th}>Status</th>
            <th style={th}>Data</th>
          </tr>
        </thead>

        <tbody>
          {demandas.map((demanda) => (
            <tr key={demanda.id}>
              <td style={td}>{demanda.id}</td>
              <td style={td}>
                <a href={`/demandas/${demanda.id}`} style={{ color: "#93c5fd", textDecoration: "none" }}>
                  {demanda.titulo}
                </a>
              </td>
              <td style={td}>{demanda.produto}</td>
              <td style={td}>{nomeResponsavel(demanda)}</td>
              <td style={td}>{demanda.setor}</td>
              <td style={td}>{demanda.status}</td>
              <td style={td}>{demanda.data_solicitacao || "Sem data"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div style={card}>
      <p style={{ color: "#94a3b8" }}>{titulo}</p>
      <strong style={{ fontSize: "32px" }}>{valor}</strong>
    </div>
  );
}

const form = {
  display: "flex",
  gap: "12px",
  alignItems: "end",
  marginTop: "20px",
};

const campo = {
  display: "block",
  marginTop: "6px",
  padding: "10px",
  background: "#111827",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "8px",
};

const botao = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "11px 20px",
  borderRadius: "8px",
  cursor: "pointer",
};

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

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  marginTop: "20px",
};

const th = {
  border: "1px solid #334155",
  padding: "12px",
  background: "#1f2937",
};

const td = {
  border: "1px solid #334155",
  padding: "12px",
};
