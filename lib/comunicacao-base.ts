export const EIXOS_COMUNICACAO_PADRAO = [
  {
    nome: "COMUNICAÇÃO EXTERNA",
    descricao: "Site, redes sociais e cobertura de eventos externos",
  },
  {
    nome: "COMUNICAÇÃO INTERNA",
    descricao: "Intranet, WhatsApp interno, e-mail interno, comunicados, eventos e murais",
  },
  {
    nome: "DIVULGAÇÃO EXTERNA",
    descricao: "Disparo para imprensa e acompanhamento de entrevistas",
  },
  {
    nome: "GERENCIAMENTO DE CRISE",
    descricao: "Contato com imprensa em pautas potencialmente negativas",
  },
  {
    nome: "MÍDIA ON E OFF",
    descricao: "Artes, campanhas e peças online/offline",
  },
  {
    nome: "PROC. INTERNOS ADM",
    descricao: "Reuniões, relatórios, clipping e mailing",
  },
] as const;

export const CANAIS_COMUNICACAO_PADRAO = [
  { eixo: "DIVULGAÇÃO EXTERNA", nome: "Acompanhamento de entrevistas" },
  { eixo: "MÍDIA ON E OFF", nome: "Artes" },
  { eixo: "MÍDIA ON E OFF", nome: "Campanhas" },
  { eixo: "COMUNICAÇÃO EXTERNA", nome: "Cobertura de eventos externos" },
  { eixo: "COMUNICAÇÃO INTERNA", nome: "Cobertura de eventos internos" },
  { eixo: "COMUNICAÇÃO INTERNA", nome: "Comunicados" },
  { eixo: "DIVULGAÇÃO EXTERNA", nome: "Disparo de e-mail para imprensa" },
  { eixo: "COMUNICAÇÃO INTERNA", nome: "Disparo de e-mail público interno" },
  { eixo: "DIVULGAÇÃO EXTERNA", nome: "Disparo de WhatsApp para imprensa" },
  { eixo: "COMUNICAÇÃO EXTERNA", nome: "Instagram" },
  { eixo: "COMUNICAÇÃO INTERNA", nome: "Intranet" },
  { eixo: "COMUNICAÇÃO EXTERNA", nome: "LinkedIn" },
  { eixo: "COMUNICAÇÃO INTERNA", nome: "Murais" },
  { eixo: "COMUNICAÇÃO INTERNA", nome: "Organização de eventos" },
  { eixo: "MÍDIA ON E OFF", nome: "Peças offline" },
  { eixo: "MÍDIA ON E OFF", nome: "Peças online" },
  { eixo: "COMUNICAÇÃO EXTERNA", nome: "Site" },
  { eixo: "COMUNICAÇÃO INTERNA", nome: "WhatsApp público interno" },
] as const;

export const PRODUTOS_COMUNICACAO_PADRAO = [
  "Arte",
  "Texto",
  "Áudio",
  "Apresentação",
  "Campanha",
  "Comunicado",
  "Clipping",
  "Mailing",
  "Briefing",
  "Vídeo",
  "Foto",
  "Post",
  "Release",
  "Site",
] as const;

export const CANAL_PARA_PRODUTOS_PADRAO: Record<string, string[]> = {
  "ACOMPANHAMENTO DE ENTREVISTAS": ["Release", "Texto"],
  ARTES: ["Arte"],
  CAMPANHAS: ["Campanha", "Arte", "Texto"],
  "COBERTURA DE EVENTOS EXTERNOS": ["Foto", "Texto"],
  "COBERTURA DE EVENTOS INTERNOS": ["Foto", "Texto"],
  COMUNICADOS: ["Comunicado", "Texto"],
  "DISPARO DE E-MAIL PARA IMPRENSA": ["Mailing", "Texto"],
  "DISPARO DE E-MAIL PUBLICO INTERNO": ["Mailing", "Texto"],
  "DISPARO DE WHATSAPP PARA IMPRENSA": ["Post", "Texto", "Arte"],
  INSTAGRAM: ["Post", "Arte", "Texto"],
  INTRANET: ["Texto", "Arte"],
  LINKEDIN: ["Post", "Arte", "Texto"],
  MURAIS: ["Arte", "Texto"],
  "ORGANIZACAO DE EVENTOS": ["Briefing", "Texto"],
  "PECAS OFFLINE": ["Arte"],
  "PECAS ONLINE": ["Arte"],
  SITE: ["Site", "Texto", "Arte"],
  "WHATSAPP PUBLICO INTERNO": ["Post", "Texto", "Arte"],
};

export function normalizarTextoComunicacao(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
