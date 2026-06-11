import { supabase } from "../lib/supabase";

export default async function Home() {
  const { data, error } = await supabase
    .from("relatorio_por_produto")
    .select("*");

  return (
    <div>
      <h1>SGDC</h1>

      <h2>Relatório por Produto</h2>

      <p>
        Total de produtos encontrados: {data?.length ?? 0}
      </p>

      {error && (
        <pre style={{ color: "red" }}>
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "16px",
    marginTop: "20px",
  }}
>
  {data?.map((produto) => (
    <div
      key={produto.produto}
      style={{
        backgroundColor: produto.cor,
        borderRadius: "12px",
        padding: "20px",
        color: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      <h3>{produto.produto}</h3>

      <p
        style={{
          fontSize: "32px",
          fontWeight: "bold",
          margin: "10px 0",
        }}
      >
        {produto.quantidade}
      </p>

      <small>{produto.grupo}</small>
    </div>
  ))}
</div>
    </div>
  );
}