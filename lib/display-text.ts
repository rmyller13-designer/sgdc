import {
  CANAIS_COMUNICACAO_PADRAO,
  EIXOS_COMUNICACAO_PADRAO,
  PRODUTOS_COMUNICACAO_PADRAO,
  normalizarTextoComunicacao,
} from "@/lib/comunicacao-base";
import { SETORES_OFICIAIS, normalizarNomeSetor } from "@/lib/setores-oficiais";

const mapaSetores = new Map(
  SETORES_OFICIAIS.map((item) => [normalizarNomeSetor(item), item])
);

const mapaProdutos = new Map(
  PRODUTOS_COMUNICACAO_PADRAO.map((item) => [
    normalizarTextoComunicacao(item),
    item,
  ])
);

const mapaCanais = new Map(
  CANAIS_COMUNICACAO_PADRAO.map((item) => [
    normalizarTextoComunicacao(item.nome),
    item.nome,
  ])
);

const mapaEixos = new Map(
  EIXOS_COMUNICACAO_PADRAO.map((item) => [
    normalizarTextoComunicacao(item.nome),
    item.nome,
  ])
);

const correcoesTexto = new Map<string, string>([
  ["N\u00c3\u00a3o", "N\u00e3o"],
  ["n\u00c3\u00a3o", "n\u00e3o"],
  ["\u00c3\u00a7", "\u00e7"],
  ["\u00c3\u00a3", "\u00e3"],
  ["\u00c3\u00a1", "\u00e1"],
  ["\u00c3\u00a2", "\u00e2"],
  ["\u00c3\u00a9", "\u00e9"],
  ["\u00c3\u00aa", "\u00ea"],
  ["\u00c3\u00ad", "\u00ed"],
  ["\u00c3\u00b3", "\u00f3"],
  ["\u00c3\u00b4", "\u00f4"],
  ["\u00c3\u00b5", "\u00f5"],
  ["\u00c3\u00ba", "\u00fa"],
  ["\u00c3\u0087", "\u00c7"],
  ["Aprovacao", "Aprova\u00e7\u00e3o"],
  ["Producao", "Produ\u00e7\u00e3o"],
  ["Comunicacao", "Comunica\u00e7\u00e3o"],
  ["Gestao", "Gest\u00e3o"],
  ["Calendario", "Calend\u00e1rio"],
  ["Relatorios", "Relat\u00f3rios"],
  ["Informacoes", "Informa\u00e7\u00f5es"],
  ["Descricao", "Descri\u00e7\u00e3o"],
  ["Titulo", "T\u00edtulo"],
  ["Solicitacao", "Solicita\u00e7\u00e3o"],
  ["Periodo", "Per\u00edodo"],
  ["Historico", "Hist\u00f3rico"],
  ["Concluido", "Conclu\u00eddo"],
  ["Concluidas", "Conclu\u00eddas"],
  ["Responsavel", "Respons\u00e1vel"],
  ["responsavel", "respons\u00e1vel"],
  ["Ate", "At\u00e9"],
  ["Sem titulo", "Sem t\u00edtulo"],
  ["Sem responsavel", "Sem respons\u00e1vel"],
  ["Seu usuario", "Seu usu\u00e1rio"],
  ["Usuario", "Usu\u00e1rio"],
  ["Usuarios", "Usu\u00e1rios"],
  ["usuario", "usu\u00e1rio"],
  ["usuarios", "usu\u00e1rios"],
  ["possivel", "poss\u00edvel"],
  ["Atrasado ha", "Atrasado h\u00e1"],
]);

export function corrigirTextoExibicao(valor?: string | null) {
  if (!valor) return "";

  let texto = valor.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  for (const [trecho, correcao] of correcoesTexto) {
    texto = texto.split(trecho).join(correcao);
  }

  return texto;
}

export function formatarSetorExibicao(valor?: string | null) {
  if (!valor) return "Sem setor";

  return (
    mapaSetores.get(normalizarNomeSetor(corrigirTextoExibicao(valor))) ||
    formatarTituloHumano(corrigirTextoExibicao(valor))
  );
}

export function formatarProdutoExibicao(valor?: string | null) {
  if (!valor) return "N\u00e3o informado";

  return (
    mapaProdutos.get(normalizarTextoComunicacao(corrigirTextoExibicao(valor))) ||
    formatarTituloHumano(corrigirTextoExibicao(valor))
  );
}

export function formatarCanalExibicao(valor?: string | null) {
  if (!valor) return "N\u00e3o informado";

  return (
    mapaCanais.get(normalizarTextoComunicacao(corrigirTextoExibicao(valor))) ||
    formatarTituloHumano(corrigirTextoExibicao(valor))
  );
}

export function formatarEixoExibicao(valor?: string | null) {
  if (!valor) return "N\u00e3o informado";

  return (
    mapaEixos.get(normalizarTextoComunicacao(corrigirTextoExibicao(valor))) ||
    formatarTituloHumano(corrigirTextoExibicao(valor))
  );
}

export function formatarStatusExibicao(status?: string | null) {
  const mapa: Record<string, string> = {
    RECEBIDO: "Recebido",
    EM_PRODUCAO: "Em Produ\u00e7\u00e3o",
    EM_APROVACAO: "Em Aprova\u00e7\u00e3o",
    AP_PARA_PUBLICAR: "Ap. para Publicar",
    CONCLUIDO: "Conclu\u00eddo",
    CANCELADO: "Cancelado",
  };

  if (!status) return "N\u00e3o informado";
  return mapa[status] || formatarTituloHumano(corrigirTextoExibicao(status));
}

export function formatarTituloHumano(valor?: string | null) {
  if (!valor) return "";

  const conectores = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
    "em",
    "para",
    "por",
    "na",
    "no",
  ]);

  return corrigirTextoExibicao(valor)
    .split(" ")
    .map((parte, index) => {
      if (!parte) return parte;
      if (parte === parte.toUpperCase() && parte.length <= 4) return parte;

      const base = parte.toLowerCase();
      if (index > 0 && conectores.has(base)) return base;

      return base.charAt(0).toUpperCase() + base.slice(1);
    })
    .join(" ");
}
