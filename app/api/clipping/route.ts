import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { usuarioEstaAutorizado } from "@/lib/auth";

type CanalClipping = "INSTAGRAM" | "FACEBOOK" | "SITE";
type SentimentoClipping =
  | "POSITIVA"
  | "NEGATIVA"
  | "NEUTRA"
  | "NAO_CLASSIFICADO";
type StatusClipping = "EM_MONITORAMENTO" | "FECHADO" | "CRISE";
type OrigemClipping = "EXTERNO" | "ASCOM";

type ClippingBody = {
  id?: number | null;
  titulo?: string;
  canal?: CanalClipping;
  origem?: OrigemClipping;
  sentimento?: SentimentoClipping;
  status?: StatusClipping;
  url?: string | null;
  data_publicacao?: string;
  autoria?: string | null;
  views?: number;
  comentarios?: number;
  likes?: number;
  compartilhamentos?: number;
  salvos?: number;
  engajamento?: number;
  observacoes?: string | null;
  usuario?: {
    id?: number;
    nome?: string | null;
    funcao?: string | null;
    email?: string | null;
  };
};

const CANAIS = new Set<CanalClipping>(["INSTAGRAM", "FACEBOOK", "SITE"]);
const ORIGENS = new Set<OrigemClipping>(["EXTERNO", "ASCOM"]);
const SENTIMENTOS = new Set<SentimentoClipping>([
  "POSITIVA",
  "NEGATIVA",
  "NEUTRA",
  "NAO_CLASSIFICADO",
]);
const STATUS = new Set<StatusClipping>(["EM_MONITORAMENTO", "FECHADO", "CRISE"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClippingBody;
    const usuarioNome = body.usuario?.nome?.trim() || "";

    if (!usuarioNome || !usuarioEstaAutorizado(usuarioNome)) {
      return NextResponse.json(
        { error: "UsuÃ¡rio invÃ¡lido para salvar o clipping." },
        { status: 401 }
      );
    }

    const titulo = body.titulo?.trim() || "";
    const canal = body.canal;
    const origem = body.origem || "EXTERNO";
    const sentimento = body.sentimento;
    const status = body.status;

    if (!titulo) {
      return NextResponse.json(
        { error: "Informe o tÃ­tulo da matÃ©ria." },
        { status: 400 }
      );
    }

    if (!canal || !CANAIS.has(canal)) {
      return NextResponse.json(
        { error: "Informe um canal vÃ¡lido." },
        { status: 400 }
      );
    }

    if (!ORIGENS.has(origem)) {
      return NextResponse.json(
        { error: "Informe uma origem vÃ¡lida para o registro." },
        { status: 400 }
      );
    }

    if (!sentimento || !SENTIMENTOS.has(sentimento)) {
      return NextResponse.json(
        { error: "Informe um sentimento vÃ¡lido." },
        { status: 400 }
      );
    }

    if (!status || !STATUS.has(status)) {
      return NextResponse.json(
        { error: "Informe um status vÃ¡lido." },
        { status: 400 }
      );
    }

    const admin = criarSupabaseAdmin();
    const agora = new Date().toISOString();

    const payloadBase = {
      titulo,
      canal,
      origem,
      sentimento,
      status,
      url: limparTexto(body.url),
      data_publicacao: body.data_publicacao || new Date().toISOString().slice(0, 10),
      autoria: limparTexto(body.autoria),
      views: numeroSeguro(body.views),
      comentarios: numeroSeguro(body.comentarios),
      likes: numeroSeguro(body.likes),
      compartilhamentos: numeroSeguro(body.compartilhamentos),
      salvos: numeroSeguro(body.salvos),
      engajamento: numeroSeguro(body.engajamento),
      observacoes: limparTexto(body.observacoes),
      atualizado_em: agora,
    };

    if (body.id && Number.isInteger(body.id) && body.id > 0) {
      const { data, error } = await admin
        .from("clipping_registros")
        .update(payloadBase)
        .eq("id", body.id)
        .select("*")
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message || "NÃ£o foi possÃ­vel atualizar o clipping." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        id: Number(data.id),
        registro: data,
      });
    }

    const payloadCriacao = {
      ...payloadBase,
      criado_por_usuario_id:
        Number.isInteger(body.usuario?.id) && Number(body.usuario?.id) > 0
          ? Number(body.usuario?.id)
          : null,
      criado_por_nome: usuarioNome,
      criado_em: agora,
    };

    const { data, error } = await admin
      .from("clipping_registros")
      .insert(payloadCriacao)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "NÃ£o foi possÃ­vel salvar o clipping." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: Number(data.id),
      registro: data,
    });
  } catch {
    return NextResponse.json(
      { error: "NÃ£o foi possÃ­vel salvar o clipping agora." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const admin = criarSupabaseAdmin();
    const { data, error } = await admin
      .from("clipping_registros")
      .select("*")
      .order("data_publicacao", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message || "NÃ£o foi possÃ­vel carregar o clipping." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      registros: data || [],
    });
  } catch {
    return NextResponse.json(
      { error: "NÃ£o foi possÃ­vel carregar o clipping agora." },
      { status: 500 }
    );
  }
}

function numeroSeguro(valor: unknown) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) return 0;
  return Math.round(numero);
}

function limparTexto(valor: unknown) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return texto || null;
}
