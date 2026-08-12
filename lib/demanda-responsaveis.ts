import { corrigirTextoExibicao } from "@/lib/display-text";

export type UsuarioResponsavel = {
  id: number;
  nome: string | null;
  funcao?: string | null;
};

type UsuarioResponsavelRelacionamento =
  | UsuarioResponsavel
  | UsuarioResponsavel[]
  | null;

export type DemandaResponsavelRow = {
  demanda_id: number;
  usuario_id: number;
  principal?: boolean | null;
  usuarios_comunicacao?: UsuarioResponsavelRelacionamento;
};

export type DemandaComResponsaveis = {
  id: number;
  responsavel?: string | null;
  cadastrado_por?: string | null;
};

export function normalizarUsuarioResponsavel(
  valor: UsuarioResponsavelRelacionamento | undefined
) {
  if (!valor) return null;
  return Array.isArray(valor) ? valor[0] || null : valor;
}

export function criarMapaResponsaveis(
  registros: DemandaResponsavelRow[] | null | undefined
) {
  const mapa = new Map<number, UsuarioResponsavel[]>();

  for (const registro of registros || []) {
    const usuario = normalizarUsuarioResponsavel(registro.usuarios_comunicacao);

    if (!usuario?.id) continue;

    const listaAtual = mapa.get(registro.demanda_id) || [];
    if (listaAtual.some((item) => item.id === usuario.id)) continue;

    listaAtual.push(usuario);
    mapa.set(registro.demanda_id, listaAtual);
  }

  for (const [demandaId, lista] of mapa.entries()) {
    mapa.set(
      demandaId,
      [...lista].sort((a, b) =>
        (corrigirTextoExibicao(a.nome) || "").localeCompare(
          corrigirTextoExibicao(b.nome) || "",
          "pt-BR"
        )
      )
    );
  }

  return mapa;
}

export function formatarListaResponsaveis(
  responsaveis: Array<UsuarioResponsavel | string | null | undefined>,
  fallback?: string | null
) {
  const nomes = responsaveis
    .map((item) =>
      typeof item === "string" ? item : item?.nome
    )
    .map((nome) => corrigirTextoExibicao(nome))
    .filter((nome): nome is string => Boolean(nome?.trim()));

  if (nomes.length > 0) {
    return nomes.join(", ");
  }

  return corrigirTextoExibicao(fallback) || null;
}

export function enriquecerDemandasComResponsaveis<T extends DemandaComResponsaveis>(
  demandas: T[],
  mapaResponsaveis: Map<number, UsuarioResponsavel[]>
) {
  return demandas.map((demanda) => {
    const responsaveis = mapaResponsaveis.get(demanda.id) || [];
    const responsavel = formatarListaResponsaveis(
      responsaveis,
      demanda.responsavel || null
    );

    return {
      ...demanda,
      responsaveis,
      responsavel,
    };
  });
}
