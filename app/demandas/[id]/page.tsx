import { supabase } from "../../../lib/supabase";
import StatusDemanda from "../../../components/StatusDemanda";
import ResponsavelDemanda from "../../../components/ResponsavelDemanda";
import ComentariosDemanda from "../../../components/ComentariosDemanda";
import HistoricoDemanda from "../../../components/HistoricoDemanda";
import EixosProdutosDemanda from "../../../components/EixosProdutosDemanda";



export default async function DetalheDemanda({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const demandaId = Number(id);

  if (isNaN(demandaId)) {
    return <p style={{ color: "red" }}>ID da demanda inválido.</p>;
  }

  const { data: demanda, error } = await supabase
    .from("demandas_completas")
    .select("*")
    .eq("id", demandaId)
    .single();

  const { data: anexos } = await supabase
    .from("demanda_anexos")
    .select("*")
    .eq("demanda_id", demandaId);

  if (error) {
    return <p style={{ color: "red" }}>Erro: {error.message}</p>;
  }

  return (
    <div>
      <h1>Demanda #{demanda.id}</h1>

      <div style={card}>
        <h2>{demanda.titulo}</h2>

        <p><strong>Descrição:</strong> {demanda.descricao}</p>
        <p><strong>Produto:</strong> {demanda.produto}</p>
        <p><strong>Setor:</strong> {demanda.setor}</p>
        <p><strong>Prioridade:</strong> {demanda.prioridade}</p>
        <p>
  <strong>Cadastrado por:</strong>{" "}
  {demanda.cadastrado_por || "Não informado"}
</p>

        <ResponsavelDemanda
  demandaId={demanda.id}
  responsavelAtual={demanda.responsavel}
/>

        <p><strong>Status:</strong> {demanda.status}</p>
        <StatusDemanda demandaId={demanda.id} statusAtual={demanda.status} />
        <p><strong>Data de entrega:</strong> {demanda.data_entrega || "Não informada"}</p>
      </div>

      <h2 style={{ marginTop: "30px" }}>Anexos</h2>

      {anexos && anexos.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
         {anexos.map((anexo) => (
  <div key={anexo.id} style={anexoStyle}>
    <a
      href={anexo.url_arquivo}
      target="_blank"
      style={{ color: "#93c5fd", textDecoration: "none" }}
    >
      📎 {anexo.nome_arquivo}
    </a>

    {anexo.tipo_arquivo?.startsWith("image/") && (
      <img
        src={anexo.url_arquivo}
        alt={anexo.nome_arquivo}
style={{
  marginTop: "12px",
  width: "220px",
  maxHeight: "180px",
  objectFit: "cover",
  borderRadius: "8px",
  border: "1px solid #334155",
}}
      />
    )}
  </div>
))}
        </div>
      ) : (
        <p>Nenhum anexo cadastrado.</p>
      )}

        <EixosProdutosDemanda demandaId={demanda.id} />

        <ComentariosDemanda demandaId={demanda.id} />

        <HistoricoDemanda demandaId={demanda.id} />

    </div>
  );
}

const card = {
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: "12px",
  padding: "20px",
  marginTop: "20px",
  maxWidth: "800px",
};

const anexoStyle = {
  color: "#93c5fd",
  textDecoration: "none",
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: "8px",
  padding: "12px",
  maxWidth: "800px",
};