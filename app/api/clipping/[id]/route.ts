import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { usuarioEstaAutorizado } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

type DeleteBody = {
  usuario?: {
    nome?: string | null;
  };
};

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const clippingId = Number(id);

  if (!Number.isInteger(clippingId) || clippingId <= 0) {
    return NextResponse.json(
      { error: "ID do clipping inválido." },
      { status: 400 }
    );
  }

  let body: DeleteBody;

  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida." },
      { status: 400 }
    );
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
