import { NextResponse } from "next/server";
import { criarSessaoUsuario, podeEditarFluxo } from "@/lib/auth";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

type DeleteBody = {
  usuario?: {
    id?: number;
    nome?: string | null;
    funcao?: string | null;
    email?: string | null;
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
      { error: "ID da demanda inválido." },
      { status: 400 }
    );
  }

  let body: DeleteBody;

  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json(
      { error: "Informe o usuário que solicitou a exclusão." },
      { status: 400 }
    );
  }

  const nomeUsuario = body.usuario?.nome?.trim();

  if (!nomeUsuario) {
    return NextResponse.json(
      { error: "Usuário inválido para excluir demanda." },
      { status: 401 }
    );
  }

  let supabase;

  try {
    supabase = criarSupabaseAdmin();
  } catch (error) {
    return NextResponse.json(
        { error: error instanceof Error ? error.message : "Erro de configuração." },
      { status: 500 }
    );
  }

  const usuarioSessao = criarSessaoUsuario({
    id: Number(body.usuario?.id || 0),
    nome: nomeUsuario,
    funcao: body.usuario?.funcao || null,
    email: body.usuario?.email || null,
    ativo: true,
  });

  if (!podeEditarFluxo(usuarioSessao)) {
    return NextResponse.json(
      { error: "Seu usuário não tem permissão para excluir demandas." },
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
      { error: "Demanda não encontrada." },
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
          "A demanda não foi encontrada ou não pode ser excluída.",
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
