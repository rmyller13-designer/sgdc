import { connection } from "next/server";
import { supabase } from "../../lib/supabase";
import RelatoriosQuantitativosClient from "../../components/RelatoriosQuantitativosClient";
import { buscarDemandasCompletas } from "@/lib/demandas-completas";
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

type ClippingResumo = {
  origem: string | null;
  data_publicacao: string | null;
  observacoes?: string | null;
};

type Item = {
  titulo: string;
  valor: number;
};

type EvolucaoOrigemItem = {
  mes: string;
  ascom: number;
  externo: number;
};

export default async function RelatoriosQuantitativos({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();

  const params = await searchParams;
  const periodo = resolverPeriodo(params);

  const [{ data: demandasData }, clipping] = await Promise.all([
    buscarDemandasCompletas(supabase, {
      orderBy: "data_solicitacao",
      ascending: true,
      gteDataSolicitacao: periodo.inicio || undefined,
      lteDataSolicitacao: periodo.fim || undefined,
    }),
    buscarClippingCompleto(periodo),
  ]);

  const demandas = (demandasData || []) as DemandaResumo[];
  const ids = demandas.map((demanda) => demanda.id);

  const [produtosRaw, canaisRaw, eixosRaw] = await Promise.all([
    ids.length
      ? supabase
          .from("demanda_produtos_quantidade")
          .select("quantidade, produtos(nome)")
          .in("demanda_id", ids)
      : Promise.resolve({ data: [] as ProdutoQuantidade[] }),
    ids.length
      ? supabase
          .from("demanda_canais")
          .select("canais_comunicacao(nome)")
          .in("demanda_id", ids)
      : Promise.resolve({ data: [] as CanalDemanda[] }),
    ids.length
      ? supabase
          .from("demanda_eixos")
          .select("eixos_comunicacao(nome)")
          .in("demanda_id", ids)
      : Promise.resolve({ data: [] as EixoDemanda[] }),
  ]);

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
  const responsaveis = agruparContagem(demandas, (item) =>
    dividirResponsaveis(item.responsavel)
  );
  const evolucaoMensal = agruparEvolucaoMensal(demandas, periodo);
  const totalPostagensAscom = clipping.filter((item) => item.origem === "ASCOM").length;
  const totalClippingExterno = clipping.filter((item) => item.origem !== "ASCOM").length;
  const evolucaoPostagensAscom = agruparEvolucaoOrigemClipping(clipping, periodo);

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
      totalPostagensAscom={totalPostagensAscom}
      totalClippingExterno={totalClippingExterno}
      evolucaoPostagensAscom={evolucaoPostagensAscom}
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
  getTitulo: (item: T) => string | string[] | null | undefined
): Item[] {
  const mapa: Record<string, number> = {};

  lista.forEach((item) => {
    const bruto = getTitulo(item);
    const titulos = Array.isArray(bruto) ? bruto : [bruto || "Nao informado"];

    titulos.forEach((titulo) => {
      mapa[titulo] = (mapa[titulo] || 0) + 1;
    });
  });

  return ordenarItens(mapa);
}

function dividirResponsaveis(valor?: string | null) {
  const nomes = (corrigirTextoExibicao(valor) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return nomes.length > 0 ? nomes : ["Nao atribuido"];
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

  if (!texto) return "Nao informado";
  if (texto === "Sem setor") return texto;
  if (texto === "Nao atribuido") return texto;

  if (
    texto in {
      RECEBIDO: true,
      EM_PRODUCAO: true,
      EM_APROVACAO: true,
      AP_PARA_PUBLICAR: true,
      CONCLUIDO: true,
      CANCELADO: true,
    }
  ) {
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

function agruparEvolucaoOrigemClipping(
  registros: ClippingResumo[],
  periodo: { inicio: string; fim: string; mes: string }
): EvolucaoOrigemItem[] {
  const mapa = new Map<string, { ascom: number; externo: number }>();

  for (const registro of registros) {
    const data = registro.data_publicacao;
    if (!data) continue;

    const chave = data.slice(0, 7);
    const atual = mapa.get(chave) || { ascom: 0, externo: 0 };

    if (registro.origem === "ASCOM") {
      atual.ascom += 1;
    } else {
      atual.externo += 1;
    }

    mapa.set(chave, atual);
  }

  const meses = montarJanelaMensal([...mapa.keys()], periodo);

  return meses.map((mes) => {
    const atual = mapa.get(mes) || { ascom: 0, externo: 0 };
    return {
      mes: formatarMes(mes),
      ascom: atual.ascom,
      externo: atual.externo,
    };
  });
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

function colunaOrigemNaoDisponivel(error: { message?: string } | null) {
  const mensagem = error?.message?.toLowerCase() || "";
  return mensagem.includes("origem") && mensagem.includes("schema cache");
}

async function buscarClippingCompleto(periodo: {
  inicio: string;
  fim: string;
  mes: string;
}): Promise<ClippingResumo[]> {
  const tamanhoPagina = 1000;
  let incluirOrigem = true;

  while (true) {
    const registros: ClippingResumo[] = [];
    let reiniciarSemOrigem = false;

    for (let inicio = 0; ; inicio += tamanhoPagina) {
      let query = supabase
        .from("clipping_registros")
        .select(
          incluirOrigem
            ? "origem, data_publicacao"
            : "observacoes, data_publicacao"
        )
        .order("data_publicacao", { ascending: true })
        .range(inicio, inicio + tamanhoPagina - 1);

      if (periodo.inicio) query = query.gte("data_publicacao", periodo.inicio);
      if (periodo.fim) query = query.lte("data_publicacao", periodo.fim);

      const { data, error } = await query;

      if (incluirOrigem && colunaOrigemNaoDisponivel(error)) {
        incluirOrigem = false;
        reiniciarSemOrigem = true;
        break;
      }

      if (error) return [];

      const pagina = (data || []) as unknown as Array<{
        origem?: string | null;
        observacoes?: string | null;
        data_publicacao: string | null;
      }>;

      registros.push(
        ...pagina.map((registro) => ({
          data_publicacao: registro.data_publicacao,
          origem: incluirOrigem
            ? registro.origem || "EXTERNO"
            : registro.observacoes?.includes("[SGDC_ORIGEM:ASCOM]")
              ? "ASCOM"
              : "EXTERNO",
        }))
      );

      if (pagina.length < tamanhoPagina) break;
    }

    if (!reiniciarSemOrigem) return registros;
  }
}
