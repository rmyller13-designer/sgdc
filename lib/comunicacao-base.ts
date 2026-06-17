export const EIXOS_COMUNICACAO_PADRAO = [
  {
    nome: "COMUNICACAO EXTERNA",
    descricao: "Site, redes sociais e cobertura de eventos externos",
  },
  {
    nome: "COMUNICACAO INTERNA",
    descricao: "Intranet, WhatsApp interno, e-mail interno, comunicados, eventos e murais",
  },
  {
    nome: "DIVULGACAO EXTERNA",
    descricao: "Disparo para imprensa e acompanhamento de entrevistas",
  },
  {
    nome: "GERENCIAMENTO DE CRISE",
    descricao: "Contato com imprensa em pautas potencialmente negativas",
  },
  {
    nome: "MIDIA ON E OFF",
    descricao: "Artes, campanhas e pecas online/offline",
  },
  {
    nome: "PROC. INTERNOS ADM",
    descricao: "Reunioes, relatorios, clipping e mailing",
  },
] as const;

export const CANAIS_COMUNICACAO_PADRAO = [
  { eixo: "DIVULGACAO EXTERNA", nome: "Acompanhamento de entrevistas" },
  { eixo: "MIDIA ON E OFF", nome: "Artes" },
  { eixo: "MIDIA ON E OFF", nome: "Campanhas" },
  { eixo: "COMUNICACAO EXTERNA", nome: "Cobertura de eventos externos" },
  { eixo: "COMUNICACAO INTERNA", nome: "Cobertura de eventos internos" },
  { eixo: "COMUNICACAO INTERNA", nome: "Comunicados" },
  { eixo: "DIVULGACAO EXTERNA", nome: "Disparo de e-mail para imprensa" },
  { eixo: "COMUNICACAO INTERNA", nome: "Disparo de e-mail publico interno" },
  { eixo: "DIVULGACAO EXTERNA", nome: "Disparo de WhatsApp para imprensa" },
  { eixo: "COMUNICACAO EXTERNA", nome: "Instagram" },
  { eixo: "COMUNICACAO INTERNA", nome: "Intranet" },
  { eixo: "COMUNICACAO EXTERNA", nome: "LinkedIn" },
  { eixo: "COMUNICACAO INTERNA", nome: "Murais" },
  { eixo: "COMUNICACAO INTERNA", nome: "Organizacao de eventos" },
  { eixo: "MIDIA ON E OFF", nome: "Pecas offline" },
  { eixo: "MIDIA ON E OFF", nome: "Pecas online" },
  { eixo: "COMUNICACAO EXTERNA", nome: "Site" },
  { eixo: "COMUNICACAO INTERNA", nome: "WhatsApp publico interno" },
] as const;

export const PRODUTOS_COMUNICACAO_PADRAO = [
  "ARTE",
  "TEXTO",
  "AUDIO",
  "APRESENTACAO",
  "CAMPANHA",
  "COMUNICADO",
  "CLIPPING",
  "MAILING",
  "BRIEFING",
  "VIDEO",
  "FOTO",
  "POST",
  "RELEASE",
  "SITE",
] as const;

export function normalizarTextoComunicacao(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
