/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useAuth } from "@/components/AuthProvider";
import { podeEditarFluxo } from "@/lib/auth";
import { supabase } from "../lib/supabase";

const STATUS = [
  { id: 1, nome: "RECEBIDO", titulo: "Recebido" },
  { id: 2, nome: "EM_PRODUCAO", titulo: "Em Producao" },
  { id: 3, nome: "EM_APROVACAO", titulo: "Em Aprovacao" },
  { id: 4, nome: "AP_PARA_PUBLICAR", titulo: "AP. para Publicar" },
  { id: 5, nome: "CONCLUIDO", titulo: "Concluido" },
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
  preview_image_url?: string | null;
  etiqueta?: string | null;
  anexos_count?: number | null;
};

export default function KanbanDemandas({
  demandas,
}: {
  demandas: DemandaKanban[];
}) {
  const router = useRouter();
  const { usuario } = useAuth();
  const podeMover = podeEditarFluxo(usuario);
  const [lista, setLista] = useState(demandas || []);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("");
  const [menuAbertoId, setMenuAbertoId] = useState<number | null>(null);

  const setores = pegarUnicos(lista.map((d) => d.setor).filter(Boolean));
  const responsaveis = pegarUnicos(
    lista.map((d) => d.responsavel || d.cadastrado_por).filter(Boolean)
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
      demanda.responsavel?.toLowerCase().includes(texto) ||
      demanda.cadastrado_por?.toLowerCase().includes(texto) ||
      demanda.etiqueta?.toLowerCase().includes(texto);

    const passaSetor = !filtroSetor || demanda.setor === filtroSetor;
    const passaResponsavel =
      !filtroResponsavel ||
      (demanda.responsavel || demanda.cadastrado_por) === filtroResponsavel;
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

  function alternarMenu(demandaId: number) {
    setMenuAbertoId((atual) => (atual === demandaId ? null : demandaId));
  }

  async function aoArrastar(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;

    const demandaId = Number(draggableId);
    const novoStatusNome = destination.droppableId;
    const novoStatus = STATUS.find((s) => s.nome === novoStatusNome);

    if (!novoStatus) return;

    if (!podeMover || !usuario) {
      alert("Seu usuario nao tem permissao para mover demandas.");
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
      .eq("id", demandaId)
      .select("id")
      .single();

    if (error) {
      alert("Erro ao atualizar status: " + error.message);
      return;
    }

    router.refresh();

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaId,
      usuario_id: usuario.id,
      acao: `${usuario.nome} moveu a demanda para ${novoStatus.titulo}`,
    });
  }

  async function excluirDemanda(demanda: DemandaKanban) {
    if (!podeMover || !usuario) {
      alert("Seu usuario nao tem permissao para excluir demandas.");
      return;
    }

    const confirmar = window.confirm(
      `Excluir a demanda #${demanda.id} - ${demanda.titulo || "Sem titulo"}?`
    );

    if (!confirmar) return;

    const listaAnterior = lista;
    setLista((atual) => atual.filter((item) => item.id !== demanda.id));

    const response = await fetch(`/api/demandas/${demanda.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          funcao: usuario.funcao,
          email: usuario.email,
        },
      }),
    });

    const resultado = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setLista(listaAnterior);
      alert(
        "Erro ao excluir demanda: " +
          (resultado?.error || "Nao foi possivel excluir a demanda.")
      );
      return;
    }

    setMenuAbertoId(null);
    router.refresh();
  }

  return (
    <div style={raiz}>
      <div style={filtrosBox}>
        <input
          type="text"
          placeholder="Buscar por titulo, responsavel ou etiqueta..."
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
          <option value="">Todos os responsaveis</option>
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

      <div style={quadroArea}>
        <DragDropContext onDragEnd={aoArrastar}>
          <div className="kanban-scroll" style={kanbanViewport}>
            <div style={kanbanTrack}>
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
                            const prazo = calcularPrazo(
                              demanda.data_entrega,
                              demanda.status
                            );
                            const responsavel =
                              demanda.responsavel ||
                              demanda.cadastrado_por ||
                              "Sem responsavel";
                            const etiqueta =
                              demanda.etiqueta || demanda.setor || "Sem etiqueta";
                            const anexosCount = demanda.anexos_count || 0;

                            return (
                              <Draggable
                                key={demanda.id}
                                draggableId={String(demanda.id)}
                                index={index}
                                isDragDisabled={!podeMover}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      ...card,
                                      ...estiloCardPrazo(prazo.tipo),
                                      opacity: snapshot.isDragging ? 0.9 : 1,
                                      ...provided.draggableProps.style,
                                    }}
                                  >
                                    <div style={acoesTopo}>
                                      <a
                                        href={`/demandas/${demanda.id}`}
                                        style={botaoAcao}
                                        title="Abrir demanda"
                                        onClick={(event) =>
                                          event.stopPropagation()
                                        }
                                      >
                                        +
                                      </a>

                                      <button
                                        type="button"
                                        title="Acoes"
                                        aria-label={`Acoes da demanda #${demanda.id}`}
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          alternarMenu(demanda.id);
                                        }}
                                        style={botaoAcao}
                                      >
                                        ...
                                      </button>

                                      {menuAbertoId === demanda.id && (
                                        <div
                                          style={menuAcoes}
                                          onClick={(event) =>
                                            event.stopPropagation()
                                          }
                                        >
                                          <a
                                            href={`/demandas/${demanda.id}`}
                                            style={itemMenu}
                                          >
                                            Abrir demanda
                                          </a>

                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.preventDefault();
                                              event.stopPropagation();
                                              void excluirDemanda(demanda);
                                            }}
                                            style={itemMenuBotao}
                                            disabled={!podeMover}
                                          >
                                            Excluir demanda
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    <a
                                      href={`/demandas/${demanda.id}`}
                                      style={cardLink}
                                      onClick={() => setMenuAbertoId(null)}
                                    >
                                      {demanda.preview_image_url ? (
                                        <div style={previewWrap}>
                                          <img
                                            src={demanda.preview_image_url}
                                            alt={
                                              demanda.titulo ||
                                              `Demanda ${demanda.id}`
                                            }
                                            style={previewImage}
                                          />
                                        </div>
                                      ) : (
                                        <div style={previewPlaceholder}>
                                          <span style={previewPlaceholderText}>
                                            {etiqueta}
                                          </span>
                                        </div>
                                      )}

                                      <div style={cardBody}>
                                        <div style={cardHeaderClean}>
                                          <span style={idBadge}>
                                            #{demanda.id}
                                          </span>
                                          <span
                                            style={{
                                              ...prioridade,
                                              ...estiloPrioridade(
                                                demanda.prioridade
                                              ),
                                            }}
                                          >
                                            {demanda.prioridade || "NORMAL"}
                                          </span>
                                        </div>

                                        <strong style={titulo}>
                                          {demanda.titulo || "Sem titulo"}
                                        </strong>

                                        <div style={linhaMeta}>
                                          <span style={metaLabel}>
                                            Responsavel
                                          </span>
                                          <strong style={metaValor}>
                                            {responsavel}
                                          </strong>
                                        </div>

                                        <div style={linhaMeta}>
                                          <span style={metaLabel}>Data final</span>
                                          <strong style={metaValor}>
                                            {demanda.data_entrega
                                              ? formatarData(
                                                  demanda.data_entrega
                                                )
                                              : "Sem prazo"}
                                          </strong>
                                        </div>

                                        <div style={rodapeCard}>
                                          <div style={rodapeMeta}>
                                            <span style={metaChip}>
                                              <span style={metaIcon}>#</span>
                                              <span style={metaChipText}>
                                                {etiqueta}
                                              </span>
                                            </span>

                                            <span style={metaChip}>
                                              <span style={metaIcon}>@</span>
                                              <span style={metaChipText}>
                                                {demanda.data_entrega
                                                  ? formatarData(
                                                      demanda.data_entrega
                                                    )
                                                  : "Sem prazo"}
                                              </span>
                                            </span>

                                            <span style={metaChip}>
                                              <span style={metaIcon}>[]</span>
                                              <span style={metaChipText}>
                                                {anexosCount} anexo
                                                {anexosCount === 1
                                                  ? ""
                                                  : "s"}
                                              </span>
                                            </span>
                                          </div>

                                          <span
                                            style={{
                                              ...prazoBadge,
                                              color: prazo.cor,
                                            }}
                                          >
                                            {prazo.texto}
                                          </span>
                                        </div>
                                      </div>
                                    </a>
                                  </div>
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
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}

function pegarUnicos(lista: Array<string | null | undefined>) {
  return Array.from(
    new Set(lista.filter((item): item is string => Boolean(item)))
  ).sort();
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function calcularPrazo(dataEntrega?: string | null, status?: string | null) {
  if (status === "CONCLUIDO") {
    return { texto: "Concluida", cor: "#22c55e", tipo: "concluido" };
  }

  if (status === "CANCELADO") {
    return { texto: "Cancelada", cor: "#94a3b8", tipo: "cancelado" };
  }

  if (!dataEntrega) {
    return { texto: "Sem prazo", cor: "#94a3b8", tipo: "sem_prazo" };
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
      texto: `Atrasado ha ${Math.abs(diff)} dia(s)`,
      cor: "#ef4444",
      tipo: "atrasado",
    };
  }

  if (diff === 0) {
    return { texto: "Vence hoje", cor: "#f59e0b", tipo: "hoje" };
  }

  if (diff <= 3) {
    return {
      texto: `Vence em ${diff} dia(s)`,
      cor: "#fb923c",
      tipo: "proximo",
    };
  }

  return {
    texto: `${diff} dia(s) restantes`,
    cor: "#22c55e",
    tipo: "ok",
  };
}

function estiloCardPrazo(tipo: string) {
  if (tipo === "atrasado") {
    return { border: "1px solid rgba(239, 68, 68, 0.68)" };
  }

  if (tipo === "hoje") {
    return { border: "1px solid rgba(245, 158, 11, 0.68)" };
  }

  if (tipo === "proximo") {
    return { border: "1px solid rgba(251, 146, 60, 0.68)" };
  }

  if (tipo === "ok" || tipo === "concluido") {
    return { border: "1px solid rgba(34, 197, 94, 0.32)" };
  }

  return {};
}

function estiloPrioridade(prioridade?: string | null) {
  const valor = (prioridade || "NORMAL").toUpperCase();

  if (valor === "ALTA" || valor === "URGENTE") {
    return {
      background: "rgba(239, 68, 68, 0.16)",
      border: "1px solid rgba(248, 113, 113, 0.3)",
      color: "#fecaca",
    };
  }

  if (valor === "MEDIA") {
    return {
      background: "rgba(245, 158, 11, 0.16)",
      border: "1px solid rgba(251, 191, 36, 0.28)",
      color: "#fde68a",
    };
  }

  if (valor === "BAIXA") {
    return {
      background: "rgba(34, 197, 94, 0.14)",
      border: "1px solid rgba(74, 222, 128, 0.24)",
      color: "#bbf7d0",
    };
  }

  return {
    background: "rgba(59, 130, 246, 0.16)",
    border: "1px solid rgba(147, 197, 253, 0.18)",
    color: "#bfdbfe",
  };
}

const raiz = {
  display: "flex",
  flexDirection: "column" as const,
  minHeight: 0,
  height: "100%",
};

const filtrosBox = {
  display: "grid",
  gridTemplateColumns:
    "minmax(260px, 1.4fr) repeat(3, minmax(170px, 1fr)) auto",
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

const quadroArea = {
  flex: 1,
  width: "100%",
  minHeight: 0,
  overflow: "hidden" as const,
};

const kanbanViewport = {
  flex: 1,
  width: "100%",
  overflowX: "auto" as const,
  overflowY: "hidden" as const,
  minHeight: 0,
  height: "100%",
  paddingBottom: "10px",
};

const kanbanTrack = {
  display: "flex",
  alignItems: "stretch",
  gap: "14px",
  minWidth: "max-content",
  height: "100%",
};

const coluna = {
  flex: "0 0 272px",
  background:
    "linear-gradient(180deg, rgba(15, 23, 42, 0.82), rgba(12, 18, 28, 0.88))",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "14px",
  padding: "10px",
  display: "flex",
  flexDirection: "column" as const,
  height: "100%",
};

const colunaHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
  paddingBottom: "8px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const colunaTitulo = {
  fontSize: "13px",
  margin: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "#f4f4f5",
};

const contador = {
  background: "rgba(124, 58, 237, 0.18)",
  border: "1px solid rgba(196, 181, 253, 0.16)",
  borderRadius: "999px",
  padding: "3px 9px",
  fontSize: "12px",
  color: "#ddd6fe",
};

const cards = {
  flex: 1,
  display: "flex",
  flexDirection: "column" as const,
  gap: "10px",
  minHeight: 0,
  overflowY: "auto" as const,
  overflowX: "hidden" as const,
  paddingRight: "2px",
};

const card = {
  position: "relative" as const,
  background: "#18181b",
  borderRadius: "14px",
  color: "white",
  textDecoration: "none",
  boxShadow: "0 8px 18px rgba(0,0,0,0.22)",
  cursor: "grab",
  overflow: "hidden",
};

const cardLink = {
  display: "block",
  color: "white",
  textDecoration: "none",
};

const acoesTopo = {
  position: "absolute" as const,
  top: "8px",
  right: "8px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  zIndex: 3,
};

const botaoAcao = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(17, 24, 39, 0.88)",
  color: "#f8fafc",
  cursor: "pointer",
  fontSize: "12px",
  lineHeight: "12px",
  fontWeight: 800,
  display: "grid",
  placeItems: "center",
  textDecoration: "none",
};

const menuAcoes = {
  position: "absolute" as const,
  top: "36px",
  right: 0,
  minWidth: "160px",
  background: "rgba(17, 24, 39, 0.98)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  boxShadow: "0 16px 30px rgba(0,0,0,0.3)",
  padding: "6px",
  display: "grid",
  gap: "4px",
};

const itemMenu = {
  color: "#f8fafc",
  textDecoration: "none",
  fontSize: "13px",
  padding: "9px 10px",
  borderRadius: "8px",
  background: "transparent",
};

const itemMenuBotao = {
  background: "transparent",
  border: "none",
  color: "#fecaca",
  textAlign: "left" as const,
  fontSize: "13px",
  padding: "9px 10px",
  borderRadius: "8px",
  cursor: "pointer",
};

const previewWrap = {
  width: "100%",
  height: "96px",
  background: "#0f172a",
  overflow: "hidden",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const previewImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
  display: "block",
};

const previewPlaceholder = {
  width: "100%",
  height: "96px",
  background:
    "linear-gradient(135deg, rgba(15,23,42,1), rgba(30,41,59,.96), rgba(17,24,39,1))",
  display: "grid",
  placeItems: "center",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  padding: "16px",
  textAlign: "center" as const,
};

const previewPlaceholderText = {
  color: "#cbd5e1",
  fontSize: "14px",
  fontWeight: 700,
  overflowWrap: "anywhere" as const,
};

const cardBody = {
  padding: "11px",
  display: "grid",
  gap: "8px",
};

const cardHeaderClean = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const idBadge = {
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: 700,
};

const prioridade = {
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "10px",
  fontWeight: 700,
};

const titulo = {
  display: "block",
  fontSize: "14px",
  lineHeight: "19px",
  overflowWrap: "anywhere" as const,
};

const linhaMeta = {
  display: "grid",
  gap: "2px",
};

const metaLabel = {
  color: "#71717a",
  fontSize: "10px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const metaValor = {
  color: "#f4f4f5",
  fontSize: "12px",
};

const rodapeCard = {
  display: "grid",
  gap: "8px",
  paddingTop: "2px",
};

const rodapeMeta = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const metaChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#e4e4e7",
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "10px",
  fontWeight: 700,
};

const metaIcon = {
  fontSize: "10px",
  lineHeight: "10px",
  opacity: 0.82,
};

const metaChipText = {
  overflowWrap: "anywhere" as const,
};

const prazoBadge = {
  fontSize: "12px",
  fontWeight: 700,
};

const vazio = {
  color: "#94a3b8",
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "28px 0 12px",
};
