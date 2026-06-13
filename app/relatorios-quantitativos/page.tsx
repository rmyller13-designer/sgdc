import { supabase } from "../../lib/supabase";
import RelatoriosQuantitativosClient from "../../components/RelatoriosQuantitativosClient";

export default async function RelatoriosQuantitativos({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  const params = await searchParams;

  let query = supabase.from("demandas_completas").select("*");

  if (params.inicio) query = query.gte("data_solicitacao", params.inicio);
  if (params.fim) query = query.lte("data_solicitacao", params.fim);

  const { data: demandas } = await query;

  const ids = demandas?.map((d) => d.id) || [];

  const produtosRaw = ids.length
    ? (
        await supabase
          .from("demanda_produtos_quantidade")
          .select("quantidade, produtos(nome)")
          .in("demanda_id", ids)
      ).data || []
    : [];

  const canaisRaw = ids.length
    ? (
        await supabase
          .from("demanda_canais")
          .select("canais_comunicacao(nome)")
          .in("demanda_id", ids)
      ).data || []
    : [];

  const eixosRaw = ids.length
    ? (
        await supabase
          .from("demanda_eixos")
          .select("eixos_comunicacao(nome)")
          .in("demanda_id", ids)
      ).data || []
    : [];

  const produtos = agruparSoma(
    produtosRaw,
    (item: any) => pegarNome(item.produtos),
    (item: any) => Number(item.quantidade || 0)
  );

  const canais = agruparContagem(
    canaisRaw,
    (item: any) => pegarNome(item.canais_comunicacao)
  );

  const eixos = agruparContagem(
    eixosRaw,
    (item: any) => pegarNome(item.eixos_comunicacao)
  );

  const status = agruparContagem(demandas || [], (item: any) => item.status);
  const setores = agruparContagem(demandas || [], (item: any) => item.setor);
  const responsaveis = agruparContagem(
    demandas || [],
    (item: any) => item.responsavel || "Não atribuído"
  );

  return (
    <RelatoriosQuantitativosClient
      inicio={params.inicio || ""}
      fim={params.fim || ""}
      totalDemandas={demandas?.length || 0}
      produtos={produtos}
      canais={canais}
      eixos={eixos}
      status={status}
      setores={setores}
      responsaveis={responsaveis}
    />
  );
}

function pegarNome(valor: any) {
  if (!valor) return "Não informado";
  if (Array.isArray(valor)) return valor[0]?.nome || "Não informado";
  return valor.nome || "Não informado";
}

function agruparSoma(
  lista: any[],
  getTitulo: (item: any) => string,
  getValor: (item: any) => number
) {
  const mapa: Record<string, number> = {};

  lista.forEach((item) => {
    const titulo = getTitulo(item);
    mapa[titulo] = (mapa[titulo] || 0) + getValor(item);
  });

  return Object.entries(mapa)
    .map(([titulo, valor]) => ({ titulo, valor }))
    .sort((a, b) => b.valor - a.valor);
}

function agruparContagem(lista: any[], getTitulo: (item: any) => string) {
  const mapa: Record<string, number> = {};

  lista.forEach((item) => {
    const titulo = getTitulo(item) || "Não informado";
    mapa[titulo] = (mapa[titulo] || 0) + 1;
  });

  return Object.entries(mapa)
    .map(([titulo, valor]) => ({ titulo, valor }))
    .sort((a, b) => b.valor - a.valor);
}