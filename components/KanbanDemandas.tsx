"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useAuth } from "@/components/AuthProvider";
import { podeEditarFluxo } from "@/lib/auth";
import { supabase } from "../lib/supabase";

const STATUS = [
  { id: 1, nome: "RECEBIDO", titulo: "Recebido" },
  { id: 2, nome: "EM_PRODUCAO", titulo: "Em Produção" },
  { id: 3, nome: "EM_APROVACAO", titulo: "Em Aprovação" },
  { id: 4, nome: "AP_PARA_PUBLICAR", titulo: "AP. para Publicar" },
  { id: 5, nome: "CONCLUIDO", titulo: "Concluído" },
  { id: 6, nome: "CANCELADO", titulo: "Cancelado" },
];

type DemandaKanban = {
  id: number;
  titulo?: string | null;
  descricao?: string | null;
  setor?: string | null;
  cadastrado_por?: string | null;
  responsavel?: string | null;
  prioridade?: string | null;
  status?: string | null;
  data_entrega?: string | null;
  eixos?: string | null;
  canais?: string | null;
  producao?: string | null;
};

export default function KanbanDemandas({
  demandas,
}: {
  demandas: DemandaKanban[];
}) {
  const { usuario } = useAuth();
  const podeMover = podeEditarFluxo(usuario);
  const [lista, setLista] = useState(demandas || []);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("");

  const setores = pegarUnicos(lista.map((d) => d.setor).filter(Boolean));
  const responsaveis = pegarUnicos(
    lista.map((d) => d.cadastrado_por).filter(Boolean)
  );
  const prioridades = pegarUnicos(
    lista.map((d) => d.prioridade).filter(Boolean)
  );

  const listaFiltrada = lista.filter((demanda) => {
    const texto = filtroTexto.toLowerCase();

    const passaTexto =
      !texto ||
      demanda.titulo?.toLowerCase().includes(texto) ||
      demanda.descricao?.toLowerCase().includes(texto) ||
      demanda.setor?.toLowerCase().includes(texto) ||
      demanda.cadastrado_por?.toLowerCase().includes(texto) ||
      demanda.eixos?.toLowerCase().includes(texto) ||
      demanda.canais?.toLowerCase().includes(texto) ||
      demanda.producao?.toLowerCase().includes(texto);

    const passaSetor = !filtroSetor || demanda.setor === filtroSetor;

    const passaResponsavel =
      !filtroResponsavel || demanda.cadastrado_por === filtroResponsavel;

    const passaPrioridade =
      !filtroPrioridade || demanda.prioridade === filtroPrioridade;

    return passaTexto && passaSetor && passaResponsavel && passaPrioridade;
  });

  function limparFiltros() {
    setFiltroTexto("");
    setFiltroSetor("");
    setFiltroResponsavel("");
    setFiltroPrioridade("");
  }

  async function aoArrastar(result: DropResult) {
    const { destination, draggableId } = result;

    if (!destination) return;

    const demandaId = Number(draggableId);
    const novoStatusNome = destination.droppableId;
    const novoStatus = STATUS.find((s) => s.nome === novoStatusNome);

    if (!novoStatus) return;

    if (!podeMover || !usuario) {
      alert("Seu usuário não tem permissão para mover demandas.");
      return;
    }

    setLista((atual) =>
      atual.map((demanda) =>
        demanda.id === demandaId
          ? { ...demanda, status: novoStatus.nome }
          : demanda
      )
    );

    const { error } = await supabase
      .from("demandas")
      .update({ status_id: novoStatus.id })
      .eq("id", demandaId);

    if (error) {
      alert("Erro ao atualizar status: " + error.message);
      return;
    }

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaId,
      usuario_id: usuario.id,
      acao: `${usuario.nome} moveu a demanda para ${novoStatus.titulo}`,
    });
  }

  return (
    <div>
      <div style={filtrosBox}>
        <input
          type="text"
          placeholder="Buscar por título, setor, eixo, canal ou produto..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          style={campoFiltro}
        />

        <select
          value={filtroSetor}
          onChange={(e) => setFiltroSetor(e.target.value)}
          style={selectFiltro}
        >
          <option value="">Todos os setores</option>
          {setores.map((setor) => (
            <option key={setor} value={setor}>
              {setor}
            </option>
          ))}
        </select>

        <select
          value={filtroResponsavel}
          onChange={(e) => setFiltroResponsavel(e.target.value)}
          style={selectFiltro}
        >
          <option value="">Todos os solicitantes</option>
          {responsaveis.map((responsavel) => (
            <option key={responsavel} value={responsavel}>
              {responsavel}
            </option>
          ))}
        </select>

        <select
          value={filtroPrioridade}
          onChange={(e) => setFiltroPrioridade(e.target.value)}
          style={selectFiltro}
        >
          <option value="">Todas as prioridades</option>
          {prioridades.map((prioridade) => (
            <option key={prioridade} value={prioridade}>
              {prioridade}
            </option>
          ))}
        </select>

        <button type="button" onClick={limparFiltros} style={botaoLimpar}>
          Limpar
        </button>
      </div>

      <p style={resultadoFiltro}>
        Exibindo {listaFiltrada.length} de {lista.length} demandas
      </p>

      <DragDropContext onDragEnd={aoArrastar}>
        <div style={kanban}>
          {STATUS.map((status) => {
            const demandasDaColuna = listaFiltrada.filter(
              (demanda) => demanda.status === status.nome
            );

            return (
              <section key={status.nome} style={coluna}>
                <div style={colunaHeader}>
                  <h2 style={colunaTitulo}>{status.titulo}</h2>
                  <span style={contador}>{demandasDaColuna.length}</span>
                </div>

                <Droppable droppableId={status.nome}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={cards}
                    >
                      {demandasDaColuna.length === 0 && (
                        <p style={vazio}>Nenhuma demanda</p>
                      )}

                      {demandasDaColuna.map((demanda, index) => {
                        const prazo = calcularPrazo(demanda.data_entrega);

                        return (
                          <Draggable
                            key={demanda.id}
                            draggableId={String(demanda.id)}
                            index={index}
                            isDragDisabled={!podeMover}
                          >
                            {(provided, snapshot) => (
                              <a
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                href={`/demandas/${demanda.id}`}
                                style={{
                                  ...card,
                                  ...estiloCardPrazo(prazo.tipo),
                                  opacity: snapshot.isDragging ? 0.85 : 1,
                                  transform: snapshot.isDragging
                                    ? "rotate(2deg)"
                                    : undefined,
                                  ...provided.draggableProps.style,
                                }}
                              >
                                <div style={cardTopo}>
                                  <span style={idBadge}>#{demanda.id}</span>
                                  <span style={prioridade}>
                                    {demanda.prioridade || "NORMAL"}
                                  </span>
                                </div>

                                <strong style={titulo}>{demanda.titulo}</strong>

                                <div style={info}>
                                  <span>Setor</span>
                                  <strong>
                                    {demanda.setor || "Não informado"}
                                  </strong>
                                </div>

                                <div style={info}>
                                  <span>Solicitante</span>
                                  <strong>
                                    {demanda.cadastrado_por || "Não informado"}
                                  </strong>
                                </div>

                                {demanda.data_entrega && (
                                  <>
                                    <div style={dataEntrega}>
                                      📅 {formatarData(demanda.data_entrega)}
                                    </div>

                                    <div
                                      style={{
                                        ...prazoBadge,
                                        color: prazo.cor,
                                      }}
                                    >
                                      {prazo.texto}
                                    </div>
                                  </>
                                )}

                                {!demanda.data_entrega && (
                                  <div
                                    style={{
                                      ...prazoBadge,
                                      color: prazo.cor,
                                      marginTop: "12px",
                                    }}
                                  >
                                    {prazo.texto}
                                  </div>
                                )}

                                {demanda.eixos && (
                                  <div style={blocoExtra}>
                                    <strong>📢 Eixos</strong>

                                    <div style={tags}>
                                      {quebrarLista(demanda.eixos).map(
                                        (eixo) => (
                                          <span key={eixo} style={tag}>
                                            {eixo}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                                {demanda.canais && (
                                  <div style={blocoExtra}>
                                    <strong>📍 Canais</strong>

                                    <div style={tags}>
                                      {quebrarLista(demanda.canais).map(
                                        (canal) => (
                                          <span key={canal} style={tag}>
                                            {canal}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                                {demanda.producao && (
                                  <div style={blocoExtra}>
                                    <strong>📦 Produção</strong>

                                    <div style={tags}>
                                      {quebrarProducao(demanda.producao).map(
                                        (produto) => (
                                          <span
                                            key={produto}
                                            style={tagProducao}
                                          >
                                            {produto}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </a>
                            )}
                          </Draggable>
                        );
                      })}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </section>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

function pegarUnicos(lista: Array<string | null | undefined>) {
  return Array.from(new Set(lista.filter((item): item is string => Boolean(item)))).sort();
}

function quebrarLista(valor: string) {
  return valor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function quebrarProducao(valor: string) {
  return valor
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function calcularPrazo(dataEntrega?: string | null) {
  if (!dataEntrega) {
    return {
      texto: "⚪ Sem prazo",
      cor: "#94a3b8",
      tipo: "sem_prazo",
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [ano, mes, dia] = dataEntrega.split("-").map(Number);
  const entrega = new Date(ano, mes - 1, dia);
  entrega.setHours(0, 0, 0, 0);

  const diff = Math.floor(
    (entrega.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff < 0) {
    return {
      texto: `🔴 Atrasado há ${Math.abs(diff)} dia(s)`,
      cor: "#ef4444",
      tipo: "atrasado",
    };
  }

  if (diff === 0) {
    return {
      texto: "🟡 Vence hoje",
      cor: "#f59e0b",
      tipo: "hoje",
    };
  }

  if (diff <= 3) {
    return {
      texto: `🟠 Vence em ${diff} dia(s)`,
      cor: "#fb923c",
      tipo: "proximo",
    };
  }

  return {
    texto: `🟢 ${diff} dia(s) restantes`,
    cor: "#22c55e",
    tipo: "ok",
  };
}

function estiloCardPrazo(tipo: string) {
  if (tipo === "atrasado") {
    return {
      border: "1px solid rgba(239, 68, 68, 0.85)",
      boxShadow:
        "0 0 0 1px rgba(239, 68, 68, 0.35), 0 12px 24px rgba(0,0,0,0.28)",
    };
  }

  if (tipo === "hoje") {
    return {
      border: "1px solid rgba(245, 158, 11, 0.85)",
      boxShadow:
        "0 0 0 1px rgba(245, 158, 11, 0.28), 0 12px 24px rgba(0,0,0,0.28)",
    };
  }

  if (tipo === "proximo") {
    return {
      border: "1px solid rgba(251, 146, 60, 0.85)",
    };
  }

  if (tipo === "ok") {
    return {
      border: "1px solid rgba(34, 197, 94, 0.45)",
    };
  }

  return {};
}

const filtrosBox = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 1.4fr) repeat(3, minmax(170px, 1fr)) auto",
  gap: "10px",
  marginBottom: "10px",
  alignItems: "center",
};

const campoFiltro = {
  background: "rgba(15, 23, 42, 0.82)",
  border: "1px solid rgba(252, 165, 165, 0.22)",
  color: "white",
  borderRadius: "10px",
  padding: "11px 12px",
};

const selectFiltro = {
  background: "rgba(15, 23, 42, 0.82)",
  border: "1px solid rgba(252, 165, 165, 0.22)",
  color: "white",
  borderRadius: "10px",
  padding: "11px 12px",
};

const botaoLimpar = {
  background: "rgba(127, 29, 29, 0.6)",
  border: "1px solid rgba(252, 165, 165, 0.25)",
  color: "#fee2e2",
  borderRadius: "10px",
  padding: "11px 14px",
  cursor: "pointer",
};

const resultadoFiltro = {
  color: "#fecaca",
  fontSize: "13px",
  marginTop: 0,
  marginBottom: "18px",
};

const kanban = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(250px, 1fr))",
  gap: "16px",
  alignItems: "start",
  overflowX: "auto" as const,
  paddingBottom: "20px",
};

const coluna = {
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "16px",
  padding: "14px",
  minHeight: "520px",
};

const colunaHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "14px",
};

const colunaTitulo = {
  fontSize: "15px",
  margin: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

const contador = {
  background: "rgba(239, 68, 68, 0.25)",
  border: "1px solid rgba(254, 202, 202, 0.25)",
  borderRadius: "999px",
  padding: "4px 10px",
  fontSize: "12px",
  color: "#fee2e2",
};

const cards = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "12px",
  minHeight: "460px",
};

const card = {
  background: "linear-gradient(180deg, #111827, #0f172a)",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  borderRadius: "14px",
  padding: "14px",
  color: "white",
  textDecoration: "none",
  boxShadow: "0 10px 20px rgba(0,0,0,0.22)",
  cursor: "grab",
};

const cardTopo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
};

const idBadge = {
  color: "#fecaca",
  fontSize: "12px",
  fontWeight: "bold",
};

const prioridade = {
  background: "rgba(37, 99, 235, 0.25)",
  border: "1px solid rgba(147, 197, 253, 0.25)",
  borderRadius: "999px",
  padding: "3px 8px",
  fontSize: "11px",
  color: "#bfdbfe",
};

const titulo = {
  display: "block",
  fontSize: "15px",
  lineHeight: "20px",
  marginBottom: "14px",
};

const info = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "3px",
  color: "#94a3b8",
  fontSize: "12px",
  marginTop: "8px",
};

const dataEntrega = {
  marginTop: "12px",
  fontSize: "12px",
  color: "#fecaca",
  borderTop: "1px solid rgba(148, 163, 184, 0.18)",
  paddingTop: "10px",
};

const prazoBadge = {
  marginTop: "8px",
  fontSize: "12px",
  fontWeight: "bold",
};

const blocoExtra = {
  marginTop: "10px",
  paddingTop: "10px",
  borderTop: "1px solid rgba(148, 163, 184, 0.18)",
  color: "#cbd5e1",
  fontSize: "12px",
};

const tags = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "6px",
  marginTop: "8px",
};

const tag = {
  background: "rgba(37, 99, 235, 0.18)",
  border: "1px solid rgba(147, 197, 253, 0.22)",
  color: "#bfdbfe",
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "11px",
  lineHeight: "14px",
};

const tagProducao = {
  background: "rgba(22, 101, 52, 0.22)",
  border: "1px solid rgba(134, 239, 172, 0.22)",
  color: "#bbf7d0",
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "11px",
  lineHeight: "14px",
};

const vazio = {
  color: "#94a3b8",
  fontSize: "13px",
  textAlign: "center" as const,
  marginTop: "30px",
};
