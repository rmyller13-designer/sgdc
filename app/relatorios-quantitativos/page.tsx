import { connection } from "next/server";
import { supabase } from "../../lib/supabase";
import RelatoriosQuantitativosClient from "../../components/RelatoriosQuantitativosClient";
import {
  corrigirTextoExibicao,
  formatarCanalExibicao,
  formatarEixoExibicao,
  formatarProdutoExibicao,
  formatarSetorExibicao,
  formatarStatusExibicao,
} from "@/lib/display-text";

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
    (item) => corrigirTextoExibicao(item.responsavel) || "Não atribuído"
  );
  const evolucaoMensal = agruparEvolucaoMensal(demandas, periodo);

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
  if (!valor) return "Não informado";
  if (Array.isArray(valor)) return valor[0]?.nome || "Não informado";
  return valor.nome || "Não informado";
}

function agruparSoma<T>(
  lista: T[],
  getTitulo: (item: T) => string,
  getValor: (item: T) => number
): Item[] {
  const mapa: Record<string, number> = {};

  lista.forEach((item) => {
    const titulo = getTitulo(item) || "Não informado";
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
    const titulo = getTitulo(item) || "Não informado";
    mapa[titulo] = (mapa[titulo] || 0) + 1;
  });

  return ordenarItens(mapa);
}

function ordenarItens(mapa: Record<string, number>) {
  return Object.entries(mapa)
    .map(([titulo, valor]) => ({
      titulo: formatarTituloRelatorio(titulo),
      valor,
    }))
    .sort((a, b) => b.valor - a.valor || a.titulo.localeCompare(b.titulo, "pt-BR"));
}

function formatarTituloRelatorio(valor: string) {
  const texto = corrigirTextoExibicao(valor);

  if (!texto) return "Não informado";
  if (texto === "Sem setor") return texto;
  if (texto === "Não atribuído") return texto;

  if (texto in {
    RECEBIDO: true,
    EM_PRODUCAO: true,
    EM_APROVACAO: true,
    AP_PARA_PUBLICAR: true,
    CONCLUIDO: true,
    CANCELADO: true,
  }) {
    return formatarStatusExibicao(texto);
  }

  const produto = formatarProdutoExibicao(texto);
  if (produto !== texto.replace(/_/g, " ")) return produto;

  const canal = formatarCanalExibicao(texto);
  if (canal !== texto.replace(/_/g, " ")) return canal;

  const eixo = formatarEixoExibicao(texto);
  if (eixo !== texto.replace(/_/g, " ")) return eixo;

  const setor = formatarSetorExibicao(texto);
  if (setor !== texto.replace(/_/g, " ")) return setor;

  return texto;
}

function agruparEvolucaoMensal(
  demandas: DemandaResumo[],
  periodo: { inicio: string; fim: string; mes: string }
) {
  const mapa: Record<string, number> = {};

  demandas.forEach((demanda) => {
    const data = demanda.data_solicitacao || demanda.criado_em;
    if (!data) return;

    const chave = data.slice(0, 7);
    mapa[chave] = (mapa[chave] || 0) + 1;
  });

  const meses = montarJanelaMensal(Object.keys(mapa), periodo);

  return meses.map((mes) => ({
    mes: formatarMes(mes),
    demandas: mapa[mes] || 0,
  }));
}

function formatarMes(mes: string) {
  const [ano, numeroMes] = mes.split("-");
  return `${numeroMes}/${ano}`;
}

function montarJanelaMensal(
  mesesComDados: string[],
  periodo: { inicio: string; fim: string; mes: string }
) {
  if (periodo.mes) {
    return listarMeses(intervaloRetroativo(periodo.mes, 5), periodo.mes);
  }

  if (periodo.inicio && periodo.fim) {
    return listarMeses(periodo.inicio.slice(0, 7), periodo.fim.slice(0, 7));
  }

  const mesesOrdenados = [...mesesComDados].sort((a, b) => a.localeCompare(b));

  if (mesesOrdenados.length === 0) {
    return [];
  }

  const ultimoMes = mesesOrdenados[mesesOrdenados.length - 1];
  const primeiroMes = mesesOrdenados[0];
  const janelaMinima = intervaloRetroativo(ultimoMes, 5);
  const inicio = primeiroMes > janelaMinima ? janelaMinima : primeiroMes;

  return listarMeses(inicio, ultimoMes);
}

function intervaloRetroativo(mes: string, quantidadeAnterior: number) {
  const [ano, numeroMes] = mes.split("-").map(Number);
  const data = new Date(ano, numeroMes - 1, 1);
  data.setMonth(data.getMonth() - quantidadeAnterior);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function listarMeses(inicio: string, fim: string) {
  const [anoInicio, mesInicio] = inicio.split("-").map(Number);
  const [anoFim, mesFim] = fim.split("-").map(Number);
  const cursor = new Date(anoInicio, mesInicio - 1, 1);
  const limite = new Date(anoFim, mesFim - 1, 1);
  const meses: string[] = [];

  while (cursor <= limite) {
    meses.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return meses;
}
