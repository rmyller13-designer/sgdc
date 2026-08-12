import type { SupabaseClient } from "@supabase/supabase-js";
import {
  criarMapaResponsaveis,
  formatarListaResponsaveis,
  type DemandaResponsavelRow,
} from "@/lib/demanda-responsaveis";

export type DemandaCompletaRow = {
  id: number;
  titulo: string | null;
  descricao: string | null;
  produto_id: number | null;
  setor_solicitante: string | null;
  solicitante: string | null;
  status: string | null;
  prioridade: string | null;
  data_solicitacao: string | null;
  data_entrega: string | null;
  concluido_em: string | null;
  observacoes: string | null;
  criado_em: string | null;
  setor_id: number | null;
  status_id: number | null;
  prioridade_id: number | null;
  usuario_comunicacao_id: number | null;
  responsavel_id: number | null;
  setor: string | null;
  cadastrado_por: string | null;
  responsavel: string | null;
  produto: string | null;
};

type BuscaOptions = {
  id?: number;
  limit?: number;
  orderBy?: "id" | "criado_em" | "data_solicitacao" | "data_entrega";
  ascending?: boolean;
  gteDataSolicitacao?: string;
  lteDataSolicitacao?: string;
};

const COLUNAS =
  "id, titulo, descricao, produto_id, setor_solicitante, solicitante, status, prioridade, data_solicitacao, data_entrega, concluido_em, observacoes, criado_em, setor_id, status_id, prioridade_id, usuario_comunicacao_id, responsavel_id";

export async function buscarDemandasCompletas(
  supabase: SupabaseClient,
  options: BuscaOptions = {}
) {
  let query = supabase.from("demandas").select(COLUNAS);

  if (options.id) query = query.eq("id", options.id);
  if (options.gteDataSolicitacao) {
    query = query.gte("data_solicitacao", options.gteDataSolicitacao);
  }
  if (options.lteDataSolicitacao) {
    query = query.lte("data_solicitacao", options.lteDataSolicitacao);
  }

  query = query.order(options.orderBy || "id", {
    ascending: options.ascending ?? false,
  });

  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  const demandas = ((data as DemandaCompletaRow[] | null) || []).map((item) => ({
    ...item,
    id: Number(item.id),
  }));

  if (error || demandas.length === 0) {
    return {
      data: [] as DemandaCompletaRow[],
      error,
    };
  }

  const demandaIds = demandas.map((item) => item.id);
  const setorIds = idsNumericos(demandas.map((item) => item.setor_id));
  const usuarioIds = idsNumericos([
    ...demandas.map((item) => item.usuario_comunicacao_id),
    ...demandas.map((item) => item.responsavel_id),
  ]);
  const produtoIds = idsNumericos(demandas.map((item) => item.produto_id));

  const [setoresRes, usuariosRes, produtosRes, responsaveisRes] = await Promise.all([
    setorIds.length > 0
      ? supabase.from("setores").select("id, nome").in("id", setorIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null }>, error: null }),
    usuarioIds.length > 0
      ? supabase.from("usuarios_comunicacao").select("id, nome").in("id", usuarioIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null }>, error: null }),
    produtoIds.length > 0
      ? supabase.from("produtos").select("id, nome").in("id", produtoIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null }>, error: null }),
    demandaIds.length > 0
      ? supabase
          .from("demanda_responsaveis")
          .select(
            "demanda_id, usuario_id, principal, usuarios_comunicacao(id, nome, funcao)"
          )
          .in("demanda_id", demandaIds)
          .order("principal", { ascending: false })
      : Promise.resolve({ data: [] as DemandaResponsavelRow[], error: null }),
  ]);

  const mapaSetores = new Map(
    (((setoresRes.data as Array<{ id: number; nome: string | null }> | null) || []).map((item) => [
      Number(item.id),
      item.nome,
    ]))
  );
  const mapaUsuarios = new Map(
    (((usuariosRes.data as Array<{ id: number; nome: string | null }> | null) || []).map((item) => [
      Number(item.id),
      item.nome,
    ]))
  );
  const mapaProdutos = new Map(
    (((produtosRes.data as Array<{ id: number; nome: string | null }> | null) || []).map((item) => [
      Number(item.id),
      item.nome,
    ]))
  );
  const mapaResponsaveis = responsaveisRes.error
    ? new Map<number, Array<{ id: number; nome: string | null; funcao?: string | null }>>()
    : criarMapaResponsaveis((responsaveisRes.data as DemandaResponsavelRow[] | null) || []);

  return {
    data: demandas.map((item) => ({
      ...item,
      setor: item.setor_id
        ? mapaSetores.get(item.setor_id) || item.setor_solicitante
        : item.setor_solicitante,
      cadastrado_por: item.usuario_comunicacao_id
        ? mapaUsuarios.get(item.usuario_comunicacao_id) || item.solicitante
        : item.solicitante,
      responsavel:
        formatarListaResponsaveis(
          mapaResponsaveis.get(item.id) || [],
          item.responsavel_id ? mapaUsuarios.get(item.responsavel_id) || null : null
        ) || null,
      produto: item.produto_id ? mapaProdutos.get(item.produto_id) || null : null,
    })),
    error,
  };
}

function idsNumericos(lista: Array<number | null | undefined>) {
  return Array.from(
    new Set(lista.filter((item): item is number => Number.isInteger(item) && Number(item) > 0))
  );
}
