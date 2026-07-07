import { connection } from "next/server";
import DashboardClient from "@/components/DashboardClient";
import { supabase } from "../lib/supabase";
import {
  corrigirTextoExibicao,
  formatarSetorExibicao,
} from "@/lib/display-text";

type DemandaDashboard = {
  id: number;
  titulo: string | null;
  status: string | null;
  responsavel: string | null;
  setor: string | null;
  data_entrega: string | null;
  data_solicitacao?: string | null;
  criado_em?: string | null;
  prioridade?: string | null;
  cadastrado_por?: string | null;
};

type HistoricoDashboard = {
  id: number;
  demanda_id: number | null;
  acao: string | null;
  criado_em: string;
};

export default async function Dashboard() {
  await connection();

  const [{ data: demandas }, { data: historico }] = await Promise.all([
    supabase
      .from("demandas_completas")
      .select(
        "id, titulo, status, responsavel, setor, data_entrega, data_solicitacao, criado_em, prioridade, cadastrado_por"
      ),
    supabase
      .from("historico_demanda")
      .select("id, demanda_id, acao, criado_em")
      .order("criado_em", { ascending: false })
      .limit(10),
  ]);

  const listaDemandas = ((demandas as DemandaDashboard[] | null) || []).map((demanda) => ({
    ...demanda,
    id: Number(demanda.id),
  }));
  const mapaDemandas = new Map(listaDemandas.map((demanda) => [demanda.id, demanda]));
  const demandasAbertas = listaDemandas.filter((demanda) => !ehStatusEncerrado(demanda.status));

  const resumo = {
    total: listaDemandas.length,
    abertas: demandasAbertas.length,
    concluidas: listaDemandas.filter((demanda) => demanda.status === "CONCLUIDO").length,
    canceladas: listaDemandas.filter((demanda) => demanda.status === "CANCELADO").length,
  };

  const alertas = calcularAlertas(demandasAbertas);

  const demandasAtrasadas = ordenarPorEntrega(
    demandasAbertas.filter((demanda) => calcularPrazoMeta(demanda.data_entrega).tipo === "atrasada")
  ).slice(0, 5);

  const demandasSemResponsavel = ordenarPorEntrega(
    demandasAbertas.filter((demanda) => !corrigirTextoExibicao(demanda.responsavel))
  ).slice(0, 5);

  const demandasEmAprovacao = ordenarPorEntrega(
    demandasAbertas.filter((demanda) => demanda.status === "EM_APROVACAO")
  ).slice(0, 5);

  const demandasProntas = ordenarPorEntrega(
    demandasAbertas.filter((demanda) => demanda.status === "AP_PARA_PUBLICAR")
  ).slice(0, 5);

  const ultimasDemandas = [...listaDemandas]
    .sort((a, b) => pegarDataOrdenacao(b) - pegarDataOrdenacao(a))
    .slice(0, 6);

  const atividadesRecentes = ((historico as HistoricoDashboard[] | null) || []).map((item) => ({
    id: Number(item.id),
    demandaId: item.demanda_id ? Number(item.demanda_id) : null,
    acao: item.acao || "Atividade registrada",
    criadoEm: item.criado_em,
    demandaTitulo: item.demanda_id
      ? mapaDemandas.get(Number(item.demanda_id))?.titulo || `Demanda #${item.demanda_id}`
      : "Sistema",
  }));

  const cargaResponsaveis = agruparMapa(
    demandasAbertas,
    (demanda) => corrigirTextoExibicao(demanda.responsavel) || "Não definido"
  ).slice(0, 6);

  const setoresTop = agruparMapa(
    listaDemandas,
    (demanda) => formatarSetorExibicao(demanda.setor)
  ).slice(0, 6);

  return (
    <DashboardClient
      resumo={resumo}
      alertas={alertas}
      demandasAtrasadas={demandasAtrasadas}
      demandasSemResponsavel={demandasSemResponsavel}
      demandasEmAprovacao={demandasEmAprovacao}
      demandasProntas={demandasProntas}
      ultimasDemandas={ultimasDemandas}
      atividadesRecentes={atividadesRecentes}
      cargaResponsaveis={cargaResponsaveis}
      setoresTop={setoresTop}
    />
  );
}

function agruparMapa<T>(lista: T[], seletor: (item: T) => string) {
  const mapa = lista.reduce<Record<string, number>>((acc, item) => {
    const chave = seletor(item);
    acc[chave] = (acc[chave] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(mapa)
    .map(([titulo, valor]) => ({ titulo, valor }))
    .sort((a, b) => b.valor - a.valor || a.titulo.localeCompare(b.titulo, "pt-BR"));
}

function calcularAlertas(demandas: DemandaDashboard[]) {
  const resumo = {
    atrasadas: 0,
    hoje: 0,
    proximas: 0,
    semResponsavel: 0,
    emAprovacao: 0,
    prontasPublicar: 0,
  };

  demandas.forEach((demanda) => {
    const prazo = calcularPrazoMeta(demanda.data_entrega);

    if (prazo.tipo === "atrasada") resumo.atrasadas += 1;
    if (prazo.tipo === "hoje") resumo.hoje += 1;
    if (prazo.tipo === "proxima") resumo.proximas += 1;
    if (!corrigirTextoExibicao(demanda.responsavel)) resumo.semResponsavel += 1;
    if (demanda.status === "EM_APROVACAO") resumo.emAprovacao += 1;
    if (demanda.status === "AP_PARA_PUBLICAR") resumo.prontasPublicar += 1;
  });

  return resumo;
}

function pegarDataOrdenacao(demanda: DemandaDashboard) {
  const valor = demanda.criado_em || demanda.data_solicitacao || "";
  const data = valor ? new Date(valor).getTime() : 0;
  return Number.isNaN(data) ? 0 : data;
}

function ordenarPorEntrega(demandas: DemandaDashboard[]) {
  return [...demandas].sort((a, b) => {
    const prazoA = calcularPrazoMeta(a.data_entrega).ordem;
    const prazoB = calcularPrazoMeta(b.data_entrega).ordem;
    return prazoA - prazoB || pegarDataOrdenacao(b) - pegarDataOrdenacao(a);
  });
}

function calcularPrazoMeta(dataEntrega?: string | null) {
  if (!dataEntrega) {
    return { tipo: "sem_prazo", ordem: 9999 };
  }

  const [ano, mes, dia] = dataEntrega.split("-").map(Number);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const entrega = new Date(ano, mes - 1, dia);
  entrega.setHours(0, 0, 0, 0);

  const diff = Math.floor((entrega.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { tipo: "atrasada", ordem: diff };
  if (diff === 0) return { tipo: "hoje", ordem: diff };
  if (diff <= 3) return { tipo: "proxima", ordem: diff };
  return { tipo: "normal", ordem: diff };
}

function ehStatusEncerrado(status?: string | null) {
  return status === "CONCLUIDO" || status === "CANCELADO";
}
