import { connection } from "next/server";
import DashboardClient from "@/components/DashboardClient";
import { supabase } from "../lib/supabase";

type DemandaDashboard = {
  status: string | null;
  responsavel: string | null;
  setor: string | null;
  data_entrega: string | null;
  data_solicitacao?: string | null;
  criado_em?: string | null;
};

export default async function Dashboard() {
  await connection();

  const { data: demandas } = await supabase.from("demandas_completas").select("*");

  const { data: produtos } = await supabase
    .from("relatorio_quantitativo_produtos")
    .select("*")
    .gt("quantidade", 0)
    .order("quantidade", { ascending: false })
    .limit(8);

  const { data: canais } = await supabase
    .from("relatorio_quantitativo_canais")
    .select("*")
    .gt("quantidade", 0)
    .order("quantidade", { ascending: false })
    .limit(8);

  const { data: eixos } = await supabase
    .from("relatorio_quantitativo_eixos")
    .select("*")
    .gt("quantidade", 0)
    .order("quantidade", { ascending: false })
    .limit(8);

  const listaDemandas = (demandas || []) as DemandaDashboard[];
  const total = listaDemandas.length;
  const recebidas = listaDemandas.filter((d) => d.status === "RECEBIDO").length;
  const emProducao = listaDemandas.filter((d) => d.status === "EM_PRODUCAO").length;
  const emAprovacao = listaDemandas.filter((d) => d.status === "EM_APROVACAO").length;
  const apParaPublicar = listaDemandas.filter((d) => d.status === "AP_PARA_PUBLICAR").length;
  const concluidas = listaDemandas.filter((d) => d.status === "CONCLUIDO").length;
  const canceladas = listaDemandas.filter((d) => d.status === "CANCELADO").length;

  const prazos = calcularResumoPrazos(listaDemandas);

  const porResponsavel = listaDemandas.reduce<Record<string, number>>((acc, demanda) => {
    const nome = demanda.responsavel || "Não atribuído";
    acc[nome] = (acc[nome] || 0) + 1;
    return acc;
  }, {});

  const porSetor = listaDemandas.reduce<Record<string, number>>((acc, demanda) => {
    const setor = demanda.setor || "Sem setor";
    acc[setor] = (acc[setor] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardClient
      total={total}
      recebidas={recebidas}
      emProducao={emProducao}
      emAprovacao={emAprovacao}
      apParaPublicar={apParaPublicar}
      concluidas={concluidas}
      canceladas={canceladas}
      prazos={prazos}
      produtos={mapearRanking(produtos || [], "produto")}
      canais={mapearRanking(canais || [], "canal")}
      eixos={mapearRanking(eixos || [], "eixo")}
      responsaveis={ordenarItens(porResponsavel)}
      setores={ordenarItens(porSetor)}
      status={[
        { titulo: "Recebido", valor: recebidas },
        { titulo: "Em Produção", valor: emProducao },
        { titulo: "Em Aprovação", valor: emAprovacao },
        { titulo: "AP. para Publicar", valor: apParaPublicar },
        { titulo: "Concluído", valor: concluidas },
        { titulo: "Cancelado", valor: canceladas },
      ].filter((item) => item.valor > 0)}
      evolucaoMensal={agruparEvolucaoMensal(listaDemandas)}
    />
  );
}

function mapearRanking(
  lista: Array<Record<string, string | number | null>>,
  campo: string
) {
  return lista.map((item) => ({
    titulo: String(item[campo] || "Não informado"),
    valor: Number(item.quantidade || 0),
  }));
}

function ordenarItens(mapa: Record<string, number>) {
  return Object.entries(mapa)
    .map(([titulo, valor]) => ({ titulo, valor }))
    .sort((a, b) => b.valor - a.valor || a.titulo.localeCompare(b.titulo));
}

function agruparEvolucaoMensal(demandas: DemandaDashboard[]) {
  const mapa: Record<string, number> = {};

  demandas.forEach((demanda) => {
    const data = demanda.data_solicitacao || demanda.criado_em;
    if (!data) return;

    const chave = data.slice(0, 7);
    mapa[chave] = (mapa[chave] || 0) + 1;
  });

  return Object.entries(mapa)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, demandasNoMes]) => ({
      mes: formatarMes(mes),
      demandas: demandasNoMes,
    }));
}

function formatarMes(valor: string) {
  const [ano, mes] = valor.split("-");
  return `${mes}/${ano}`;
}

function calcularResumoPrazos(demandas: DemandaDashboard[]) {
  const resumo = {
    atrasadas: 0,
    hoje: 0,
    ateTresDias: 0,
    noPrazo: 0,
    semPrazo: 0,
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  demandas.forEach((demanda) => {
    if (demanda.status === "CONCLUIDO" || demanda.status === "CANCELADO") {
      return;
    }

    if (!demanda.data_entrega) {
      resumo.semPrazo += 1;
      return;
    }

    const [ano, mes, dia] = demanda.data_entrega.split("-").map(Number);
    const entrega = new Date(ano, mes - 1, dia);
    entrega.setHours(0, 0, 0, 0);

    const diff = Math.floor(
      (entrega.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff < 0) resumo.atrasadas += 1;
    else if (diff === 0) resumo.hoje += 1;
    else if (diff <= 3) resumo.ateTresDias += 1;
    else resumo.noPrazo += 1;
  });

  return resumo;
}
