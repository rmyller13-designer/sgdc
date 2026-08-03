import "server-only";
import { randomUUID } from "node:crypto";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

const CONFIG_ID = "principal";
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v23.0";
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
    paginaFacebook: string | null;
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
};

type GraphPageAccount = {
  id?: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: {
    id?: string;
    username?: string;
    name?: string;
  } | null;
};

type GraphMedia = {
  id?: string;
  permalink?: string;
  shortcode?: string;
  like_count?: number;
  comments_count?: number;
};

type GraphPagePost = {
  id?: string;
  permalink_url?: string;
  shares?: {
    count?: number;
  } | null;
  reactions?: {
    summary?: {
      total_count?: number;
    };
  } | null;
  comments?: {
    summary?: {
      total_count?: number;
    };
  } | null;
};

type GraphListResponse<T> = {
  data?: T[];
  paging?: {
    next?: string;
  };
};

type GraphInsightValue =
  | number
  | string
  | Record<string, unknown>
  | null
  | undefined;

type GraphInsightResponse = {
  data?: Array<{
    name?: string;
    values?: Array<{
      value?: GraphInsightValue;
    }>;
  }>;
};

type InstagramMetricas = {
  views: number | null;
  likes: number | null;
  comentarios: number | null;
  compartilhamentos: number | null;
  salvos: number | null;
  engajamento: number | null;
};

type FacebookMetricas = {
  views: number | null;
  likes: number | null;
  comentarios: number | null;
  compartilhamentos: number | null;
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
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    [
      "instagram_basic",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
    ].join(",")
  );
  url.searchParams.set("auth_type", "rerequest");

  return url.toString();
}

export async function concluirConexaoInstagram(request: Request, code: string) {
  const redirectUri = obterRedirectUri(request);
  const tokenCurto = await trocarCodePorToken(code, redirectUri);
  const tokenLongo = await trocarPorTokenLongo(tokenCurto.access_token);
  const contas = await listarPaginasComInstagram(tokenLongo.access_token);
  const conta = selecionarContaInstagram(contas);

  if (!conta?.id || !conta.instagram_business_account?.id) {
    throw new Error(
      "Nenhuma pagina do Facebook vinculada a uma conta profissional do Instagram foi encontrada."
    );
  }

  const perfil = await obterPerfilInstagram(
    conta.instagram_business_account.id,
    tokenLongo.access_token
  );

  const admin = criarSupabaseAdmin();

  const { error } = await admin
    .from("configuracoes_instagram_meta")
    .upsert(
      {
        id: CONFIG_ID,
        ativo: true,
        facebook_page_id: conta.id,
        facebook_page_name: conta.name || null,
        instagram_business_account_id: conta.instagram_business_account.id,
        instagram_username:
          perfil.username || conta.instagram_business_account.username || null,
        instagram_nome_exibicao:
          perfil.name || conta.instagram_business_account.name || null,
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

  if (
    !configuracao.token_acesso ||
    !configuracao.instagram_business_account_id ||
    !configuracao.facebook_page_id
  ) {
    throw new Error(
      "Conecte a conta profissional da Meta antes de sincronizar Instagram e Facebook."
    );
  }

  const midias = await listarMidiasInstagram(
    configuracao.instagram_business_account_id,
    configuracao.token_acesso
  );
  const postsFacebook = await listarPostsFacebook(
    configuracao.facebook_page_id,
    configuracao.token_acesso
  );

  const mapaMidias = new Map<string, GraphMedia>();
  const mapaPostsFacebook = new Map<string, GraphPagePost>();

  for (const midia of midias) {
    if (!midia.id) continue;

    const permalink = normalizarPermalinkInstagram(midia.permalink);
    const shortcode = normalizarShortcodeInstagram(midia.shortcode);

    if (permalink) mapaMidias.set(permalink, midia);
    if (shortcode) mapaMidias.set(shortcode, midia);
  }

  for (const post of postsFacebook) {
    if (!post.id) continue;

    const permalink = normalizarPermalinkFacebook(post.permalink_url);
    const referencia = extrairReferenciaFacebook(post.permalink_url || "");

    if (permalink) {
      mapaPostsFacebook.set(permalink, post);
    }

    if (referencia?.fbid) {
      mapaPostsFacebook.set(referencia.fbid, post);
    }

    if (referencia?.storyFbid) {
      mapaPostsFacebook.set(referencia.storyFbid, post);
    }
  }

  const { data: registros, error } = await admin
    .from("clipping_registros")
    .select(
      "id, canal, url, views, comentarios, likes, compartilhamentos, salvos, engajamento"
    )
    .in("canal", ["INSTAGRAM", "FACEBOOK"])
    .not("url", "is", null)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Erro ao carregar clipping do Instagram: ${error.message}`);
  }

  const listaRegistros = (registros || []) as Array<{
    id: number;
    canal: "INSTAGRAM" | "FACEBOOK";
    url: string | null;
    views: number | null;
    comentarios: number | null;
    likes: number | null;
    compartilhamentos: number | null;
    salvos: number | null;
    engajamento: number | null;
  }>;

  const cacheMetricas = new Map<string, InstagramMetricas>();
  const cacheMetricasFacebook = new Map<string, FacebookMetricas>();
  const agora = new Date().toISOString();
  let registrosAtualizados = 0;
  let registrosSemCorrespondencia = 0;
  let linksInvalidos = 0;
  let erros = 0;

  for (const registro of listaRegistros) {
    if (registro.canal === "INSTAGRAM") {
      const referencia = extrairReferenciaInstagram(registro.url || "");

      if (!referencia) {
        linksInvalidos += 1;
        continue;
      }

      const media =
        (referencia.shortcode ? mapaMidias.get(referencia.shortcode) : undefined) ||
        mapaMidias.get(referencia.permalink);

      if (!media?.id) {
        registrosSemCorrespondencia += 1;
        continue;
      }

      try {
        let metricas = cacheMetricas.get(media.id);

        if (!metricas) {
          metricas = await obterMetricasInstagram(media, configuracao.token_acesso);
          cacheMetricas.set(media.id, metricas);
        }

        const likes =
          metricas.likes ??
          numeroSeguro(registro.likes) ??
          numeroSeguro(media.like_count);
        const comentarios =
          metricas.comentarios ??
          numeroSeguro(registro.comentarios) ??
          numeroSeguro(media.comments_count);
        const compartilhamentos =
          metricas.compartilhamentos ?? numeroSeguro(registro.compartilhamentos);
        const salvos = metricas.salvos ?? numeroSeguro(registro.salvos);
        const views = metricas.views ?? numeroSeguro(registro.views);
        const engajamento =
          metricas.engajamento ??
          likes +
            comentarios +
            compartilhamentos +
            salvos;

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
          erros += 1;
          continue;
        }

        registrosAtualizados += 1;
      } catch {
        erros += 1;
      }

      continue;
    }

    const referenciaFacebook = extrairReferenciaFacebook(registro.url || "");

    if (!referenciaFacebook) {
      linksInvalidos += 1;
      continue;
    }

    const postFacebook =
      (referenciaFacebook.fbid
        ? mapaPostsFacebook.get(referenciaFacebook.fbid)
        : undefined) ||
      (referenciaFacebook.storyFbid
        ? mapaPostsFacebook.get(referenciaFacebook.storyFbid)
        : undefined) ||
      mapaPostsFacebook.get(referenciaFacebook.permalink);

    if (!postFacebook?.id) {
      registrosSemCorrespondencia += 1;
      continue;
    }

    try {
      let metricasFacebook = cacheMetricasFacebook.get(postFacebook.id);

      if (!metricasFacebook) {
        metricasFacebook = await obterMetricasFacebook(
          postFacebook,
          configuracao.token_acesso
        );
        cacheMetricasFacebook.set(postFacebook.id, metricasFacebook);
      }

      const likes = metricasFacebook.likes ?? numeroSeguro(registro.likes);
      const comentarios =
        metricasFacebook.comentarios ?? numeroSeguro(registro.comentarios);
      const compartilhamentos =
        metricasFacebook.compartilhamentos ??
        numeroSeguro(registro.compartilhamentos);
      const views = metricasFacebook.views ?? numeroSeguro(registro.views);
      const engajamento =
        metricasFacebook.engajamento ??
        likes +
          comentarios +
          compartilhamentos;

      const { error: updateError } = await admin
        .from("clipping_registros")
        .update({
          views,
          comentarios,
          likes,
          compartilhamentos,
          engajamento,
          facebook_post_id: postFacebook.id,
          metricas_atualizadas_em: agora,
          metricas_origem: "facebook_meta",
          atualizado_em: agora,
        })
        .eq("id", registro.id);

      if (updateError) {
        erros += 1;
        continue;
      }

      registrosAtualizados += 1;
    } catch {
      erros += 1;
    }
  }

  const resultado = {
    registrosAnalisados: listaRegistros.length,
    registrosAtualizados,
    registrosSemCorrespondencia,
    linksInvalidos,
    erros,
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
      paginaFacebook: configuracao.facebook_page_name,
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
  return requisitarGraph<{
    access_token: string;
    token_type?: string;
    expires_in?: number;
  }>("/oauth/access_token", {
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  });
}

async function trocarPorTokenLongo(tokenCurto: string) {
  return requisitarGraph<{
    access_token: string;
    token_type?: string;
    expires_in?: number;
  }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: tokenCurto,
  });
}

async function listarPaginasComInstagram(accessToken: string) {
  const resultado = await requisitarGraph<GraphListResponse<GraphPageAccount>>(
    "/me/accounts",
    {
      fields: "id,name,access_token,instagram_business_account{id,username,name}",
      access_token: accessToken,
    }
  );

  return (resultado.data || []).filter(
    (item) => item.instagram_business_account?.id
  );
}

function selecionarContaInstagram(contas: GraphPageAccount[]) {
  if (contas.length === 0) return null;

  const preferida = contas.find((item) =>
    /santa|stacasa|ascom/i.test(
      `${item.name || ""} ${item.instagram_business_account?.name || ""}`
    )
  );

  return preferida || contas[0];
}

async function obterPerfilInstagram(igUserId: string, accessToken: string) {
  return requisitarGraph<{
    id?: string;
    username?: string;
    name?: string;
  }>(`/${igUserId}`, {
    fields: "id,username,name",
    access_token: accessToken,
  });
}

async function listarMidiasInstagram(igUserId: string, accessToken: string) {
  const lista: GraphMedia[] = [];
  let nextUrl =
    `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media?` +
    new URLSearchParams({
      fields: "id,permalink,shortcode,like_count,comments_count",
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

async function listarPostsFacebook(pageId: string, accessToken: string) {
  const lista: GraphPagePost[] = [];
  let nextUrl =
    `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/posts?` +
    new URLSearchParams({
      fields:
        "id,permalink_url,shares,reactions.limit(0).summary(total_count),comments.limit(0).summary(total_count)",
      limit: "100",
      access_token: accessToken,
    }).toString();

  while (nextUrl) {
    const response = await fetch(nextUrl, { cache: "no-store" });
    const json = (await response.json()) as GraphListResponse<GraphPagePost> & {
      error?: { message?: string };
    };

    if (!response.ok || json.error) {
      throw new Error(json.error?.message || "Falha ao consultar posts do Facebook.");
    }

    lista.push(...(json.data || []));
    nextUrl = json.paging?.next || "";
  }

  return lista;
}

async function obterMetricasInstagram(media: GraphMedia, accessToken: string) {
  const base: InstagramMetricas = {
    views: null,
    likes: numeroSeguro(media.like_count),
    comentarios: numeroSeguro(media.comments_count),
    compartilhamentos: null,
    salvos: null,
    engajamento: null,
  };

  const tentativas = [
    ["views", "saved", "shares", "total_interactions"],
    ["plays", "saved", "shares", "total_interactions"],
    ["video_views", "saved", "shares", "total_interactions"],
    ["impressions", "saved", "shares", "total_interactions"],
  ];

  for (const metricas of tentativas) {
    try {
      const insights = await requisitarGraph<GraphInsightResponse>(
        `/${media.id}/insights`,
        {
          metric: metricas.join(","),
          access_token: accessToken,
        }
      );

      const mapa = new Map<string, number>();

      for (const item of insights.data || []) {
        const valor = item.values?.[0]?.value;
        const numero = converterInsightEmNumero(valor);
        if (item.name && numero !== null) {
          mapa.set(item.name, numero);
        }
      }

      const views =
        mapa.get("views") ??
        mapa.get("plays") ??
        mapa.get("video_views") ??
        mapa.get("impressions") ??
        null;

      const compartilhamentos = mapa.get("shares") ?? null;
      const salvos = mapa.get("saved") ?? null;
      const engajamento =
        mapa.get("total_interactions") ??
        (base.likes || 0) +
          (base.comentarios || 0) +
          (compartilhamentos || 0) +
          (salvos || 0);

      return {
        ...base,
        views,
        compartilhamentos,
        salvos,
        engajamento,
      };
    } catch {
      continue;
    }
  }

  return {
    ...base,
    engajamento: (base.likes || 0) + (base.comentarios || 0),
  };
}

async function obterMetricasFacebook(post: GraphPagePost, accessToken: string) {
  const likes = numeroSeguro(post.reactions?.summary?.total_count);
  const comentarios = numeroSeguro(post.comments?.summary?.total_count);
  const compartilhamentos = numeroSeguro(post.shares?.count);

  const insights = await obterInsightsFacebook(post.id || "", accessToken);
  const views =
    insights.get("post_impressions") ??
    insights.get("post_video_views") ??
    insights.get("post_impressions_unique") ??
    null;
  const engajamento =
    insights.get("post_engaged_users") ??
    likes + comentarios + compartilhamentos;

  return {
    views,
    likes,
    comentarios,
    compartilhamentos,
    engajamento,
  };
}

async function obterInsightsFacebook(postId: string, accessToken: string) {
  const tentativas = [
    ["post_impressions", "post_engaged_users"],
    ["post_impressions_unique", "post_engaged_users"],
    ["post_video_views", "post_engaged_users"],
  ];

  for (const metricas of tentativas) {
    try {
      const insights = await requisitarGraph<GraphInsightResponse>(
        `/${postId}/insights`,
        {
          metric: metricas.join(","),
          access_token: accessToken,
        }
      );

      const mapa = new Map<string, number>();

      for (const item of insights.data || []) {
        const valor = item.values?.[0]?.value;
        const numero = converterInsightEmNumero(valor);
        if (item.name && numero !== null) {
          mapa.set(item.name, numero);
        }
      }

      return mapa;
    } catch {
      continue;
    }
  }

  return new Map<string, number>();
}

async function requisitarGraph<T>(
  path: string,
  params: Record<string, string | undefined>
) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}${path}`);

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
    throw new Error(json.error?.message || "Falha ao consultar a Meta.");
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

function normalizarPermalinkFacebook(url?: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    const fbid = parsed.searchParams.get("fbid");
    const storyFbid = parsed.searchParams.get("story_fbid");
    const permalink = `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");

    return (
      (fbid && `fbid:${fbid}`) ||
      (storyFbid && `story:${storyFbid}`) ||
      permalink.toLowerCase()
    );
  } catch {
    return null;
  }
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

function extrairReferenciaFacebook(url: string) {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    const fbid = parsed.searchParams.get("fbid");
    const storyFbid = parsed.searchParams.get("story_fbid");
    const permalink = `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "").toLowerCase();

    return {
      permalink,
      fbid,
      storyFbid,
    };
  } catch {
    return null;
  }
}

function converterInsightEmNumero(valor: GraphInsightValue) {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return Math.round(valor);
  }

  if (typeof valor === "string") {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.round(numero) : null;
  }

  if (valor && typeof valor === "object") {
    for (const item of Object.values(valor)) {
      if (typeof item === "number" && Number.isFinite(item)) {
        return Math.round(item);
      }
    }
  }

  return null;
}

function numeroSeguro(valor: unknown) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) return 0;
  return Math.round(numero);
}
