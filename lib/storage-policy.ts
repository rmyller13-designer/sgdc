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
  "text/csv",
  "text/plain",
];

export function validarArquivoUpload(arquivo: File) {
  if (arquivo.size > LIMITE_UPLOAD_BYTES) {
    return `O arquivo ${arquivo.name} ultrapassa o limite de ${LIMITE_UPLOAD_MB} MB.`;
  }

  if (
    arquivo.type &&
    !TIPOS_UPLOAD_PERMITIDOS.includes(arquivo.type)
  ) {
    return `Tipo de arquivo nao permitido: ${arquivo.name}.`;
  }

  return null;
}

export function criarCaminhoAnexoDemanda(demandaId: number, arquivo: File) {
  return `demanda-${demandaId}/anexos/${Date.now()}-${limparNomeArquivo(
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

function limparNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
