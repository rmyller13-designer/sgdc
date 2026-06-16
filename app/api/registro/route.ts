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

    const emailAtual = usuario.email?.trim().toLowerCase() || "";
    if (emailAtual && emailAtual !== email) {
      return NextResponse.json(
        { error: "Este usuario ja possui outro email cadastrado." },
        { status: 409 }
      );
    }

    const { data: createdUser, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome: usuario.nome,
          sgdc_usuario_id: usuarioId,
        },
      });

    if (createError) {
      return NextResponse.json(
        { error: traduzirErroAuthAdmin(createError.message) },
        { status: 400 }
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

function traduzirErroAuthAdmin(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("already been registered")) {
    return "Este email ja esta cadastrado.";
  }

  if (texto.includes("password")) {
    return "A senha informada nao atende aos requisitos minimos.";
  }

  return mensagem;
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
