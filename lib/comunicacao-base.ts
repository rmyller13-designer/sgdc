export const EIXOS_COMUNICACAO_PADRAO = [
  {
    nome: "COMUNICA\u00c7\u00c3O EXTERNA",
    descricao: "Site, redes sociais e cobertura de eventos externos",
  },
  {
    nome: "COMUNICA\u00c7\u00c3O INTERNA",
    descricao:
      "Intranet, WhatsApp interno, e-mail interno, comunicados, eventos e murais",
  },
  {
    nome: "DIVULGA\u00c7\u00c3O EXTERNA",
    descricao: "Disparo para imprensa e acompanhamento de entrevistas",
  },
  {
    nome: "GERENCIAMENTO DE CRISE",
    descricao: "Contato com imprensa em pautas potencialmente negativas",
  },
  {
    nome: "M\u00cdDIA ON E OFF",
    descricao: "Artes, campanhas e pe\u00e7as online/offline",
  },
  {
    nome: "PROC. INTERNOS ADM",
    descricao: "Reuni\u00f5es, relat\u00f3rios, clipping e mailing",
  },
] as const;

export const CANAIS_COMUNICACAO_PADRAO = [
  { eixo: "DIVULGA\u00c7\u00c3O EXTERNA", nome: "Acompanhamento de entrevistas" },
  { eixo: "M\u00cdDIA ON E OFF", nome: "Artes" },
  { eixo: "M\u00cdDIA ON E OFF", nome: "Campanhas" },
  { eixo: "COMUNICA\u00c7\u00c3O EXTERNA", nome: "Cobertura de eventos externos" },
  { eixo: "COMUNICA\u00c7\u00c3O INTERNA", nome: "Cobertura de eventos internos" },
  { eixo: "COMUNICA\u00c7\u00c3O INTERNA", nome: "Comunicados" },
  { eixo: "DIVULGA\u00c7\u00c3O EXTERNA", nome: "Disparo de e-mail para imprensa" },
  { eixo: "COMUNICA\u00c7\u00c3O INTERNA", nome: "Disparo de e-mail p\u00fablico interno" },
  { eixo: "DIVULGA\u00c7\u00c3O EXTERNA", nome: "Disparo de WhatsApp para imprensa" },
  { eixo: "COMUNICA\u00c7\u00c3O EXTERNA", nome: "Instagram" },
  { eixo: "COMUNICA\u00c7\u00c3O INTERNA", nome: "Intranet" },
  { eixo: "COMUNICA\u00c7\u00c3O EXTERNA", nome: "LinkedIn" },
  { eixo: "COMUNICA\u00c7\u00c3O INTERNA", nome: "Murais" },
  { eixo: "COMUNICA\u00c7\u00c3O INTERNA", nome: "Organiza\u00e7\u00e3o de eventos" },
  { eixo: "M\u00cdDIA ON E OFF", nome: "Pe\u00e7as offline" },
  { eixo: "M\u00cdDIA ON E OFF", nome: "Pe\u00e7as online" },
  { eixo: "COMUNICA\u00c7\u00c3O EXTERNA", nome: "Site" },
  { eixo: "COMUNICA\u00c7\u00c3O INTERNA", nome: "WhatsApp p\u00fablico interno" },
] as const;

export const PRODUTOS_COMUNICACAO_PADRAO = [
  "Arte",
  "Texto",
  "\u00c1udio",
  "Apresenta\u00e7\u00e3o",
  "Campanha",
  "Comunicado",
  "Clipping",
  "Mailing",
  "Briefing",
  "V\u00eddeo",
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
