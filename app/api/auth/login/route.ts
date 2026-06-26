import { NextResponse } from "next/server";
import { criarSessaoUsuario, usuarioEstaAutorizado } from "@/lib/auth";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

type LoginBody = {
  usuarioId?: number;
  senha?: string;
};

export async function POST(request: Request) {
  try {
    const senhaPadrao = process.env.SGDC_DEFAULT_PASSWORD;

    if (!senhaPadrao) {
      return NextResponse.json(
        { error: "O acesso do sistema ainda nao foi configurado." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as LoginBody;
    const usuarioId = Number(body.usuarioId);
    const senha = body.senha || "";

    if (!Number.isInteger(usuarioId) || usuarioId <= 0 || !senha) {
      return NextResponse.json(
        { error: "Preencha os dados de acesso corretamente." },
        { status: 400 }
      );
    }

    if (senha !== senhaPadrao) {
      return NextResponse.json(
        { error: "Credenciais invalidas." },
        { status: 401 }
      );
    }

    const admin = criarSupabaseAdmin();
    const { data: usuario, error } = await admin
      .from("usuarios_comunicacao")
      .select("id, nome, funcao, ativo, email")
      .eq("id", usuarioId)
      .maybeSingle();

    if (error || !usuario || usuario.ativo === false || !usuarioEstaAutorizado(usuario.nome)) {
      return NextResponse.json(
        { error: "Credenciais invalidas." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      usuario: criarSessaoUsuario({
        id: Number(usuario.id),
        nome: usuario.nome,
        funcao: usuario.funcao,
        email: usuario.email,
        ativo: usuario.ativo,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel concluir o login agora." },
      { status: 500 }
    );
  }
}
