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
import {
  corrigirTextoExibicao,
  formatarSetorExibicao,
  formatarTituloHumano,
} from "@/lib/display-text";

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
  const filtrosAtivos = [
    filtroTexto,
    filtroSetor,
    filtroResponsavel,
    filtroPrioridade,
  ].filter(Boolean).length;

  const listaFiltrada = lista.filter((demanda) => {
    const texto = filtroTexto.toLowerCase();

    const passaTexto =
      !texto ||
      corrigirTextoExibicao(demanda.titulo)?.toLowerCase().includes(texto) ||
      corrigirTextoExibicao(demanda.descricao)?.toLowerCase().includes(texto) ||
      corrigirTextoExibicao(demanda.setor)?.toLowerCase().includes(texto) ||
      corrigirTextoExibicao(demanda.responsavel)?.toLowerCase().includes(texto) ||
      corrigirTextoExibicao(demanda.cadastrado_por)?.toLowerCase().includes(texto) ||
      corrigirTextoExibicao(demanda.etiqueta)?.toLowerCase().includes(texto);

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
      alert("Seu usuário não tem permissão para excluir demandas.");
      return;
    }

    const confirmar = window.confirm(
      `Excluir a demanda #${demanda.id} - ${corrigirTextoExibicao(demanda.titulo) || "Sem título"}?`
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
          (resultado?.error || "Não foi possível excluir a demanda.")
      );
      return;
    }

    setMenuAbertoId(null);
    router.refresh();
  }

  return (
    <div style={raiz}>
      <div style={toolbar}>
        <div style={buscaWrap}>
          <span style={toolbarIcon}>Q</span>
          <input
            type="text"
            placeholder="Pesquisar"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            style={campoBuscaCompacto}
          />
        </div>

        <div style={controlesWrap}>
          <label style={filtroChip}>
            <span style={chipLabel}>Setor</span>
            <select
              value={filtroSetor}
              onChange={(e) => setFiltroSetor(e.target.value)}
              style={selectCompacto}
            >
              <option value="" style={optionCompacto}>
                Todos
              </option>
                  {setores.map((setor) => (
                    <option key={setor} value={setor} style={optionCompacto}>
                      {formatarSetorExibicao(setor)}
                    </option>
                  ))}
            </select>
          </label>

          <label style={filtroChip}>
            <span style={chipLabel}>Responsável</span>
            <select
              value={filtroResponsavel}
              onChange={(e) => setFiltroResponsavel(e.target.value)}
              style={selectCompacto}
            >
              <option value="" style={optionCompacto}>
                Todos
              </option>
                  {responsaveis.map((responsavel) => (
                    <option
                      key={responsavel}
                      value={responsavel}
                      style={optionCompacto}
                    >
                      {corrigirTextoExibicao(responsavel)}
                    </option>
                  ))}
            </select>
          </label>

          <label style={filtroChip}>
            <span style={chipLabel}>Prioridade</span>
            <select
              value={filtroPrioridade}
              onChange={(e) => setFiltroPrioridade(e.target.value)}
              style={selectCompacto}
            >
              <option value="" style={optionCompacto}>
                Todas
              </option>
              {prioridades.map((prioridade) => (
                <option
                  key={prioridade}
                  value={prioridade}
                  style={optionCompacto}
                >
                  {prioridade}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={limparFiltros}
            style={{
              ...botaoLimpar,
              ...(filtrosAtivos > 0 ? botaoLimparAtivo : null),
            }}
          >
            Limpar{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ""}
          </button>
        </div>
      </div>
      <div style={quadroArea}>
        <DragDropContext onDragEnd={aoArrastar}>
          <div className="kanban-scroll" style={kanbanViewport}>
            <div style={kanbanTrack}>
              {STATUS.map((status) => {
                const demandasDaColuna = listaFiltrada.filter(
                  (demanda) => demanda.status === status.nome
                );
                const temaStatus = estiloStatus(status.nome);

                return (
                  <section
                    key={status.nome}
                    style={{ ...coluna, ...temaStatus.coluna }}
                  >
                    <div style={colunaHeader}>
                      <h2
                        style={{
                          ...colunaTitulo,
                          ...temaStatus.badge,
                        }}
                      >
                        <span
                          style={{
                            ...statusDot,
                            background: temaStatus.dot,
                          }}
                        />
                        {status.titulo}
                      </h2>
                      <span
                        style={{
                          ...contador,
                          ...temaStatus.contador,
                        }}
                      >
                        {demandasDaColuna.length}
                      </span>
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
                              "Sem responsável";
                            const etiqueta =
                              corrigirTextoExibicao(demanda.etiqueta) ||
                              formatarSetorExibicao(demanda.setor) ||
                              "Sem etiqueta";
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
                                        title="Ações"
                                        aria-label={`Ações da demanda #${demanda.id}`}
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
                                            {formatarTituloHumano(demanda.prioridade || "NORMAL")}
                                          </span>
                                        </div>

                                        <strong style={titulo}>
                                          {corrigirTextoExibicao(demanda.titulo) || "Sem título"}
                                        </strong>

                                        <div style={resumoLinha}>
                                          <span style={resumoItem}>
                                            <span style={resumoIcon}>o</span>
                                            <strong style={metaValor}>
                                              {corrigirTextoExibicao(responsavel)}
                                            </strong>
                                          </span>

                                          <span style={resumoItem}>
                                            <span style={resumoIcon}>@</span>
                                            <span style={resumoTexto}>
                                              {demanda.data_entrega
                                                ? formatarData(
                                                    demanda.data_entrega
                                                  )
                                                : "Sem prazo"}
                                            </span>
                                          </span>
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
    return { texto: "Concluída", cor: "#22c55e", tipo: "concluido" };
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
      texto: `Atrasado há ${Math.abs(diff)} dia(s)`,
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

function estiloStatus(status: string) {
  if (status === "RECEBIDO") {
    return {
      coluna: {
        background:
          "linear-gradient(180deg, rgba(24, 24, 27, 0.95), rgba(20, 20, 24, 0.96))",
      },
      badge: {
        background: "rgba(63, 63, 70, 0.72)",
        border: "1px solid rgba(82, 82, 91, 0.88)",
        color: "#fafafa",
      },
      dot: "#e4e4e7",
      contador: {
        background: "rgba(63, 63, 70, 0.54)",
        border: "1px solid rgba(82, 82, 91, 0.78)",
        color: "#f4f4f5",
      },
    };
  }

  if (status === "EM_PRODUCAO") {
    return {
      coluna: {
        background:
          "linear-gradient(180deg, rgba(26, 22, 44, 0.96), rgba(20, 18, 34, 0.98))",
      },
      badge: {
        background: "rgba(99, 70, 236, 0.92)",
        border: "1px solid rgba(167, 139, 250, 0.78)",
        color: "#ffffff",
      },
      dot: "#f5f3ff",
      contador: {
        background: "rgba(88, 64, 205, 0.44)",
        border: "1px solid rgba(129, 140, 248, 0.55)",
        color: "#ddd6fe",
      },
    };
  }

  if (status === "EM_APROVACAO") {
    return {
      coluna: {
        background:
          "linear-gradient(180deg, rgba(43, 23, 50, 0.96), rgba(31, 19, 38, 0.98))",
      },
      badge: {
        background: "rgba(205, 70, 214, 0.92)",
        border: "1px solid rgba(232, 121, 249, 0.7)",
        color: "#ffffff",
      },
      dot: "#fdf4ff",
      contador: {
        background: "rgba(168, 85, 247, 0.28)",
        border: "1px solid rgba(216, 180, 254, 0.42)",
        color: "#f5d0fe",
      },
    };
  }

  if (status === "AP_PARA_PUBLICAR") {
    return {
      coluna: {
        background:
          "linear-gradient(180deg, rgba(31, 22, 23, 0.96), rgba(28, 18, 20, 0.98))",
      },
      badge: {
        background: "rgba(239, 68, 68, 0.92)",
        border: "1px solid rgba(252, 165, 165, 0.68)",
        color: "#ffffff",
      },
      dot: "#fff1f2",
      contador: {
        background: "rgba(239, 68, 68, 0.22)",
        border: "1px solid rgba(248, 113, 113, 0.36)",
        color: "#fecaca",
      },
    };
  }

  if (status === "CONCLUIDO") {
    return {
      coluna: {
        background:
          "linear-gradient(180deg, rgba(16, 36, 28, 0.96), rgba(15, 28, 24, 0.98))",
      },
      badge: {
        background: "rgba(20, 184, 166, 0.9)",
        border: "1px solid rgba(94, 234, 212, 0.7)",
        color: "#ffffff",
      },
      dot: "#f0fdfa",
      contador: {
        background: "rgba(16, 185, 129, 0.22)",
        border: "1px solid rgba(74, 222, 128, 0.34)",
        color: "#bbf7d0",
      },
    };
  }

  return {
    coluna: {
      background:
        "linear-gradient(180deg, rgba(31, 22, 23, 0.96), rgba(25, 18, 19, 0.98))",
    },
    badge: {
      background: "rgba(100, 116, 139, 0.84)",
      border: "1px solid rgba(148, 163, 184, 0.58)",
      color: "#ffffff",
    },
    dot: "#f8fafc",
    contador: {
      background: "rgba(71, 85, 105, 0.26)",
      border: "1px solid rgba(148, 163, 184, 0.3)",
      color: "#cbd5e1",
    },
  };
}

const raiz = {
  display: "flex",
  flexDirection: "column" as const,
  minHeight: 0,
  height: "100%",
};

const toolbar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  flexWrap: "wrap" as const,
  marginBottom: "8px",
};

const buscaWrap = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  minWidth: "190px",
  padding: "0 10px",
  height: "32px",
  borderRadius: "999px",
  background: "rgba(24, 24, 27, 0.88)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const controlesWrap = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap" as const,
  gap: "6px",
  flex: 1,
};

const toolbarIcon = {
  color: "#71717a",
  fontSize: "10px",
  fontWeight: 700,
};

const campoBuscaCompacto = {
  background: "transparent",
  border: "none",
  color: "white",
  outline: "none",
  width: "180px",
  fontSize: "12px",
};

const filtroChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  height: "32px",
  padding: "0 10px",
  borderRadius: "999px",
  background: "rgba(24, 24, 27, 0.88)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const chipLabel = {
  color: "#a1a1aa",
  fontSize: "11px",
  whiteSpace: "nowrap" as const,
};

const selectCompacto = {
  background: "transparent",
  border: "none",
  color: "white",
  outline: "none",
  fontSize: "12px",
  paddingRight: "4px",
  maxWidth: "120px",
};

const optionCompacto = {
  background: "#18181b",
  color: "#ffffff",
};

const botaoLimpar = {
  background: "rgba(24, 24, 27, 0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#d4d4d8",
  borderRadius: "999px",
  height: "32px",
  padding: "0 11px",
  cursor: "pointer",
  fontSize: "11px",
};

const botaoLimparAtivo = {
  background: "rgba(127, 29, 29, 0.64)",
  border: "1px solid rgba(248, 113, 113, 0.25)",
  color: "#fee2e2",
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
  gap: "12px",
  minWidth: "max-content",
  height: "100%",
};

const coluna = {
  flex: "0 0 248px",
  background:
    "linear-gradient(180deg, rgba(15, 23, 42, 0.82), rgba(12, 18, 28, 0.88))",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "14px",
  padding: "9px",
  display: "flex",
  flexDirection: "column" as const,
  height: "100%",
};

const colunaHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
  paddingBottom: "7px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const colunaTitulo = {
  fontSize: "12px",
  margin: 0,
  padding: "4px 9px",
  borderRadius: "999px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.03em",
  color: "#f4f4f5",
  border: "1px solid transparent",
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};

const statusDot = {
  width: "10px",
  height: "10px",
  minWidth: "10px",
  borderRadius: "999px",
  boxShadow: "0 0 0 2px rgba(255,255,255,0.9) inset",
};

const contador = {
  background: "rgba(124, 58, 237, 0.18)",
  border: "1px solid rgba(196, 181, 253, 0.16)",
  borderRadius: "999px",
  minWidth: "26px",
  height: "24px",
  padding: "0 8px",
  fontSize: "12px",
  color: "#ddd6fe",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const cards = {
  flex: 1,
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
  minHeight: 0,
  overflowY: "auto" as const,
  overflowX: "hidden" as const,
  paddingRight: "2px",
};

const card = {
  position: "relative" as const,
  flexShrink: 0,
  background: "#18181b",
  borderRadius: "12px",
  color: "white",
  textDecoration: "none",
  boxShadow: "0 6px 14px rgba(0,0,0,0.2)",
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
  top: "7px",
  right: "7px",
  display: "flex",
  alignItems: "center",
  gap: "5px",
  zIndex: 3,
};

const botaoAcao = {
  width: "26px",
  height: "26px",
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
  height: "74px",
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
  height: "74px",
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
  fontSize: "12px",
  fontWeight: 700,
  overflowWrap: "anywhere" as const,
};

const cardBody = {
  padding: "9px 10px 10px",
  display: "grid",
  gap: "7px",
};

const cardHeaderClean = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const idBadge = {
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: 700,
};

const prioridade = {
  borderRadius: "999px",
  padding: "3px 8px",
  fontSize: "9px",
  fontWeight: 700,
};

const titulo = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical" as const,
  WebkitLineClamp: 2,
  overflow: "hidden",
  fontSize: "13px",
  lineHeight: "18px",
  overflowWrap: "anywhere" as const,
};

const resumoLinha = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const resumoItem = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  minWidth: 0,
};

const resumoIcon = {
  color: "#71717a",
  fontSize: "10px",
  lineHeight: "10px",
  flexShrink: 0,
};

const resumoTexto = {
  color: "#cbd5e1",
  fontSize: "11px",
  fontWeight: 600,
};

const metaValor = {
  color: "#f4f4f5",
  fontSize: "11px",
};

const rodapeCard = {
  display: "grid",
  gap: "6px",
  paddingTop: "1px",
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
  gap: "4px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#e4e4e7",
  borderRadius: "999px",
  padding: "3px 7px",
  fontSize: "9px",
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
  fontSize: "11px",
  fontWeight: 700,
};

const vazio = {
  color: "#94a3b8",
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "28px 0 12px",
};
