export const PRIORIDADES_PADRAO = [
  { nome: "BAIXA", ordem: 1 },
  { nome: "NORMAL", ordem: 2 },
  { nome: "ALTA", ordem: 3 },
  { nome: "URGENTE", ordem: 4 },
] as const;

export function normalizarNomePrioridade(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
