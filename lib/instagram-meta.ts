import "server-only";
import { randomUUID } from "node:crypto";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

const CONFIG_ID = "principal";
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v23.0";
const INSTAGRAM_GRAPH_URL = `https://graph.instagram.com/${GRAPH_VERSION}`;
export const META_OAUTH_STATE_COOKIE = "sgdc_meta_oauth_state";

type SupabaseAdmin = ReturnType<typeof criarSupabaseAdmin>;

export type ConfiguracaoInstagramMeta = {
  id: string;
  ativo: boolean;
  facebook_page_id: string | null;
  facebook_page_name: string | null;
  instagram_business_account_id: string | null;
  instagram_username: string | null;
  instagram_nome_exibicao: string | null;
  token_acesso: string | null;
  token_tipo: string | null;
  token_expira_em: string | null;
  ultimo_sync_em: string | null;
  ultimo_sync_status: string | null;
  ultimo_sync_resumo: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

type ConfiguracaoInstagramPublica = Omit<ConfiguracaoInstagramMeta, "token_acesso" | "facebook_page_id" | "instagram_business_account_id" | "token_tipo">;

type StatusInstagramMeta = {
  configuracao: ConfiguracaoInstagramPublica;
  ambiente: {
    appConfigurado: boolean;
  };
  conexao: {
    conectado: boolean;
    contaInstagram: string | null;
    usuarioInstagram: string | null;
    expiraEm: string | null;
  };
};

type ResultadoSincronizacaoInstagram = {
  registrosAnalisados: number;
  registrosAtualizados: number;
  registrosSemCorrespondencia: number;
  linksInvalidos: number;
  erros: number;
  detalhesErros: Array<{ registroId: number; url: string | null; erro: string }>;
};

type GraphMedia = {
  id?: string;
  permalink?: string;
  shortcode?: string;
  like_count?: number;
  comments_count?: number;
};

type GraphListResponse<T> = {
  data?: T[];
  paging?: {
    next?: string;
  };
};

type InstagramMetricas = {
  views: number | null;
  likes: number | null;
  comentarios: number | null;
  compartilhamentos: number | null;
  salvos: number | null;
  engajamento: number | null;
};

export async function obterStatusInstagramMeta() {
  const admin = criarSupabaseAdmin();
  const configuracao = await garantirConfiguracaoInstagramMeta(admin);
  return montarStatusInstagramMeta(configuracao);
}

export async function salvarConfiguracaoInstagramMeta(input: { ativo: boolean }) {
  const admin = criarSupabaseAdmin();

  const { error } = await admin
    .from("configuracoes_instagram_meta")
    .upsert(
      {
        id: CONFIG_ID,
        ativo: Boolean(input.ativo),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    throw new Error(`Erro ao salvar configuracao do Instagram: ${error.message}`);
  }

  const configuracao = await garantirConfiguracaoInstagramMeta(admin);
  return montarStatusInstagramMeta(configuracao);
}

export async function desconectarInstagramMeta() {
  const admin = criarSupabaseAdmin();

  const { error } = await admin
    .from("configuracoes_instagram_meta")
    .update({
      ativo: false,
      facebook_page_id: null,
      facebook_page_name: null,
      instagram_business_account_id: null,
      instagram_username: null,
      instagram_nome_exibicao: null,
      token_acesso: null,
      token_tipo: null,
      token_expira_em: null,
      ultimo_sync_status: "desconectado",
      ultimo_sync_resumo: "Integração do Instagram desconectada manualmente.",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", CONFIG_ID);

  if (error) {
    throw new Error(`Erro ao desconectar Instagram: ${error.message}`);
  }

  const configuracao = await garantirConfiguracaoInstagramMeta(admin);
  return montarStatusInstagramMeta(configuracao);
}

export function criarEstadoOauthInstagram() {
  return randomUUID();
}

export function criarUrlConexaoInstagram(request: Request, state: string) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "Configure META_APP_ID e META_APP_SECRET na Vercel para integrar o Instagram."
    );
  }

  const redirectUri = obterRedirectUri(request);
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "instagram_business_basic");
  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");

  return url.toString();
}

export async function concluirConexaoInstagram(request: Request, code: string) {
  const redirectUri = obterRedirectUri(request);
  const tokenCurto = await trocarCodePorToken(code, redirectUri);
  const tokenLongo = await trocarPorTokenLongo(tokenCurto.access_token);
  const perfil = await obterPerfilInstagram(tokenLongo.access_token);
  const instagramId = String(perfil.user_id || perfil.id || tokenCurto.user_id || "");

  if (!instagramId) {
    throw new Error("O Instagram nao informou o identificador da conta conectada.");
  }

  const admin = criarSupabaseAdmin();

  const { error } = await admin
    .from("configuracoes_instagram_meta")
    .upsert(
      {
        id: CONFIG_ID,
        ativo: true,
        facebook_page_id: null,
        facebook_page_name: null,
        instagram_business_account_id: instagramId,
        instagram_username: perfil.username || null,
        instagram_nome_exibicao: perfil.name || perfil.username || null,
        token_acesso: tokenLongo.access_token,
        token_tipo: tokenLongo.token_type || tokenCurto.token_type || null,
        token_expira_em: calcularExpiracao(tokenLongo.expires_in),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    throw new Error(`Erro ao salvar conexao do Instagram: ${error.message}`);
  }

  return obterStatusInstagramMeta();
}

export async function sincronizarMetricasInstagramMeta() {
  const admin = criarSupabaseAdmin();
  const configuracao = await garantirConfiguracaoInstagramMeta(admin);

  if (!configuracao.ativo) {
    throw new Error("A sincronizacao automatica do Instagram esta desativada.");
  }

  if (
    !configuracao.token_acesso ||
    !configuracao.instagram_business_account_id
  ) {
    throw new Error(
      "Conecte a conta profissional do Instagram antes de sincronizar as metricas."
    );
  }

  const tokenAtual = await renovarTokenSeNecessario(admin, configuracao);
  const midias = await listarMidiasInstagram(
    configuracao.instagram_business_account_id,
    tokenAtual
  );
  const mapaMidias = new Map<string, GraphMedia>();

  for (const midia of midias) {
    if (!midia.id) continue;

    const permalink = normalizarPermalinkInstagram(midia.permalink);
    const shortcode = normalizarShortcodeInstagram(midia.shortcode);

    mapaMidias.set(`id:${midia.id}`, midia);
    if (permalink) mapaMidias.set(permalink, midia);
    if (shortcode) mapaMidias.set(shortcode, midia);
  }

  const { data: registros, error } = await admin
    .from("clipping_registros")
    .select(
      "id, canal, url, views, comentarios, likes, compartilhamentos, salvos, engajamento, instagram_media_id, instagram_shortcode"
    )
    .eq("canal", "INSTAGRAM")
    .not("url", "is", null)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Erro ao carregar clipping do Instagram: ${error.message}`);
  }

  const listaRegistros = (registros || []) as Array<{
    id: number;
    canal: "INSTAGRAM";
    url: string | null;
    views: number | null;
    comentarios: number | null;
    likes: number | null;
    compartilhamentos: number | null;
    salvos: number | null;
    engajamento: number | null;
    instagram_media_id: string | null;
    instagram_shortcode: string | null;
  }>;

  const cacheMetricas = new Map<string, InstagramMetricas>();
  const agora = new Date().toISOString();
  let registrosAtualizados = 0;
  let registrosSemCorrespondencia = 0;
  let linksInvalidos = 0;
  let erros = 0;
  const detalhesErros: ResultadoSincronizacaoInstagram["detalhesErros"] = [];

  for (const registro of listaRegistros) {
    const referencia = extrairReferenciaInstagram(registro.url || "");

    if (!referencia) {
      linksInvalidos += 1;
      continue;
    }

    const media =
      (registro.instagram_media_id
        ? mapaMidias.get(`id:${registro.instagram_media_id}`)
        : undefined) ||
      (registro.instagram_shortcode
        ? mapaMidias.get(normalizarShortcodeInstagram(registro.instagram_shortcode) || "")
        : undefined) ||
      (referencia.shortcode ? mapaMidias.get(referencia.shortcode) : undefined) ||
      mapaMidias.get(referencia.permalink);

    if (!media?.id) {
      registrosSemCorrespondencia += 1;
      continue;
    }

    try {
      let metricas = cacheMetricas.get(media.id);

      if (!metricas) {
        metricas = obterMetricasInstagram(media);
        cacheMetricas.set(media.id, metricas);
      }

      const likes =
        metricas.likes ?? numeroSeguro(registro.likes) ?? numeroSeguro(media.like_count);
      const comentarios =
        metricas.comentarios ??
        numeroSeguro(registro.comentarios) ??
        numeroSeguro(media.comments_count);
      const compartilhamentos =
        metricas.compartilhamentos ?? numeroSeguro(registro.compartilhamentos);
      const salvos = metricas.salvos ?? numeroSeguro(registro.salvos);
      const views = metricas.views ?? numeroSeguro(registro.views);
      const engajamento =
        metricas.engajamento ?? likes + comentarios + compartilhamentos + salvos;

      const { error: updateError } = await admin
        .from("clipping_registros")
        .update({
          views,
          comentarios,
          likes,
          compartilhamentos,
          salvos,
          engajamento,
          instagram_media_id: media.id,
          instagram_shortcode:
            referencia.shortcode || normalizarShortcodeInstagram(media.shortcode),
          metricas_atualizadas_em: agora,
          metricas_origem: "instagram_meta",
          atualizado_em: agora,
        })
        .eq("id", registro.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      registrosAtualizados += 1;
    } catch (error) {
      erros += 1;
      if (detalhesErros.length < 20) {
        detalhesErros.push({
          registroId: registro.id,
          url: registro.url,
          erro: error instanceof Error ? error.message : "Erro desconhecido.",
        });
      }
    }
  }

  const resultado = {
    registrosAnalisados: listaRegistros.length,
    registrosAtualizados,
    registrosSemCorrespondencia,
    linksInvalidos,
    erros,
    detalhesErros,
  };

  await registrarStatusSincronizacaoInstagram(
    admin,
    erros > 0 ? "parcial" : "sucesso",
    criarResumoSincronizacao(resultado)
  );

  return {
    resultado,
    status: await obterStatusInstagramMeta(),
  };
}

async function registrarStatusSincronizacaoInstagram(
  admin: SupabaseAdmin,
  status: string,
  resumo: string
) {
  await admin
    .from("configuracoes_instagram_meta")
    .upsert(
      {
        id: CONFIG_ID,
        ultimo_sync_em: new Date().toISOString(),
        ultimo_sync_status: status,
        ultimo_sync_resumo: resumo,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
}

function criarResumoSincronizacao(resultado: ResultadoSincronizacaoInstagram) {
  return [
    `${resultado.registrosAtualizados} registro(s) atualizado(s)`,
    `${resultado.registrosSemCorrespondencia} sem correspondencia`,
    `${resultado.linksInvalidos} link(s) invalido(s)`,
    `${resultado.erros} erro(s)`,
  ].join(" • ");
}

function montarStatusInstagramMeta(configuracao: ConfiguracaoInstagramMeta): StatusInstagramMeta {
  return {
    configuracao: {
      id: configuracao.id,
      ativo: configuracao.ativo,
      facebook_page_name: configuracao.facebook_page_name,
      instagram_username: configuracao.instagram_username,
      instagram_nome_exibicao: configuracao.instagram_nome_exibicao,
      token_expira_em: configuracao.token_expira_em,
      ultimo_sync_em: configuracao.ultimo_sync_em,
      ultimo_sync_status: configuracao.ultimo_sync_status,
      ultimo_sync_resumo: configuracao.ultimo_sync_resumo,
      criado_em: configuracao.criado_em,
      atualizado_em: configuracao.atualizado_em,
    },
    ambiente: {
      appConfigurado: Boolean(
        process.env.META_APP_ID && process.env.META_APP_SECRET
      ),
    },
    conexao: {
      conectado: Boolean(
        configuracao.token_acesso && configuracao.instagram_business_account_id
      ),
      contaInstagram: configuracao.instagram_nome_exibicao,
      usuarioInstagram: configuracao.instagram_username,
      expiraEm: configuracao.token_expira_em,
    },
  };
}

async function garantirConfiguracaoInstagramMeta(admin: SupabaseAdmin) {
  const { data, error } = await admin
    .from("configuracoes_instagram_meta")
    .select("*")
    .eq("id", CONFIG_ID)
    .maybeSingle();

  if (!error && data) {
    return data as ConfiguracaoInstagramMeta;
  }

  const { data: inserida, error: insertError } = await admin
    .from("configuracoes_instagram_meta")
    .upsert(
      {
        id: CONFIG_ID,
        ativo: false,
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (insertError || !inserida) {
    throw new Error("Nao foi possivel iniciar a configuracao do Instagram.");
  }

  return inserida as ConfiguracaoInstagramMeta;
}

function obterRedirectUri(request: Request) {
  const manual = process.env.META_REDIRECT_URI;
  if (manual) return manual;

  const url = new URL(request.url);
  const protocolo =
    request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (!host) {
    throw new Error("Nao foi possivel determinar a URL publica do SGDC.");
  }

  return `${protocolo}://${host}/api/configuracoes/instagram/callback`;
}

async function trocarCodePorToken(code: string, redirectUri: string) {
  const body = new FormData();
  body.set("client_id", process.env.META_APP_ID || "");
  body.set("client_secret", process.env.META_APP_SECRET || "");
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", redirectUri);
  body.set("code", code);

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body,
    cache: "no-store",
  });
  const json = (await response.json()) as {
    access_token: string;
    user_id?: string | number;
    token_type?: string;
    expires_in?: number;
    error_message?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(json.error_message || "Falha ao autorizar a conta do Instagram.");
  }

  return json;
}

async function trocarPorTokenLongo(tokenCurto: string) {
  return requisitarInstagramSemVersao<{
    access_token: string;
    token_type?: string;
    expires_in?: number;
  }>("/access_token", {
    grant_type: "ig_exchange_token",
    client_secret: process.env.META_APP_SECRET,
    access_token: tokenCurto,
  });
}

async function renovarTokenSeNecessario(
  admin: SupabaseAdmin,
  configuracao: ConfiguracaoInstagramMeta
) {
  const token = configuracao.token_acesso;
  if (!token) throw new Error("Token do Instagram nao encontrado.");

  const expiraEm = configuracao.token_expira_em
    ? new Date(configuracao.token_expira_em).getTime()
    : Number.POSITIVE_INFINITY;
  const dezDias = 10 * 24 * 60 * 60 * 1000;

  if (expiraEm - Date.now() > dezDias) return token;

  const renovado = await requisitarInstagramSemVersao<{
    access_token: string;
    token_type?: string;
    expires_in?: number;
  }>("/refresh_access_token", {
    grant_type: "ig_refresh_token",
    access_token: token,
  });

  const { error } = await admin
    .from("configuracoes_instagram_meta")
    .update({
      token_acesso: renovado.access_token,
      token_tipo: renovado.token_type || configuracao.token_tipo,
      token_expira_em: calcularExpiracao(renovado.expires_in),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", CONFIG_ID);

  if (error) {
    throw new Error(`Token renovado, mas nao foi possivel salva-lo: ${error.message}`);
  }

  return renovado.access_token;
}

async function obterPerfilInstagram(accessToken: string) {
  return requisitarInstagram<{
    id?: string;
    user_id?: string | number;
    username?: string;
    name?: string;
  }>("/me", {
    fields: "id,user_id,username,name",
    access_token: accessToken,
  });
}

async function listarMidiasInstagram(igUserId: string, accessToken: string) {
  const lista: GraphMedia[] = [];
  let nextUrl =
    `${INSTAGRAM_GRAPH_URL}/${igUserId}/media?` +
    new URLSearchParams({
      fields: "id,permalink,like_count,comments_count",
      limit: "100",
      access_token: accessToken,
    }).toString();

  while (nextUrl) {
    const response = await fetch(nextUrl, { cache: "no-store" });
    const json = (await response.json()) as GraphListResponse<GraphMedia> & {
      error?: { message?: string };
    };

    if (!response.ok || json.error) {
      throw new Error(json.error?.message || "Falha ao consultar midias do Instagram.");
    }

    lista.push(...(json.data || []));
    nextUrl = json.paging?.next || "";
  }

  return lista;
}

function obterMetricasInstagram(media: GraphMedia) {
  const base: InstagramMetricas = {
    views: null,
    likes: numeroSeguro(media.like_count),
    comentarios: numeroSeguro(media.comments_count),
    compartilhamentos: null,
    salvos: null,
    engajamento: null,
  };

  return {
    ...base,
    engajamento: (base.likes || 0) + (base.comentarios || 0),
  };
}

async function requisitarInstagram<T>(
  path: string,
  params: Record<string, string | undefined>
) {
  const url = new URL(`${INSTAGRAM_GRAPH_URL}${path}`);

  for (const [chave, valor] of Object.entries(params)) {
    if (valor) {
      url.searchParams.set(chave, valor);
    }
  }

  const response = await fetch(url.toString(), { cache: "no-store" });
  const json = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || "Falha ao consultar o Instagram.");
  }

  return json;
}

async function requisitarInstagramSemVersao<T>(
  path: string,
  params: Record<string, string | undefined>
) {
  const url = new URL(`https://graph.instagram.com${path}`);

  for (const [chave, valor] of Object.entries(params)) {
    if (valor) url.searchParams.set(chave, valor);
  }

  const response = await fetch(url.toString(), { cache: "no-store" });
  const json = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok || json.error) {
    throw new Error(json.error?.message || "Falha ao renovar o acesso ao Instagram.");
  }

  return json;
}

function calcularExpiracao(expiresIn?: number) {
  if (!expiresIn || !Number.isFinite(expiresIn)) return null;
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function normalizarPermalinkInstagram(url?: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    parsed.search = "";
    let resultado = parsed.toString().replace(/\/+$/, "");
    if (!resultado.endsWith("/")) resultado += "/";
    return resultado.toLowerCase();
  } catch {
    return null;
  }
}

function normalizarShortcodeInstagram(valor?: string | null) {
  const texto = (valor || "").trim();
  return texto ? texto.replace(/^@/, "").toLowerCase() : null;
}

function extrairReferenciaInstagram(url: string) {
  const permalink = normalizarPermalinkInstagram(url);

  if (!permalink) return null;

  try {
    const parsed = new URL(permalink);
    const partes = parsed.pathname.split("/").filter(Boolean);
    const indiceTipo = partes.findIndex((parte) =>
      ["p", "reel", "tv"].includes(parte.toLowerCase())
    );

    return {
      permalink,
      shortcode:
        indiceTipo >= 0 && partes[indiceTipo + 1]
          ? normalizarShortcodeInstagram(partes[indiceTipo + 1])
          : null,
    };
  } catch {
    return null;
  }
}

function numeroSeguro(valor: unknown) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) return 0;
  return Math.round(numero);
}
