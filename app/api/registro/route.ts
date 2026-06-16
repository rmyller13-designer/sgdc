import { NextResponse } from "next/server";
import { usuarioEstaAutorizado } from "@/lib/auth";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

type RegistroBody = {
  usuarioId?: number;
  email?: string;
  senha?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegistroBody;
    const usuarioId = Number(body.usuarioId);
    const email = body.email?.trim().toLowerCase() || "";
    const senha = body.senha || "";

    if (!Number.isFinite(usuarioId) || usuarioId <= 0) {
      return NextResponse.json(
        { error: "Selecione o usuario que sera vinculado." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Digite um email." },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { error: "A senha precisa ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const admin = criarSupabaseAdmin();

    const { data: usuario, error: usuarioError } = await admin
      .from("usuarios_comunicacao")
      .select("id, nome, funcao, ativo, email")
      .eq("id", usuarioId)
      .maybeSingle();

    if (usuarioError || !usuario || usuario.ativo === false) {
      return NextResponse.json(
        { error: "Usuario nao encontrado ou inativo." },
        { status: 404 }
      );
    }

    if (!usuarioEstaAutorizado(usuario.nome)) {
      return NextResponse.json(
        { error: "Usuario sem autorizacao para acessar o sistema." },
        { status: 403 }
      );
    }

    const acessoAtual = await buscarAcessoAtual(admin, usuarioId);
    const emailAtual = usuario.email?.trim().toLowerCase() || "";
    if (emailAtual && emailAtual !== email && !acessoAtual) {
      return NextResponse.json(
        { error: "Este usuario ja possui outro email cadastrado." },
        { status: 409 }
      );
    }

    const createdUser = await criarOuAtualizarContaAuth({
      admin,
      email,
      senha,
      usuarioId,
      nome: usuario.nome,
      authUserIdAtual: acessoAtual?.auth_user_id || null,
    });

    if (!createdUser.ok || !createdUser.user) {
      return NextResponse.json(
        { error: traduzirErroAuthAdmin(createdUser.error || "Falha ao criar conta.") },
        { status: 400 }
      );
    }

    const { data: acessoExistente } = await admin
      .from("usuarios_acesso")
      .select("usuario_comunicacao_id, auth_user_id")
      .eq("auth_user_id", createdUser.user.id)
      .maybeSingle();

    if (
      acessoExistente &&
      Number(acessoExistente.usuario_comunicacao_id) !== usuarioId
    ) {
      return NextResponse.json(
        { error: "Este email ja esta vinculado a outro usuario interno." },
        { status: 409 }
      );
    }

    await admin
      .from("usuarios_comunicacao")
      .update({ email })
      .eq("id", usuarioId);

    const { error: acessoError } = await admin
      .from("usuarios_acesso")
      .upsert(
        {
          usuario_comunicacao_id: usuarioId,
          auth_user_id: createdUser.user.id,
          perfil: "admin",
          ativo: true,
        },
        { onConflict: "usuario_comunicacao_id" }
      );

    if (acessoError && !tabelaOuColunaInexistente(acessoError.message)) {
      return NextResponse.json(
        { error: acessoError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Falha ao criar conta.";

    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}

async function criarOuAtualizarContaAuth(args: {
  admin: ReturnType<typeof criarSupabaseAdmin>;
  email: string;
  senha: string;
  usuarioId: number;
  nome: string;
  authUserIdAtual: string | null;
}) {
  const { admin, email, senha, usuarioId, nome, authUserIdAtual } = args;
  const payload = {
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      nome,
      sgdc_usuario_id: usuarioId,
    },
  };

  if (authUserIdAtual) {
    const { data, error } = await admin.auth.admin.updateUserById(
      authUserIdAtual,
      payload
    );

    return {
      ok: !error && Boolean(data.user),
      user: data.user ?? null,
      error: error?.message,
    };
  }

  const usuarioAuthExistente = await buscarUsuarioAuthPorEmail(admin, email);

  if (usuarioAuthExistente) {
    const { data, error } = await admin.auth.admin.updateUserById(
      usuarioAuthExistente.id,
      payload
    );

    return {
      ok: !error && Boolean(data.user),
      user: data.user ?? null,
      error: error?.message,
    };
  }

  const { data, error } = await admin.auth.admin.createUser(payload);

  if (!error && data.user) {
    return { ok: true, user: data.user, error: undefined };
  }

  if (podeSerContaExistente(error?.message)) {
    const usuarioCriadoEntreTentativas = await buscarUsuarioAuthPorEmail(admin, email);

    if (usuarioCriadoEntreTentativas) {
      const updateResultado = await admin.auth.admin.updateUserById(
        usuarioCriadoEntreTentativas.id,
        payload
      );

      return {
        ok: !updateResultado.error && Boolean(updateResultado.data.user),
        user: updateResultado.data.user ?? null,
        error: updateResultado.error?.message,
      };
    }
  }

  return {
    ok: false,
    user: null,
    error: error?.message || "Falha ao criar conta.",
  };
}

async function buscarUsuarioAuthPorEmail(
  admin: ReturnType<typeof criarSupabaseAdmin>,
  email: string
) {
  let page = 1;

  while (page <= 5) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error || !data?.users?.length) {
      return null;
    }

    const encontrado =
      data.users.find(
        (user) => user.email?.trim().toLowerCase() === email.toLowerCase()
      ) || null;

    if (encontrado) {
      return encontrado;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function buscarAcessoAtual(
  admin: ReturnType<typeof criarSupabaseAdmin>,
  usuarioId: number
) {
  const { data, error } = await admin
    .from("usuarios_acesso")
    .select("usuario_comunicacao_id, auth_user_id, ativo")
    .eq("usuario_comunicacao_id", usuarioId)
    .maybeSingle();

  if (error && !tabelaOuColunaInexistente(error.message)) {
    throw new Error(error.message);
  }

  return data ?? null;
}

function traduzirErroAuthAdmin(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("already been registered")) {
    return "Este email ja esta cadastrado.";
  }

  if (texto.includes("database error creating new user")) {
    return "Ja existe um cadastro parcial para este email no Auth. Tente novamente para reativar a conta ou use outro email.";
  }

  if (texto.includes("password")) {
    return "A senha informada nao atende aos requisitos minimos.";
  }

  return mensagem;
}

function podeSerContaExistente(mensagem?: string) {
  const texto = (mensagem || "").toLowerCase();

  return (
    texto.includes("already been registered") ||
    texto.includes("database error creating new user") ||
    texto.includes("duplicate key") ||
    texto.includes("unique constraint")
  );
}

function tabelaOuColunaInexistente(mensagem: string) {
  const texto = mensagem.toLowerCase();

  return (
    texto.includes("relation") ||
    texto.includes("does not exist") ||
    texto.includes("column") ||
    texto.includes("could not find")
  );
}
