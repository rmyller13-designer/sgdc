export const LIMITE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const LIMITE_UPLOAD_MB = LIMITE_UPLOAD_BYTES / 1024 / 1024;
export const RETENCAO_ANEXOS_DIAS = 365;

export const TIPOS_UPLOAD_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
  "text/csv",
  "text/plain",
];

export const EXTENSOES_UPLOAD_PERMITIDAS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".xlsm",
  ".xlsb",
  ".csv",
  ".txt",
  ".ppt",
  ".pptx",
  ".pps",
  ".ppsx",
];

export const TIPOS_ACEITOS_UPLOAD = [
  ...TIPOS_UPLOAD_PERMITIDOS,
  ...EXTENSOES_UPLOAD_PERMITIDAS,
];

export function validarArquivoUpload(arquivo: File) {
  if (arquivo.size > LIMITE_UPLOAD_BYTES) {
    return `O arquivo ${arquivo.name} ultrapassa o limite de ${LIMITE_UPLOAD_MB} MB.`;
  }

  const extensao = pegarExtensaoArquivo(arquivo.name);
  const tipoPermitido =
    !arquivo.type || TIPOS_UPLOAD_PERMITIDOS.includes(arquivo.type);
  const extensaoPermitida = EXTENSOES_UPLOAD_PERMITIDAS.includes(extensao);

  if (!tipoPermitido && !extensaoPermitida) {
    return `Tipo de arquivo não permitido: ${arquivo.name}.`;
  }

  return null;
}

export type CategoriaAnexoDemanda = "referencia" | "final";

export function criarCaminhoAnexoDemanda(
  demandaId: number,
  arquivo: File,
  categoria: CategoriaAnexoDemanda = "referencia"
) {
  const pasta = categoria === "final" ? "finais" : "referencia";

  return `demanda-${demandaId}/anexos/${pasta}/${Date.now()}-${limparNomeArquivo(
    arquivo.name
  )}`;
}

export function criarCaminhoAnexoComentario(
  demandaId: number,
  comentarioId: number,
  arquivo: File
) {
  return `demanda-${demandaId}/comentarios/comentario-${comentarioId}/${Date.now()}-${limparNomeArquivo(
    arquivo.name
  )}`;
}

export function trocarCategoriaNoCaminhoAnexoDemanda(
  caminho: string,
  categoriaDestino: CategoriaAnexoDemanda
) {
  const pastaDestino = categoriaDestino === "final" ? "finais" : "referencia";

  if (caminho.includes("/anexos/referencia/")) {
    return caminho.replace("/anexos/referencia/", `/anexos/${pastaDestino}/`);
  }

  if (caminho.includes("/anexos/finais/")) {
    return caminho.replace("/anexos/finais/", `/anexos/${pastaDestino}/`);
  }

  return caminho;
}

function limparNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function pegarExtensaoArquivo(nome: string) {
  const indice = nome.lastIndexOf(".");
  if (indice === -1) return "";
  return nome.slice(indice).toLowerCase();
}
