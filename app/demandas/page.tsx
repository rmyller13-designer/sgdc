import { supabase } from "../../lib/supabase";

export default async function Demandas() {
  const { data: demandas, error } = await supabase
    .from("demandas_completas")
    .select("*")
    .order("id", { ascending: false });

  return (
    <div style={{ padding: "30px", color: "white" }}>
      <h1>Demandas</h1>

      {error && (
        <pre style={{ color: "red" }}>
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "20px",
        }}
      >
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Título</th>
            <th style={th}>Produto</th>
            <th style={th}>Cadastrado por</th>
            <th style={th}>Setor</th>
            <th style={th}>Prioridade</th>
            <th style={th}>Status</th>
          </tr>
        </thead>

        <tbody>
          {demandas?.map((demanda) => (
            <tr key={demanda.id}>
              <td style={td}>{demanda.id}</td>
              <td style={td}>
  <a
    href={`/demandas/${demanda.id}`}
    style={{ color: "#93c5fd", textDecoration: "none" }}
  >
    {demanda.titulo}
  </a>
</td>
              <td style={td}>{demanda.produto}</td>
              <td style={td}>{demanda.cadastrado_por || "Não informado"}</td>
              <td style={td}>{demanda.setor}</td>
              
              <td style={td}>{demanda.prioridade}</td>
              <td style={td}>{demanda.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = {
  border: "1px solid #444",
  padding: "10px",
  background: "#1e293b",
};

const td = {
  border: "1px solid #444",
  padding: "10px",
};