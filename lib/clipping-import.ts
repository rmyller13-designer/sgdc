export type CanalClippingImport = "INSTAGRAM" | "FACEBOOK" | "SITE";
export type SentimentoClippingImport =
  | "POSITIVA"
  | "NEGATIVA"
  | "NEUTRA"
  | "NAO_CLASSIFICADO";
export type StatusClippingImport = "EM_MONITORAMENTO" | "FECHADO" | "CRISE";

export type RegistroClippingImportado = {
  chave: string;
  ano_origem: number;
  mes_referencia: number;
  data_publicacao: string;
  data_precisao: "EXATA" | "URL" | "MES_REFERENCIA" | string;
  canal: CanalClippingImport;
  sentimento: SentimentoClippingImport;
  status: StatusClippingImport;
  autoria: string;
  titulo: string;
  url: string | null;
  observacoes: string | null;
  views: number;
  comentarios: number;
  likes: number;
  compartilhamentos: number;
  salvos: number;
  engajamento: number;
};

export type MetaClippingImportado = {
  total_registros: number;
  por_ano: Record<
    string,
    {
      total: number;
      canais: Record<string, number>;
      sentimentos: Record<string, number>;
      com_data_exata: number;
      com_data_inferida: number;
    }
  >;
  resumo_2024: Record<
    string,
    {
      total: number;
      positivas: number;
      negativas: number;
      neutras: number;
    }
  >;
  sentimentos: Record<string, number>;
  canais: Record<string, number>;
};

export type ArquivoClippingImportado = {
  source_file: string;
  generated_at: string;
  registros: RegistroClippingImportado[];
  meta: MetaClippingImportado;
};

export function criarChaveClippingExistente(item: {
  autoria?: string | null;
  titulo?: string | null;
  url?: string | null;
  data_publicacao?: string | null;
}) {
  return [
    slugify(item.autoria || ""),
    slugify(item.titulo || ""),
    slugify(item.url || ""),
    item.data_publicacao || "",
  ].join("|");
}

export function criarChaveClippingImportado(item: RegistroClippingImportado) {
  return criarChaveClippingExistente(item);
}

export function slugify(valor: string) {
  return removerAcentos(valor)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function removerAcentos(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
