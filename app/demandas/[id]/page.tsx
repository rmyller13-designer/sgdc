import type { CSSProperties } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { supabase } from "@/lib/supabase";
import StatusDemanda from "@/components/StatusDemanda";
import ResponsavelDemanda from "@/components/ResponsavelDemanda";
import ComentariosDemanda from "@/components/ComentariosDemanda";
import HistoricoDemanda from "@/components/HistoricoDemanda";
import EixosProdutosDemanda from "@/components/EixosProdutosDemanda";
import ChecklistDemanda from "@/components/ChecklistDemanda";
import DemandaAnexosSection, {
  type DemandaAnexoItem,
} from "@/components/DemandaAnexosSection";
import EditarDemandaInfo from "@/components/EditarDemandaInfo";
import GoogleTaskButton from "@/components/GoogleTaskButton";
import RichTextContent from "@/components/RichTextContent";
import MemoriaEditorialSection from "@/components/MemoriaEditorialSection";
import { buscarMemoriaEditorial } from "@/lib/memoria-editorial";
import {
  corrigirTextoExibicao,
  formatarTituloHumano,
} from "@/lib/display-text";

export default async function DetalheDemanda({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const demandaId = Number(id);

  if (Number.isNaN(demandaId)) {
    return <p style={{ color: "red" }}>ID da demanda invalido.</p>;
  }

  const { data: demanda, error } = await supabase
    .from("demandas_completas")
    .select("*")
    .eq("id", demandaId)
    .limit(1)
    .maybeSingle();

  const { data: anexos } = await supabase
    .from("demanda_anexos")
    .select("*")
    .eq("demanda_id", demandaId);

  const sugestoesMemoria = await buscarMemoriaEditorial({
    titulo: demanda?.titulo,
    descricao: demanda?.descricao,
    setor: demanda?.setor,
    excluirDemandaId: demandaId,
  });

  if (error) {
    return (
      <p style={{ color: "red" }}>
        Nao foi possivel carregar a demanda agora.
      </p>
    );
  }

  if (!demanda) {
    return <p style={{ color: "red" }}>Demanda nao encontrada.</p>;
  }

  const anexosLista = (anexos || []) as DemandaAnexoItem[];
  const googleTaskDemanda = {
    id: demanda.id,
    titulo: demanda.titulo,
    descricao: demanda.descricao,
    produto: demanda.produto,
    setor: demanda.setor,
    status: demanda.status,
    prioridade: demanda.prioridade,
    responsavel: demanda.responsavel,
    data_entrega: demanda.data_entrega,
  };

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

            <RichTextContent
              value={demanda.descricao}
              emptyText="Sem descricao informada."
              style={descricaoTopo}
            />
          </div>

          <div style={painelResumo}>
            <div style={campoResumo}>
              <span>Status</span>
              <strong>{formatarStatus(demanda.status)}</strong>
            </div>

            <div style={campoResumo}>
              <span>Responsavel</span>
              <strong>
                {corrigirTextoExibicao(demanda.responsavel) || "Nao definido"}
              </strong>
            </div>

            <div style={campoResumo}>
              <span>Prioridade</span>
              <strong>
                {formatarTituloHumano(demanda.prioridade) || "Nao informada"}
              </strong>
            </div>

            <div style={campoResumo}>
              <span>Entrega</span>
              <strong>
                {demanda.data_entrega
                  ? formatarData(demanda.data_entrega)
                  : "Nao informada"}
              </strong>
              <GoogleTaskButton demanda={googleTaskDemanda} style={googleAgendaLink}>
                Adicionar como tarefa no Google Agenda
              </GoogleTaskButton>
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
            <MemoriaEditorialSection
              itens={sugestoesMemoria}
              titulo="Demandas relacionadas"
              subtitulo="Referencias editoriais para reaproveitar conteudo, estrutura e contexto."
              vazio="Nenhuma demanda parecida encontrada para esta solicitacao."
            />
          </section>

          <section style={card}>
            <h2 style={sectionTitle}>Anexos</h2>
            <DemandaAnexosSection demandaId={demanda.id} anexos={anexosLista} />
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
    EM_PRODUCAO: "Em Producao",
    EM_APROVACAO: "Em Aprovacao",
    AP_PARA_PUBLICAR: "AP. para Publicar",
    CONCLUIDO: "Concluido",
    CANCELADO: "Cancelado",
  };

  return nomes[status] || corrigirTextoExibicao(status);
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
  color: "var(--sg-nav-chip-text)",
  textDecoration: "none",
  fontWeight: 700,
};

const separator: CSSProperties = {
  color: "var(--sg-text-subtle)",
};

const headerCurrent: CSSProperties = {
  color: "var(--sg-text-secondary)",
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
  background: "var(--sg-panel-bg)",
  border: "1px solid var(--sg-border-strong)",
  borderRadius: "8px",
  padding: "22px",
  marginBottom: "14px",
  boxShadow: "var(--sg-shadow-card)",
};

const tituloLinha: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const idBadge: CSSProperties = {
  color: "var(--sg-text-secondary)",
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
  color: "var(--sg-text-secondary)",
  maxWidth: "900px",
  lineHeight: "24px",
  margin: 0,
};

const painelResumo: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
  gap: "10px",
  marginBottom: "16px",
};

const campoResumo: CSSProperties = {
  background: "var(--sg-panel-bg-soft)",
  border: "1px solid var(--sg-border-strong)",
  borderRadius: "8px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  color: "var(--sg-text-secondary)",
  minWidth: 0,
};

const googleAgendaLink: CSSProperties = {
  color: "var(--sg-text-muted)",
  fontSize: "12px",
  fontWeight: 700,
  textDecoration: "none",
};

const tabs: CSSProperties = {
  display: "flex",
  gap: "18px",
  borderBottom: "1px solid var(--sg-border-strong)",
  marginBottom: "14px",
};

const tab: CSSProperties = {
  color: "var(--sg-text-secondary)",
  padding: "12px 0",
  fontSize: "14px",
};

const tabAtiva: CSSProperties = {
  color: "var(--sg-text-primary)",
  padding: "12px 0",
  fontSize: "14px",
  fontWeight: 700,
  borderBottom: "2px solid #fca5a5",
};

const card: CSSProperties = {
  background: "var(--sg-panel-bg)",
  border: "1px solid var(--sg-border-strong)",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "14px",
  boxShadow: "var(--sg-shadow-card)",
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
  background: "var(--sg-card-bg-soft)",
  border: "1px solid var(--sg-border-soft)",
  borderRadius: "8px",
  padding: "14px",
};

const atividadeTitulo: CSSProperties = {
  marginTop: 0,
  marginBottom: "14px",
};

const sideCard: CSSProperties = {
  background: "var(--sg-panel-bg)",
  border: "1px solid var(--sg-border-strong)",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "14px",
};
