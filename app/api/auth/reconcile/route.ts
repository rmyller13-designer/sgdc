import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { usuarioEstaAutorizado } from "@/lib/auth";

type ReconcileBody = {
  accessToken?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReconcileBody;
    const accessToken = body.accessToken?.trim();

    if (!accessToken) {
      return NextResponse.json({ error: "Sessao invalida." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
    }

    const admin = criarSupabaseAdmin();
    const email = user.email?.trim().toLowerCase() || "";
    const usuarioIdMetadata = Number(user.user_metadata?.sgdc_usuario_id);

    let usuario = null as null | {
      id: number;
      nome: string;
      funcao: string | null;
      ativo: boolean | null;
      email?: string | null;
    };

    if (Number.isFinite(usuarioIdMetadata) && usuarioIdMetadata > 0) {
      const { data } = await admin
        .from("usuarios_comunicacao")
        .select("id, nome, funcao, ativo, email")
        .eq("id", usuarioIdMetadata)
        .maybeSingle();

      if (data) {
        usuario = {
          id: Number(data.id),
          nome: data.nome,
          funcao: data.funcao,
          ativo: data.ativo,
          email: data.email,
        };
      }
    }

    if (!usuario && email) {
      const { data } = await admin
        .from("usuarios_comunicacao")
        .select("id, nome, funcao, ativo, email")
        .ilike("email", email)
        .maybeSingle();

      if (data) {
        usuario = {
          id: Number(data.id),
          nome: data.nome,
          funcao: data.funcao,
          ativo: data.ativo,
          email: data.email,
        };
      }
    }

    if (!usuario || usuario.ativo === false || !usuarioEstaAutorizado(usuario.nome)) {
      return NextResponse.json(
        { error: "Usuario nao encontrado ou sem autorizacao." },
        { status: 404 }
      );
    }

    await admin
      .from("usuarios_comunicacao")
      .update({ email: email || usuario.email || null })
      .eq("id", usuario.id);

    await admin.auth.admin.updateUserById(user.id, {
      email: email || undefined,
      email_confirm: true,
      user_metadata: {
        nome: usuario.nome,
        sgdc_usuario_id: usuario.id,
      },
    });

    await admin.from("usuarios_acesso").upsert(
      {
        usuario_comunicacao_id: usuario.id,
        auth_user_id: user.id,
        perfil: "admin",
        ativo: true,
      },
      { onConflict: "usuario_comunicacao_id" }
    );

    return NextResponse.json({
      ok: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        funcao: usuario.funcao,
        ativo: usuario.ativo,
        email: email || usuario.email || null,
      },
    });
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Falha ao reconciliar conta.";

    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
