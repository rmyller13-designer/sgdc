import { supabase } from "../../../lib/supabase";
import StatusDemanda from "../../../components/StatusDemanda";
import ResponsavelDemanda from "../../../components/ResponsavelDemanda";
import ComentariosDemanda from "../../../components/ComentariosDemanda";
import HistoricoDemanda from "../../../components/HistoricoDemanda";
import EixosProdutosDemanda from "../../../components/EixosProdutosDemanda";
import ChecklistDemanda from "../../../components/ChecklistDemanda";
import UploadAnexo from "../../../components/UploadAnexo";
import ExcluirAnexo from "../../../components/ExcluirAnexo";
import EditarDemandaInfo from "../../../components/EditarDemandaInfo";

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
    <div style={page}>
      <div style={conteudo}>
        <section style={mainColumn}>
          <div style={topo}>
            <span style={idBadge}>Demanda #{demanda.id}</span>

            <h1 style={tituloPrincipal}>{demanda.titulo}</h1>

            <p style={descricaoTopo}>
              {demanda.descricao || "Sem descrição informada."}
            </p>
          </div>

          <div style={painelResumo}>
            <div style={campoResumo}>
              <span>Status</span>
              <strong>{formatarStatus(demanda.status)}</strong>
            </div>

            <div style={campoResumo}>
              <span>Responsável</span>
              <strong>{demanda.responsavel || "Não definido"}</strong>
            </div>

            <div style={campoResumo}>
              <span>Prioridade</span>
              <strong>{demanda.prioridade || "Não informada"}</strong>
            </div>

            <div style={campoResumo}>
              <span>Entrega</span>
              <strong>
                {demanda.data_entrega
                  ? formatarData(demanda.data_entrega)
                  : "Não informada"}
              </strong>
            </div>
          </div>

          <div style={tabs}>
            <span style={tabAtiva}>Detalhes</span>
            <span style={tab}>Eixos e Produtos</span>
            <span style={tab}>Anexos</span>
          </div>

          <section style={card}>
            <EditarDemandaInfo demandaId={demanda.id} />
          </section>

          <section style={card}>
            <h2 style={sectionTitle}>Fluxo da demanda</h2>

            <div style={acoesLinha}>
              <div style={acaoBox}>
                <ResponsavelDemanda
                  demandaId={demanda.id}
                  responsavelAtual={demanda.responsavel}
                />
              </div>

              <div style={acaoBox}>
                <StatusDemanda
                  demandaId={demanda.id}
                  statusAtual={demanda.status}
                />
              </div>
            </div>
          </section>

          <section style={card}>
            <EixosProdutosDemanda demandaId={demanda.id} />
          </section>

          <section style={card}>
            <ChecklistDemanda demandaId={demanda.id} />
          </section>

          <section style={card}>
            <h2 style={sectionTitle}>Anexos</h2>

            <UploadAnexo demandaId={demanda.id} />

            {anexos && anexos.length > 0 ? (
              <div style={anexosGrid}>
                {anexos.map((anexo) => (
                  <div key={anexo.id} style={anexoStyle}>
                    <a
                      href={anexo.url_arquivo}
                      target="_blank"
                      style={anexoLink}
                    >
                      📎 {anexo.nome_arquivo}
                    </a>

                    {anexo.tipo_arquivo?.startsWith("image/") && (
                      <img
                        src={anexo.url_arquivo}
                        alt={anexo.nome_arquivo}
                        style={imagemAnexo}
                      />
                    )}

                    <ExcluirAnexo
                      anexoId={anexo.id}
                      caminhoStorage={anexo.caminho_storage}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p style={textoFraco}>Nenhum anexo cadastrado.</p>
            )}
          </section>
        </section>

        <aside style={sideColumn}>
          <div style={sideSticky}>
            <h2 style={atividadeTitulo}>Atividade</h2>

            <section style={sideCard}>
              <ComentariosDemanda demandaId={demanda.id} />
            </section>

            <section style={sideCard}>
              <HistoricoDemanda demandaId={demanda.id} />
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatarStatus(status: string) {
  const nomes: Record<string, string> = {
    RECEBIDO: "Recebido",
    EM_PRODUCAO: "Em Produção",
    EM_APROVACAO: "Em Aprovação",
    AP_PARA_PUBLICAR: "AP. para Publicar",
    CONCLUIDO: "Concluído",
    CANCELADO: "Cancelado",
  };

  return nomes[status] || status;
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

const page = {
  color: "white",
};

const conteudo = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 380px",
  gap: "24px",
  alignItems: "start",
};

const mainColumn = {
  minWidth: 0,
};

const sideColumn = {
  minWidth: 0,
};

const sideSticky = {
  position: "sticky" as const,
  top: "100px",
};

const topo = {
  marginBottom: "22px",
};

const idBadge = {
  color: "#fecaca",
  fontSize: "13px",
  fontWeight: "bold",
};

const tituloPrincipal = {
  fontSize: "34px",
  margin: "8px 0 10px",
  lineHeight: "40px",
};

const descricaoTopo = {
  color: "#fecaca",
  maxWidth: "900px",
  lineHeight: "24px",
};

const painelResumo = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "24px",
};

const campoResumo = {
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "14px",
  padding: "14px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px",
  color: "#fecaca",
};

const tabs = {
  display: "flex",
  gap: "20px",
  borderBottom: "1px solid rgba(252, 165, 165, 0.2)",
  marginBottom: "18px",
};

const tab = {
  color: "#fecaca",
  padding: "12px 0",
  fontSize: "14px",
};

const tabAtiva = {
  color: "white",
  padding: "12px 0",
  fontSize: "14px",
  fontWeight: "bold",
  borderBottom: "2px solid #fca5a5",
};

const card = {
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "18px",
  padding: "20px",
  marginBottom: "18px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
};

const sectionTitle = {
  marginTop: 0,
  marginBottom: "16px",
  fontSize: "18px",
};

const acoesLinha = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(240px, 1fr))",
  gap: "16px",
};

const acaoBox = {
  background: "rgba(2, 6, 23, 0.35)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: "12px",
  padding: "14px",
};

const anexosGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
};

const anexoStyle = {
  background: "rgba(2, 6, 23, 0.35)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: "12px",
  padding: "12px",
};

const anexoLink = {
  color: "#93c5fd",
  textDecoration: "none",
  fontSize: "14px",
};

const imagemAnexo = {
  marginTop: "12px",
  width: "100%",
  height: "160px",
  objectFit: "contain" as const,
  background: "rgba(2, 6, 23, 0.55)",
  borderRadius: "10px",
  border: "1px solid #334155",
};

const textoFraco = {
  color: "#fecaca",
};

const atividadeTitulo = {
  marginTop: 0,
  marginBottom: "14px",
};

const sideCard = {
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "18px",
  padding: "16px",
  marginBottom: "16px",
};