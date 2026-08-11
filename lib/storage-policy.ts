export const RETENCAO_ANEXOS_DIAS = 365;

export function validarArquivoUpload(arquivo: File) {
  void arquivo;
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
