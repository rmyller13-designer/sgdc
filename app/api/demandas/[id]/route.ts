import { NextResponse } from "next/server";
import { criarSessaoUsuario, podeEditarFluxo } from "@/lib/auth";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

type DeleteBody = {
  usuario?: {
    id?: number;
    nome?: string | null;
  };
};

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const demandaId = Number(id);

  if (!Number.isInteger(demandaId) || demandaId <= 0) {
    return NextResponse.json(
      { error: "ID da demanda invalido." },
      { status: 400 }
    );
  }

  let body: DeleteBody;

  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json(
      { error: "Informe o usuario que solicitou a exclusao." },
      { status: 400 }
    );
  }

  const usuarioId = Number(body.usuario?.id);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return NextResponse.json(
      { error: "Usuario invalido para excluir demanda." },
      { status: 401 }
    );
  }

  let supabase;

  try {
    supabase = criarSupabaseAdmin();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro de configuracao." },
      { status: 500 }
    );
  }

  const { usuarioBanco, error: usuarioError } = await buscarUsuarioSolicitante(
    supabase,
    usuarioId,
    body.usuario?.nome || ""
  );

  if (usuarioError || !usuarioBanco || usuarioBanco.ativo === false) {
    return NextResponse.json(
      { error: "Usuario nao encontrado ou inativo." },
      { status: 403 }
    );
  }

  const usuarioSessao = criarSessaoUsuario({
    id: Number(usuarioBanco.id),
    nome: usuarioBanco.nome,
    funcao: usuarioBanco.funcao,
    email: usuarioBanco.email,
    ativo: usuarioBanco.ativo,
  });

  if (
    body.usuario?.nome &&
    normalizar(body.usuario.nome) !== normalizar(usuarioSessao.nome)
  ) {
    return NextResponse.json(
      { error: "Sessao local nao confere com o usuario informado." },
      { status: 403 }
    );
  }

  if (!podeEditarFluxo(usuarioSessao)) {
    return NextResponse.json(
      { error: "Seu usuario nao tem permissao para excluir demandas." },
      { status: 403 }
    );
  }

  const { data: demanda, error: demandaError } = await supabase
    .from("demandas")
    .select("id, titulo")
    .eq("id", demandaId)
    .maybeSingle();

  if (demandaError) {
    return NextResponse.json({ error: demandaError.message }, { status: 500 });
  }

  if (!demanda) {
    return NextResponse.json(
      { error: "Demanda nao encontrada." },
      { status: 404 }
    );
  }

  const caminhosStorage = await buscarCaminhosStorage(supabase, demandaId);
  const erroDependencias = await excluirDependencias(supabase, demandaId);

  if (erroDependencias) {
    return NextResponse.json({ error: erroDependencias }, { status: 500 });
  }

  const { count, error } = await supabase
    .from("demandas")
    .delete({ count: "exact" })
    .eq("id", demandaId);

  if (error || count === 0) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "A demanda nao foi encontrada ou nao pode ser excluida.",
      },
      { status: error ? 500 : 404 }
    );
  }

  if (caminhosStorage.length > 0) {
    await supabase.storage.from("demandas").remove(caminhosStorage);
  }

  return NextResponse.json({ ok: true });
}

async function buscarCaminhosStorage(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  demandaId: number
) {
  const [anexos, comentarioAnexos] = await Promise.all([
    supabase
      .from("demanda_anexos")
      .select("caminho_storage")
      .eq("demanda_id", demandaId),
    supabase
      .from("comentario_anexos")
      .select("caminho_storage")
      .eq("demanda_id", demandaId),
  ]);

  return [
    ...((anexos.data || []) as Array<{ caminho_storage: string | null }>),
    ...((comentarioAnexos.data || []) as Array<{ caminho_storage: string | null }>),
  ]
    .map((item) => item.caminho_storage)
    .filter((caminho): caminho is string => Boolean(caminho));
}

async function excluirDependencias(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  demandaId: number
) {
  const tabelas = [
    "notificacoes_email",
    "comentario_anexos",
    "comentarios_demanda",
    "demanda_anexos",
    "demanda_checklist",
    "demanda_eixos",
    "demanda_canais",
    "demanda_produtos_quantidade",
    "historico_demanda",
  ];

  for (const tabela of tabelas) {
    const { error } = await supabase
      .from(tabela)
      .delete()
      .eq("demanda_id", demandaId);

    if (error && !tabelaAusente(error)) {
      return error.message;
    }
  }

  return null;
}

function tabelaAusente(error: { code?: string }) {
  return error.code === "42P01" || error.code === "PGRST205";
}

async function buscarUsuarioSolicitante(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  usuarioId: number,
  nomeUsuario: string
) {
  const porId = await supabase
    .from("usuarios_comunicacao")
    .select("id, nome, funcao, email, ativo")
    .eq("id", usuarioId)
    .maybeSingle();

  if (porId.data || porId.error) {
    return { usuarioBanco: porId.data, error: porId.error };
  }

  if (!nomeUsuario) {
    return { usuarioBanco: null, error: null };
  }

  const { data, error } = await supabase
    .from("usuarios_comunicacao")
    .select("id, nome, funcao, email, ativo");

  if (error) {
    return { usuarioBanco: null, error };
  }

  const nomeNormalizado = normalizar(nomeUsuario);
  const usuarioBanco =
    data?.find((item) => {
      if (item.ativo === false) {
        return false;
      }

      const sessao = criarSessaoUsuario({
        id: Number(item.id),
        nome: item.nome,
        funcao: item.funcao,
        email: item.email,
        ativo: item.ativo,
      });

      return (
        normalizar(item.nome) === nomeNormalizado ||
        normalizar(sessao.nome) === nomeNormalizado
      );
    }) || null;

  return { usuarioBanco, error: null };
}

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
