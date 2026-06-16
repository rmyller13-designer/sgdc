import { connection } from "next/server";
import { supabase } from "../../lib/supabase";
import RelatoriosQuantitativosClient from "../../components/RelatoriosQuantitativosClient";

type SearchParams = {
  inicio?: string;
  fim?: string;
  mes?: string;
};

type DemandaResumo = {
  id: number;
  status: string | null;
  setor: string | null;
  responsavel: string | null;
  data_solicitacao: string | null;
  criado_em: string | null;
};

type ProdutoQuantidade = {
  quantidade: number | null;
  produtos: { nome: string | null } | { nome: string | null }[] | null;
};

type CanalDemanda = {
  canais_comunicacao:
    | { nome: string | null }
    | { nome: string | null }[]
    | null;
};

type EixoDemanda = {
  eixos_comunicacao:
    | { nome: string | null }
    | { nome: string | null }[]
    | null;
};

type Item = {
  titulo: string;
  valor: number;
};

export default async function RelatoriosQuantitativos({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();

  const params = await searchParams;
  const periodo = resolverPeriodo(params);

  let query = supabase
    .from("demandas_completas")
    .select("id, status, setor, responsavel, data_solicitacao, criado_em")
    .order("data_solicitacao", { ascending: true });

  if (periodo.inicio) query = query.gte("data_solicitacao", periodo.inicio);
  if (periodo.fim) query = query.lte("data_solicitacao", periodo.fim);

  const { data: demandasData } = await query;
  const demandas = (demandasData || []) as DemandaResumo[];
  const ids = demandas.map((demanda) => demanda.id);

  const [produtosRaw, canaisRaw, eixosRaw] = ids.length
    ? await Promise.all([
        supabase
          .from("demanda_produtos_quantidade")
          .select("quantidade, produtos(nome)")
          .in("demanda_id", ids),
        supabase
          .from("demanda_canais")
          .select("canais_comunicacao(nome)")
          .in("demanda_id", ids),
        supabase
          .from("demanda_eixos")
          .select("eixos_comunicacao(nome)")
          .in("demanda_id", ids),
      ])
    : [
        { data: [] as ProdutoQuantidade[] },
        { data: [] as CanalDemanda[] },
        { data: [] as EixoDemanda[] },
      ];

  const produtos = agruparSoma(
    ((produtosRaw.data || []) as ProdutoQuantidade[]).filter(
      (item) => Number(item.quantidade || 0) > 0
    ),
    (item) => pegarNome(item.produtos),
    (item) => Number(item.quantidade || 0)
  );

  const canais = agruparContagem(
    (canaisRaw.data || []) as CanalDemanda[],
    (item) => pegarNome(item.canais_comunicacao)
  );

  const eixos = agruparContagem(
    (eixosRaw.data || []) as EixoDemanda[],
    (item) => pegarNome(item.eixos_comunicacao)
  );

  const status = agruparContagem(demandas, (item) => item.status);
  const setores = agruparContagem(demandas, (item) => item.setor);
  const responsaveis = agruparContagem(
    demandas,
    (item) => item.responsavel || "Nao atribuido"
  );
  const evolucaoMensal = agruparEvolucaoMensal(demandas);

  return (
    <RelatoriosQuantitativosClient
      inicio={periodo.inicio}
      fim={periodo.fim}
      mes={periodo.mes}
      totalDemandas={demandas.length}
      produtos={produtos}
      canais={canais}
      eixos={eixos}
      status={status}
      setores={setores}
      responsaveis={responsaveis}
      evolucaoMensal={evolucaoMensal}
    />
  );
}

function resolverPeriodo(params: SearchParams) {
  if (params.mes && /^\d{4}-\d{2}$/.test(params.mes)) {
    const [ano, mes] = params.mes.split("-").map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();

    return {
      mes: params.mes,
      inicio: `${params.mes}-01`,
      fim: `${params.mes}-${String(ultimoDia).padStart(2, "0")}`,
    };
  }

  return {
    mes: "",
    inicio: params.inicio || "",
    fim: params.fim || "",
  };
}

function pegarNome(
  valor: { nome: string | null } | { nome: string | null }[] | null
) {
  if (!valor) return "Nao informado";
  if (Array.isArray(valor)) return valor[0]?.nome || "Nao informado";
  return valor.nome || "Nao informado";
}

function agruparSoma<T>(
  lista: T[],
  getTitulo: (item: T) => string,
  getValor: (item: T) => number
): Item[] {
  const mapa: Record<string, number> = {};

  lista.forEach((item) => {
    const titulo = getTitulo(item) || "Nao informado";
    mapa[titulo] = (mapa[titulo] || 0) + getValor(item);
  });

  return ordenarItens(mapa);
}

function agruparContagem<T>(
  lista: T[],
  getTitulo: (item: T) => string | null | undefined
): Item[] {
  const mapa: Record<string, number> = {};

  lista.forEach((item) => {
    const titulo = getTitulo(item) || "Nao informado";
    mapa[titulo] = (mapa[titulo] || 0) + 1;
  });

  return ordenarItens(mapa);
}

function ordenarItens(mapa: Record<string, number>) {
  return Object.entries(mapa)
    .map(([titulo, valor]) => ({ titulo, valor }))
    .sort((a, b) => b.valor - a.valor || a.titulo.localeCompare(b.titulo));
}

function agruparEvolucaoMensal(demandas: DemandaResumo[]) {
  const mapa: Record<string, number> = {};

  demandas.forEach((demanda) => {
    const data = demanda.data_solicitacao || demanda.criado_em;
    if (!data) return;

    const chave = data.slice(0, 7);
    mapa[chave] = (mapa[chave] || 0) + 1;
  });

  return Object.entries(mapa)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, demandas]) => ({ mes: formatarMes(mes), demandas }));
}

function formatarMes(mes: string) {
  const [ano, numeroMes] = mes.split("-");
  return `${numeroMes}/${ano}`;
}
