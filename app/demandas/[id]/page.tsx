import type { CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import StatusDemanda from "@/components/StatusDemanda";
import ResponsavelDemanda from "@/components/ResponsavelDemanda";
import ComentariosDemanda from "@/components/ComentariosDemanda";
import HistoricoDemanda from "@/components/HistoricoDemanda";
import EixosProdutosDemanda from "@/components/EixosProdutosDemanda";
import ChecklistDemanda from "@/components/ChecklistDemanda";
import UploadAnexo from "@/components/UploadAnexo";
import ExcluirAnexo from "@/components/ExcluirAnexo";
import EditarDemandaInfo from "@/components/EditarDemandaInfo";
import { criarGoogleCalendarUrl } from "@/lib/google-calendar";

type Anexo = {
  id: number;
  nome_arquivo: string;
  url_arquivo: string;
  tipo_arquivo: string | null;
  caminho_storage: string;
};

export default async function DetalheDemanda({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const demandaId = Number(id);

  if (Number.isNaN(demandaId)) {
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

  if (!demanda) {
    return <p style={{ color: "red" }}>Demanda não encontrada.</p>;
  }

  const anexosLista = (anexos || []) as Anexo[];
  const googleCalendarUrl = criarGoogleCalendarUrl({
    id: demanda.id,
    titulo: demanda.titulo,
    descricao: demanda.descricao,
    produto: demanda.produto,
    setor: demanda.setor,
    status: demanda.status,
    prioridade: demanda.prioridade,
    responsavel: demanda.responsavel,
    data_entrega: demanda.data_entrega,
  });

  return (
    <div style={page}>
      <div style={workspaceHeader}>
        <Link href="/demandas" style={backLink}>
          Demandas
        </Link>
        <span style={separator}>/</span>
        <span style={headerCurrent}>#{demanda.id}</span>
      </div>

      <div style={conteudo}>
        <section style={mainColumn}>
          <div style={topo}>
            <div style={tituloLinha}>
              <span style={idBadge}>Demanda #{demanda.id}</span>
              <span style={statusPill}>{formatarStatus(demanda.status)}</span>
            </div>

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
              {googleCalendarUrl && (
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={googleAgendaLink}
                >
                  Adicionar ao Google Agenda
                </a>
              )}
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

            {anexosLista.length > 0 ? (
              <div style={anexosGrid}>
                {anexosLista.map((anexo) => (
                  <div key={anexo.id} style={anexoStyle}>
                    <a
                      href={anexo.url_arquivo}
                      target="_blank"
                      rel="noreferrer"
                      style={anexoLink}
                    >
                      Anexo: {anexo.nome_arquivo}
                    </a>

                    {anexo.tipo_arquivo?.startsWith("image/") && (
                      <img
                        src={anexo.url_arquivo}
                        alt={anexo.nome_arquivo}
                        style={imagemAnexo}
                      />
                    )}

                    <ExcluirAnexo
                      demandaId={demanda.id}
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
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

const page: CSSProperties = {
  color: "white",
};

const workspaceHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#fecaca",
  fontSize: "13px",
  marginBottom: "18px",
};

const backLink: CSSProperties = {
  color: "#fee2e2",
  textDecoration: "none",
  fontWeight: 700,
};

const separator: CSSProperties = {
  color: "rgba(254, 202, 202, 0.55)",
};

const headerCurrent: CSSProperties = {
  color: "#fecaca",
};

const conteudo: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 360px",
  gap: "20px",
  alignItems: "start",
};

const mainColumn: CSSProperties = {
  minWidth: 0,
};

const sideColumn: CSSProperties = {
  minWidth: 0,
};

const sideSticky: CSSProperties = {
  position: "sticky",
  top: "100px",
};

const topo: CSSProperties = {
  background: "rgba(15, 23, 42, 0.68)",
  border: "1px solid rgba(252, 165, 165, 0.2)",
  borderRadius: "8px",
  padding: "22px",
  marginBottom: "14px",
  boxShadow: "0 14px 34px rgba(0,0,0,0.24)",
};

const tituloLinha: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const idBadge: CSSProperties = {
  color: "#fecaca",
  fontSize: "13px",
  fontWeight: 700,
};

const statusPill: CSSProperties = {
  background: "rgba(220, 38, 38, 0.28)",
  border: "1px solid rgba(252, 165, 165, 0.28)",
  borderRadius: "999px",
  color: "#fee2e2",
  fontSize: "12px",
  fontWeight: 700,
  padding: "6px 10px",
};

const tituloPrincipal: CSSProperties = {
  fontSize: "34px",
  margin: "8px 0 10px",
  lineHeight: "40px",
  overflowWrap: "anywhere",
};

const descricaoTopo: CSSProperties = {
  color: "#fecaca",
  maxWidth: "900px",
  lineHeight: "24px",
  margin: 0,
  whiteSpace: "pre-wrap",
};

const painelResumo: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
  gap: "10px",
  marginBottom: "16px",
};

const campoResumo: CSSProperties = {
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "8px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  color: "#fecaca",
  minWidth: 0,
};

const googleAgendaLink: CSSProperties = {
  color: "#bfdbfe",
  fontSize: "12px",
  fontWeight: 700,
  textDecoration: "none",
};

const tabs: CSSProperties = {
  display: "flex",
  gap: "18px",
  borderBottom: "1px solid rgba(252, 165, 165, 0.2)",
  marginBottom: "14px",
};

const tab: CSSProperties = {
  color: "#fecaca",
  padding: "12px 0",
  fontSize: "14px",
};

const tabAtiva: CSSProperties = {
  color: "white",
  padding: "12px 0",
  fontSize: "14px",
  fontWeight: 700,
  borderBottom: "2px solid #fca5a5",
};

const card: CSSProperties = {
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "14px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
};

const sectionTitle: CSSProperties = {
  marginTop: 0,
  marginBottom: "16px",
  fontSize: "18px",
};

const acoesLinha: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(240px, 1fr))",
  gap: "16px",
};

const acaoBox: CSSProperties = {
  background: "rgba(2, 6, 23, 0.35)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: "8px",
  padding: "14px",
};

const anexosGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
};

const anexoStyle: CSSProperties = {
  background: "rgba(2, 6, 23, 0.35)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: "8px",
  padding: "12px",
};

const anexoLink: CSSProperties = {
  color: "#93c5fd",
  textDecoration: "none",
  fontSize: "14px",
  overflowWrap: "anywhere",
};

const imagemAnexo: CSSProperties = {
  marginTop: "12px",
  width: "100%",
  height: "160px",
  objectFit: "contain",
  background: "rgba(2, 6, 23, 0.55)",
  borderRadius: "8px",
  border: "1px solid #334155",
};

const textoFraco: CSSProperties = {
  color: "#fecaca",
};

const atividadeTitulo: CSSProperties = {
  marginTop: 0,
  marginBottom: "14px",
};

const sideCard: CSSProperties = {
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "14px",
};
