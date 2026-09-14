import "server-only";
import { XMLParser } from "fast-xml-parser";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

type EntradaFeed = {
  id?: string;
  title?: string | { "#text"?: string };
  link?: string | { "@_href"?: string } | Array<{ "@_href"?: string }>;
  published?: string;
  updated?: string;
  pubDate?: string;
  source?: string | { "#text"?: string };
};

export type ResultadoGoogleAlerts = {
  feedsConsultados: number;
  itensEncontrados: number;
  importados: number;
  duplicados: number;
  invalidos: number;
  erros: string[];
};

export function obterStatusGoogleAlerts() {
  return {
    configurado: obterUrlsFeeds().length > 0,
    quantidadeFeeds: obterUrlsFeeds().length,
  };
}

export async function importarGoogleAlerts(): Promise<ResultadoGoogleAlerts> {
  const urlsFeeds = obterUrlsFeeds();
  if (urlsFeeds.length === 0) {
    throw new Error("Configure GOOGLE_ALERTS_RSS_URL na Vercel.");
  }

  const resultado: ResultadoGoogleAlerts = {
    feedsConsultados: 0,
    itensEncontrados: 0,
    importados: 0,
    duplicados: 0,
    invalidos: 0,
    erros: [],
  };
  const entradas: EntradaFeed[] = [];

  for (const feedUrl of urlsFeeds) {
    try {
      const response = await fetch(feedUrl, {
        cache: "no-store",
        headers: { "User-Agent": "SGDC-Clipping/1.0" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      entradas.push(...extrairEntradas(await response.text()));
      resultado.feedsConsultados += 1;
    } catch (error) {
      resultado.erros.push(
        `Feed ${ocultarFeed(feedUrl)}: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
    }
  }

  resultado.itensEncontrados = entradas.length;
  const candidatos = entradas
    .map(normalizarEntrada)
    .filter((item): item is NonNullable<typeof item> => {
      if (item) return true;
      resultado.invalidos += 1;
      return false;
    });

  if (candidatos.length === 0) return resultado;

  const admin = criarSupabaseAdmin();
  const urls = [...new Set(candidatos.map((item) => item.url))];
  const { data: existentes, error: erroExistentes } = await admin
    .from("clipping_registros")
    .select("url")
    .in("url", urls);

  if (erroExistentes) {
    throw new Error(`Erro ao verificar clippings existentes: ${erroExistentes.message}`);
  }

  const urlsExistentes = new Set(
    ((existentes || []) as Array<{ url: string | null }>)
      .map((item) => item.url)
      .filter((url): url is string => Boolean(url))
  );
  const vistosNestaExecucao = new Set<string>();

  for (const item of candidatos) {
    if (urlsExistentes.has(item.url) || vistosNestaExecucao.has(item.url)) {
      resultado.duplicados += 1;
      continue;
    }

    vistosNestaExecucao.add(item.url);
    const { error } = await admin.from("clipping_registros").insert({
      titulo: item.titulo,
      canal: "SITE",
      origem: "EXTERNO",
      sentimento: "NAO_CLASSIFICADO",
      status: "EM_MONITORAMENTO",
      url: item.url,
      data_publicacao: item.dataPublicacao,
      autoria: item.autoria,
      views: 0,
      comentarios: 0,
      likes: 0,
      compartilhamentos: 0,
      salvos: 0,
      engajamento: 0,
      observacoes: `Importado automaticamente do Google Alerts${
        item.alertId ? ` (${item.alertId})` : ""
      }. Revisar sentimento e dados editoriais.`,
      criado_por_nome: "Google Alerts",
    });

    if (error) {
      resultado.erros.push(`Item ${item.titulo}: ${error.message}`);
      continue;
    }

    resultado.importados += 1;
  }

  return resultado;
}

function obterUrlsFeeds() {
  const valor =
    process.env.GOOGLE_ALERTS_RSS_URLS || process.env.GOOGLE_ALERTS_RSS_URL || "";
  return valor
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter((item) => /^https:\/\/www\.google\.[^/]+\/alerts\/feeds\//i.test(item));
}

function extrairEntradas(xml: string): EntradaFeed[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    processEntities: true,
    trimValues: true,
  });
  const documento = parser.parse(xml) as {
    feed?: { entry?: EntradaFeed | EntradaFeed[] };
    rss?: { channel?: { item?: EntradaFeed | EntradaFeed[] } };
  };
  const itens = documento.feed?.entry || documento.rss?.channel?.item || [];
  return Array.isArray(itens) ? itens : [itens];
}

function normalizarEntrada(entrada: EntradaFeed) {
  const titulo = limparHtml(extrairTexto(entrada.title)).trim();
  const linkBruto = extrairLink(entrada.link);
  const url = extrairUrlDestino(linkBruto);
  if (!titulo || !url || !/^https?:\/\//i.test(url)) return null;

  const data = new Date(entrada.published || entrada.updated || entrada.pubDate || "");
  const dataPublicacao = Number.isNaN(data.getTime())
    ? new Date().toISOString().slice(0, 10)
    : data.toISOString().slice(0, 10);

  return {
    titulo,
    url,
    dataPublicacao,
    autoria: limparHtml(extrairTexto(entrada.source)).trim() || obterDominio(url),
    alertId: entrada.id?.trim() || null,
  };
}

function extrairTexto(valor?: string | { "#text"?: string }) {
  return typeof valor === "string" ? valor : valor?.["#text"] || "";
}

function extrairLink(valor?: EntradaFeed["link"]) {
  if (typeof valor === "string") return valor;
  if (Array.isArray(valor)) return valor.find((item) => item?.["@_href"])?.["@_href"] || "";
  return valor?.["@_href"] || "";
}

function extrairUrlDestino(valor: string) {
  try {
    const url = new URL(valor);
    const destino = url.searchParams.get("url") || url.searchParams.get("q");
    return destino && /^https?:\/\//i.test(destino) ? destino : url.toString();
  } catch {
    return "";
  }
}

function limparHtml(valor: string) {
  return valor
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

function obterDominio(valor: string) {
  try {
    return new URL(valor).hostname.replace(/^www\./, "");
  } catch {
    return "Google Alerts";
  }
}

function ocultarFeed(valor: string) {
  try {
    const url = new URL(valor);
    return `${url.origin}/alerts/feeds/***`;
  } catch {
    return "Google Alerts";
  }
}
