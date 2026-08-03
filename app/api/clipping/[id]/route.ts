import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { usuarioEstaAutorizado } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

type CanalClipping = "INSTAGRAM" | "FACEBOOK" | "SITE";
type SentimentoClipping =
  | "POSITIVA"
  | "NEGATIVA"
  | "NEUTRA"
  | "NAO_CLASSIFICADO";
type StatusClipping = "EM_MONITORAMENTO" | "FECHADO" | "CRISE";

type UsuarioBody = {
  nome?: string | null;
};

type DeleteBody = {
  usuario?: UsuarioBody;
};

type UpdateBody = {
  titulo?: string;
  canal?: CanalClipping;
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
  usuario?: UsuarioBody;
};

const CANAIS = new Set<CanalClipping>(["INSTAGRAM", "FACEBOOK", "SITE"]);
const SENTIMENTOS = new Set<SentimentoClipping>([
  "POSITIVA",
  "NEGATIVA",
  "NEUTRA",
  "NAO_CLASSIFICADO",
]);
const STATUS = new Set<StatusClipping>(["EM_MONITORAMENTO", "FECHADO", "CRISE"]);

export async function PUT(request: Request, { params }: Params) {
  const clippingId = await obterClippingId(params);

  if (!clippingId) {
    return NextResponse.json({ error: "ID do clipping inválido." }, { status: 400 });
  }

  let body: UpdateBody;

  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const usuarioNome = body.usuario?.nome?.trim() || "";

  if (!usuarioNome || !usuarioEstaAutorizado(usuarioNome)) {
    return NextResponse.json(
      { error: "Usuário inválido para editar o clipping." },
      { status: 401 }
    );
  }

  const titulo = body.titulo?.trim() || "";

  if (!titulo) {
    return NextResponse.json(
      { error: "Informe o título da matéria." },
      { status: 400 }
    );
  }

  if (!body.canal || !CANAIS.has(body.canal)) {
    return NextResponse.json({ error: "Informe um canal válido." }, { status: 400 });
  }

  if (!body.sentimento || !SENTIMENTOS.has(body.sentimento)) {
    return NextResponse.json(
      { error: "Informe um sentimento válido." },
      { status: 400 }
    );
  }

  if (!body.status || !STATUS.has(body.status)) {
    return NextResponse.json({ error: "Informe um status válido." }, { status: 400 });
  }

  try {
    const admin = criarSupabaseAdmin();
    const agora = new Date().toISOString();

    const { data, error } = await admin
      .from("clipping_registros")
      .update({
        titulo,
        canal: body.canal,
        sentimento: body.sentimento,
        status: body.status,
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
      })
      .eq("id", clippingId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Não foi possível atualizar o clipping." },
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
      { error: "Não foi possível atualizar o clipping agora." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const clippingId = await obterClippingId(params);

  if (!clippingId) {
    return NextResponse.json({ error: "ID do clipping inválido." }, { status: 400 });
  }

  let body: DeleteBody;

  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const usuarioNome = body.usuario?.nome?.trim() || "";

  if (!usuarioNome || !usuarioEstaAutorizado(usuarioNome)) {
    return NextResponse.json(
      { error: "Usuário inválido para excluir o clipping." },
      { status: 401 }
    );
  }

  try {
    const admin = criarSupabaseAdmin();

    const { error } = await admin
      .from("clipping_registros")
      .delete()
      .eq("id", clippingId);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Não foi possível excluir o clipping." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível excluir o clipping agora." },
      { status: 500 }
    );
  }
}

async function obterClippingId(paramsPromise: Params["params"]) {
  const { id } = await paramsPromise;
  const clippingId = Number(id);

  if (!Number.isInteger(clippingId) || clippingId <= 0) {
    return null;
  }

  return clippingId;
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
