import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { criarSessaoUsuario, podeAtribuirResponsavel } from "@/lib/auth";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

type Body = {
  usuario?: {
    id?: number;
    nome?: string | null;
    funcao?: string | null;
    email?: string | null;
  };
  responsaveisIds?: number[];
};

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const demandaId = Number(id);

  if (!Number.isInteger(demandaId) || demandaId <= 0) {
    return NextResponse.json({ error: "ID da demanda invalido." }, { status: 400 });
  }

  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Dados invalidos para atualizar responsaveis." },
      { status: 400 }
    );
  }

  const nomeUsuario = body.usuario?.nome?.trim();
  const responsaveisIds = Array.from(
    new Set(
      (body.responsaveisIds || [])
        .map(Number)
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );

  if (!nomeUsuario) {
    return NextResponse.json(
      { error: "Usuario invalido para atualizar responsaveis." },
      { status: 401 }
    );
  }

  if (responsaveisIds.length === 0) {
    return NextResponse.json(
      { error: "Selecione ao menos um responsavel." },
      { status: 400 }
    );
  }

  let supabase;

  try {
    supabase = criarSupabaseAdmin();
  } catch {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error:
            "As configuracoes internas para atualizar responsaveis ainda nao foram concluidas.",
        },
        { status: 500 }
      );
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  const usuarioSessao = criarSessaoUsuario({
    id: Number(body.usuario?.id || 0),
    nome: nomeUsuario,
    funcao: body.usuario?.funcao || null,
    email: body.usuario?.email || null,
    ativo: true,
  });

  if (!podeAtribuirResponsavel(usuarioSessao)) {
    return NextResponse.json(
      { error: "Seu usuario nao tem permissao para atribuir responsaveis." },
      { status: 403 }
    );
  }

  const { data: demanda, error: demandaError } = await supabase
    .from("demandas")
    .select("id")
    .eq("id", demandaId)
    .maybeSingle();

  if (demandaError) {
    return NextResponse.json(
      { error: "Nao foi possivel localizar a demanda agora." },
      { status: 500 }
    );
  }

  if (!demanda) {
    return NextResponse.json({ error: "Demanda nao encontrada." }, { status: 404 });
  }

  const { error: erroRemocao } = await supabase
    .from("demanda_responsaveis")
    .delete()
    .eq("demanda_id", demandaId);

  if (erroRemocao) {
    return NextResponse.json(
      {
        error: mensagemErroResponsaveis(
          erroRemocao,
          "Nao foi possivel limpar os responsaveis atuais."
        ),
      },
      { status: 500 }
    );
  }

  const registros = responsaveisIds.map((usuarioId, index) => ({
    demanda_id: demandaId,
    usuario_id: usuarioId,
    principal: index === 0,
  }));

  const { error: erroInsercao } = await supabase
    .from("demanda_responsaveis")
    .insert(registros);

  if (erroInsercao) {
    return NextResponse.json(
      {
        error: mensagemErroResponsaveis(
          erroInsercao,
          "Nao foi possivel salvar os responsaveis da demanda."
        ),
      },
      { status: 500 }
    );
  }

  const { error: erroDemanda } = await supabase
    .from("demandas")
    .update({ responsavel_id: responsaveisIds[0] || null })
    .eq("id", demandaId);

  if (erroDemanda) {
    return NextResponse.json(
      {
        error:
          "Os responsaveis foram salvos, mas o responsavel principal nao foi sincronizado.",
      },
      { status: 500 }
    );
  }

  const { data: usuariosSelecionados } = await supabase
    .from("usuarios_comunicacao")
    .select("nome")
    .in("id", responsaveisIds)
    .order("nome");

  await supabase.from("historico_demanda").insert({
    demanda_id: demandaId,
    usuario_id: usuarioSessao.id,
    acao: `${usuarioSessao.nome} definiu os responsaveis da demanda para ${(
      (usuariosSelecionados || []) as Array<{ nome: string | null }>
    )
      .map((item) => item.nome)
      .filter(Boolean)
      .join(", ")}`,
  });

  return NextResponse.json({ ok: true });
}

function mensagemErroResponsaveis(
  error: { code?: string; message?: string },
  fallback: string
) {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return "A estrutura de multiplos responsaveis ainda nao foi criada no banco. Execute a migration nova do Supabase.";
  }

  return error.message || fallback;
}
