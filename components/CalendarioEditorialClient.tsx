"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DragDropContext,
  Draggable,
  DraggableProvided,
  Droppable,
  DropResult,
} from "@hello-pangea/dnd";
import { useAuth } from "@/components/AuthProvider";
import { podeEditarFluxo } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type DemandaCalendario = {
  id: number;
  titulo: string | null;
  descricao: string | null;
  produto: string | null;
  setor: string | null;
  status: string | null;
  prioridade: string | null;
  responsavel: string | null;
  cadastrado_por: string | null;
  data_solicitacao: string | null;
  data_entrega: string | null;
  criado_em: string | null;
};

type DiaCalendario = {
  data: Date;
  chave: string;
  foraDoMes: boolean;
  hoje: boolean;
};

type Visualizacao = "mes" | "semana" | "lista";

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const statusCores: Record<string, string> = {
  RECEBIDO: "#60a5fa",
  EM_PRODUCAO: "#f97316",
  EM_APROVACAO: "#eab308",
  AP_PARA_PUBLICAR: "#a855f7",
  CONCLUIDO: "#22c55e",
  CANCELADO: "#94a3b8",
};

export default function CalendarioEditorialClient({
  mesAtual,
  demandas,
}: {
  mesAtual: string;
  demandas: DemandaCalendario[];
}) {
  const { usuario } = useAuth();
  const podeMover = podeEditarFluxo(usuario);
  const [lista, setLista] = useState(demandas || []);
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("mes");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [setor, setSetor] = useState("");

  const dias = useMemo(() => criarDiasDoMes(mesAtual), [mesAtual]);
  const hoje = toDateKey(new Date());
  const semanaAtual = dias.filter((dia) => mesmaSemana(dia.chave, hoje));

  const demandasFiltradas = useMemo(() => {
    const texto = busca.trim().toLowerCase();

    return lista.filter((demanda) => {
      const conteudo = [
        demanda.titulo,
        demanda.descricao,
        demanda.produto,
        demanda.setor,
        demanda.status,
        demanda.responsavel,
        demanda.cadastrado_por,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!texto || conteudo.includes(texto)) &&
        (!status || demanda.status === status) &&
        (!responsavel || demanda.responsavel === responsavel) &&
        (!setor || demanda.setor === setor)
      );
    });
  }, [busca, lista, responsavel, setor, status]);

  const demandasPorDia = useMemo(() => {
    const mapa = new Map<string, DemandaCalendario[]>();

    demandasFiltradas.forEach((demanda) => {
      const data = pegarDataEditorial(demanda);
      const lista = mapa.get(data) || [];
      lista.push(demanda);
      mapa.set(data, lista);
    });

    return mapa;
  }, [demandasFiltradas]);

  const opcoesStatus = pegarUnicos(lista.map((demanda) => demanda.status));
  const opcoesResponsavel = pegarUnicos(
    lista.map((demanda) => demanda.responsavel)
  );
  const opcoesSetor = pegarUnicos(lista.map((demanda) => demanda.setor));
  const mesAnterior = deslocarMes(mesAtual, -1);
  const proximoMes = deslocarMes(mesAtual, 1);

  async function aoArrastar(result: DropResult) {
    const { destination, draggableId } = result;

    if (!destination) return;

    const demandaId = Number(draggableId);
    const novaDataEntrega = destination.droppableId;
    const demandaAtual = lista.find((demanda) => demanda.id === demandaId);

    if (!demandaAtual) return;

    if (pegarDataEditorial(demandaAtual) === novaDataEntrega) return;

    if (!podeMover || !usuario) {
      alert("Seu usuario nao tem permissao para mover itens no calendario.");
      return;
    }

    setLista((atual) =>
      atual.map((demanda) =>
        demanda.id === demandaId
          ? { ...demanda, data_entrega: novaDataEntrega }
          : demanda
      )
    );

    const { error } = await supabase
      .from("demandas")
      .update({ data_entrega: novaDataEntrega })
      .eq("id", demandaId);

    if (error) {
      setLista((atual) =>
        atual.map((demanda) =>
          demanda.id === demandaId
            ? { ...demanda, data_entrega: demandaAtual.data_entrega }
            : demanda
        )
      );
      alert("Erro ao atualizar data de entrega: " + error.message);
      return;
    }

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaId,
      usuario_id: usuario.id,
      acao: `${usuario.nome} moveu a demanda no calendario para ${formatarData(
        novaDataEntrega
      )}`,
    });
  }

  return (
    <div>
      <section style={toolbar}>
        <div style={navegacaoMes}>
          <Link href={`/calendario-editorial?mes=${mesAnterior}`} style={botaoIcone}>
            &lt;
          </Link>
          <strong style={mesTitulo}>{formatarMesTitulo(mesAtual)}</strong>
          <Link href={`/calendario-editorial?mes=${proximoMes}`} style={botaoIcone}>
            &gt;
          </Link>
          <Link href="/calendario-editorial" style={botaoSecundario}>
            Hoje
          </Link>
        </div>

        <div style={abas}>
          <button
            type="button"
            onClick={() => setVisualizacao("mes")}
            style={visualizacao === "mes" ? abaAtiva : aba}
          >
            Mes
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao("semana")}
            style={visualizacao === "semana" ? abaAtiva : aba}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao("lista")}
            style={visualizacao === "lista" ? abaAtiva : aba}
          >
            Lista
          </button>
        </div>
      </section>

      <section style={filtros}>
        <input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por titulo, produto, setor..."
          style={campoBusca}
        />

        <FiltroSelect
          label="Status"
          value={status}
          options={opcoesStatus}
          onChange={setStatus}
        />
        <FiltroSelect
          label="Responsavel"
          value={responsavel}
          options={opcoesResponsavel}
          onChange={setResponsavel}
        />
        <FiltroSelect
          label="Setor"
          value={setor}
          options={opcoesSetor}
          onChange={setSetor}
        />
      </section>

      <section style={resumo}>
        <ResumoCard titulo="Itens no calendario" valor={demandasFiltradas.length} />
        <ResumoCard
          titulo="Sem data de entrega"
          valor={demandasFiltradas.filter((demanda) => !demanda.data_entrega).length}
        />
        <ResumoCard
          titulo="Em producao"
          valor={
            demandasFiltradas.filter(
              (demanda) => demanda.status === "EM_PRODUCAO"
            ).length
          }
        />
        <ResumoCard
          titulo="Concluidas"
          valor={
            demandasFiltradas.filter((demanda) => demanda.status === "CONCLUIDO")
              .length
          }
        />
      </section>

      {visualizacao === "lista" ? (
        <ListaDemandas demandas={demandasFiltradas} />
      ) : (
        <DragDropContext onDragEnd={aoArrastar}>
          <CalendarioGrid
            dias={visualizacao === "semana" ? semanaAtual : dias}
            demandasPorDia={demandasPorDia}
            visualizacao={visualizacao}
            podeMover={podeMover}
          />
        </DragDropContext>
      )}
    </div>
  );
}

function FiltroSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={select}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {formatarLabel(option)}
        </option>
      ))}
    </select>
  );
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div style={resumoCard}>
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function CalendarioGrid({
  dias,
  demandasPorDia,
  visualizacao,
  podeMover,
}: {
  dias: DiaCalendario[];
  demandasPorDia: Map<string, DemandaCalendario[]>;
  visualizacao: Visualizacao;
  podeMover: boolean;
}) {
  return (
    <div style={calendarioWrap}>
      <div style={cabecalhoSemana}>
        {diasSemana.map((dia) => (
          <div key={dia} style={diaSemana}>
            {dia}
          </div>
        ))}
      </div>

      <div
        style={{
          ...calendario,
          gridTemplateRows:
            visualizacao === "semana" ? "minmax(520px, 1fr)" : undefined,
        }}
      >
        {dias.map((dia) => (
          <DiaCelula
            key={dia.chave}
            dia={dia}
            demandas={demandasPorDia.get(dia.chave) || []}
            podeMover={podeMover}
          />
        ))}
      </div>
    </div>
  );
}

function DiaCelula({
  dia,
  demandas,
  podeMover,
}: {
  dia: DiaCalendario;
  demandas: DemandaCalendario[];
  podeMover: boolean;
}) {
  const demandasVisiveis = demandas.slice(0, 5);

  return (
    <Droppable droppableId={dia.chave}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          style={{
            ...diaCelula,
            opacity: dia.foraDoMes ? 0.58 : 1,
            borderColor: dia.hoje
              ? "rgba(254, 202, 202, 0.75)"
              : diaCelula.border,
            background: snapshot.isDraggingOver
              ? "rgba(127,29,29,.42)"
              : diaCelula.background,
          }}
        >
          <div style={diaTopo}>
            <strong style={diaNumero}>{dia.data.getDate()}</strong>
            {demandas.length > 0 && <span style={contador}>{demandas.length}</span>}
          </div>

          <div style={cardsDia}>
            {demandasVisiveis.map((demanda, index) => (
              <Draggable
                key={demanda.id}
                draggableId={String(demanda.id)}
                index={index}
                isDragDisabled={!podeMover}
              >
                {(dragProvided, dragSnapshot) => (
                  <DemandaCard
                    demanda={demanda}
                    dragProvided={dragProvided}
                    isDragging={dragSnapshot.isDragging}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {demandas.length > demandasVisiveis.length && (
              <span style={maisItens}>
                +{demandas.length - demandasVisiveis.length}
              </span>
            )}
          </div>
        </div>
      )}
    </Droppable>
  );
}

function DemandaCard({
  demanda,
  dragProvided,
  isDragging,
}: {
  demanda: DemandaCalendario;
  dragProvided?: {
    innerRef: DraggableProvided["innerRef"];
    draggableProps: DraggableProvided["draggableProps"];
    dragHandleProps: DraggableProvided["dragHandleProps"];
  };
  isDragging?: boolean;
}) {
  const status = demanda.status || "SEM_STATUS";

  return (
    <Link
      ref={dragProvided?.innerRef}
      {...dragProvided?.draggableProps}
      {...dragProvided?.dragHandleProps}
      href={`/demandas/${demanda.id}`}
      style={{
        ...cardDemanda,
        opacity: isDragging ? 0.88 : 1,
        transform: isDragging ? "rotate(1deg)" : undefined,
        ...(dragProvided?.draggableProps.style || {}),
      }}
    >
      <span
        style={{
          ...statusBar,
          background: statusCores[status] || "#ef4444",
        }}
      />
      <span style={cardTitulo}>{demanda.titulo || `Demanda #${demanda.id}`}</span>
      <span style={cardMeta}>
        {formatarLabel(status)} - {demanda.produto || "Sem produto"}
      </span>
      <span style={cardFooter}>
        {demanda.responsavel || demanda.cadastrado_por || "Sem responsavel"}
      </span>
    </Link>
  );
}

function ListaDemandas({ demandas }: { demandas: DemandaCalendario[] }) {
  const ordenadas = [...demandas].sort((a, b) =>
    pegarDataEditorial(a).localeCompare(pegarDataEditorial(b))
  );

  return (
    <div style={lista}>
      {ordenadas.length === 0 ? (
        <p style={vazio}>Nenhuma demanda encontrada.</p>
      ) : (
        ordenadas.map((demanda) => (
          <Link key={demanda.id} href={`/demandas/${demanda.id}`} style={linhaLista}>
            <span style={dataLista}>{formatarData(pegarDataEditorial(demanda))}</span>
            <strong style={{ minWidth: 0 }}>{demanda.titulo}</strong>
            <span style={pill}>{formatarLabel(demanda.status || "Sem status")}</span>
            <span style={textoFraco}>{demanda.setor || "Sem setor"}</span>
            <span style={textoFraco}>
              {demanda.responsavel || demanda.cadastrado_por || "Sem responsavel"}
            </span>
          </Link>
        ))
      )}
    </div>
  );
}

function criarDiasDoMes(mes: string): DiaCalendario[] {
  const [ano, mesNumero] = mes.split("-").map(Number);
  const primeiroDia = new Date(ano, mesNumero - 1, 1);
  const ultimoDia = new Date(ano, mesNumero, 0);
  const cursor = new Date(primeiroDia);
  const fim = new Date(ultimoDia);
  const hoje = toDateKey(new Date());

  cursor.setDate(cursor.getDate() - cursor.getDay());
  fim.setDate(fim.getDate() + (6 - fim.getDay()));

  const dias: DiaCalendario[] = [];

  while (cursor <= fim) {
    const chave = toDateKey(cursor);
    dias.push({
      data: new Date(cursor),
      chave,
      foraDoMes: cursor.getMonth() !== mesNumero - 1,
      hoje: chave === hoje,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return dias;
}

function pegarDataEditorial(demanda: DemandaCalendario) {
  return (
    demanda.data_entrega ||
    demanda.data_solicitacao ||
    demanda.criado_em?.slice(0, 10) ||
    "9999-12-31"
  );
}

function pegarUnicos(lista: Array<string | null>) {
  return Array.from(new Set(lista.filter((item): item is string => Boolean(item)))).sort();
}

function deslocarMes(mes: string, quantidade: number) {
  const [ano, mesNumero] = mes.split("-").map(Number);
  const data = new Date(ano, mesNumero - 1 + quantidade, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function formatarMesTitulo(mes: string) {
  const [ano, mesNumero] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(ano, mesNumero - 1, 1));
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarLabel(valor: string) {
  return valor
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function mesmaSemana(dataA: string, dataB: string) {
  const a = criarDataLocal(dataA);
  const b = criarDataLocal(dataB);
  const inicioA = new Date(a);
  const inicioB = new Date(b);

  inicioA.setDate(a.getDate() - a.getDay());
  inicioB.setDate(b.getDate() - b.getDay());

  return toDateKey(inicioA) === toDateKey(inicioB);
}

function criarDataLocal(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function toDateKey(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(data.getDate()).padStart(2, "0")}`;
}

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "14px",
  flexWrap: "wrap" as const,
};

const navegacaoMes = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const mesTitulo = {
  minWidth: "190px",
  textTransform: "capitalize" as const,
  fontSize: "18px",
};

const botaoIcone = {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  border: "1px solid rgba(252,165,165,.25)",
  background: "rgba(15,23,42,.78)",
  color: "#fee2e2",
  textDecoration: "none",
  display: "grid",
  placeItems: "center",
  fontSize: "22px",
};

const botaoSecundario = {
  background: "rgba(15,23,42,.78)",
  color: "#fee2e2",
  border: "1px solid rgba(252,165,165,.25)",
  padding: "10px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  textDecoration: "none",
};

const abas = {
  display: "flex",
  gap: "6px",
  background: "rgba(15,23,42,.62)",
  border: "1px solid rgba(252,165,165,.18)",
  borderRadius: "8px",
  padding: "4px",
};

const aba = {
  background: "transparent",
  border: "none",
  color: "#fecaca",
  padding: "8px 12px",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 700,
};

const abaAtiva = {
  ...aba,
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "white",
};

const filtros = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1.5fr) repeat(3, minmax(160px, 1fr))",
  gap: "10px",
  marginBottom: "16px",
};

const campoBusca = {
  background: "rgba(15,23,42,.82)",
  border: "1px solid rgba(252,165,165,.22)",
  color: "white",
  borderRadius: "8px",
  padding: "11px 12px",
};

const select = {
  ...campoBusca,
};

const resumo = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  marginBottom: "16px",
};

const resumoCard = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(252,165,165,.18)",
  borderRadius: "8px",
  padding: "12px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: "#fecaca",
};

const calendarioWrap = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(252,165,165,.18)",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 14px 34px rgba(0,0,0,.22)",
};

const cabecalhoSemana = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(150px, 1fr))",
  borderBottom: "1px solid rgba(252,165,165,.16)",
};

const diaSemana = {
  padding: "10px",
  color: "#fecaca",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};

const calendario = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(150px, 1fr))",
  gridAutoRows: "minmax(170px, auto)",
};

const diaCelula = {
  minHeight: "170px",
  border: "1px solid rgba(148,163,184,.14)",
  padding: "10px",
  background: "rgba(2,6,23,.22)",
};

const diaTopo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
};

const diaNumero = {
  color: "white",
};

const contador = {
  background: "rgba(220,38,38,.3)",
  border: "1px solid rgba(252,165,165,.25)",
  borderRadius: "999px",
  color: "#fee2e2",
  padding: "2px 7px",
  fontSize: "11px",
  fontWeight: 800,
};

const cardsDia = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "7px",
};

const cardDemanda = {
  position: "relative" as const,
  display: "flex",
  flexDirection: "column" as const,
  gap: "4px",
  minHeight: "72px",
  color: "white",
  textDecoration: "none",
  background: "rgba(15,23,42,.86)",
  border: "1px solid rgba(148,163,184,.22)",
  borderRadius: "8px",
  padding: "8px 8px 8px 11px",
  overflow: "hidden",
};

const statusBar = {
  position: "absolute" as const,
  left: 0,
  top: 0,
  bottom: 0,
  width: "3px",
};

const cardTitulo = {
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: 800,
  overflowWrap: "anywhere" as const,
};

const cardMeta = {
  color: "#fecaca",
  fontSize: "11px",
  lineHeight: "14px",
};

const cardFooter = {
  color: "#94a3b8",
  fontSize: "11px",
  lineHeight: "14px",
};

const maisItens = {
  color: "#fecaca",
  fontSize: "12px",
  padding: "3px 0",
};

const lista = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const linhaLista = {
  display: "grid",
  gridTemplateColumns: "110px minmax(220px, 1fr) 150px 160px 180px",
  gap: "12px",
  alignItems: "center",
  color: "white",
  textDecoration: "none",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(252,165,165,.18)",
  borderRadius: "8px",
  padding: "12px",
};

const dataLista = {
  color: "#fecaca",
  fontWeight: 800,
};

const pill = {
  background: "rgba(220,38,38,.22)",
  border: "1px solid rgba(252,165,165,.25)",
  borderRadius: "999px",
  color: "#fee2e2",
  padding: "5px 8px",
  fontSize: "12px",
  textAlign: "center" as const,
};

const textoFraco = {
  color: "#94a3b8",
  fontSize: "13px",
};

const vazio = {
  color: "#fecaca",
};
