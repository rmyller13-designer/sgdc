import { NextResponse } from "next/server";
import {
  desconectarInstagramMeta,
  obterStatusInstagramMeta,
  salvarConfiguracaoInstagramMeta,
} from "@/lib/instagram-meta";

export const dynamic = "force-dynamic";

type ConfiguracaoBody = {
  ativo?: boolean;
};

export async function GET() {
  try {
    const status = await obterStatusInstagramMeta();
    return NextResponse.json({
      ok: true,
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar a integracao do Instagram.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as ConfiguracaoBody;
    const status = await salvarConfiguracaoInstagramMeta({
      ativo: Boolean(body.ativo),
    });

    return NextResponse.json({
      ok: true,
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar a integracao do Instagram.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const status = await desconectarInstagramMeta();

    return NextResponse.json({
      ok: true,
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel desconectar o Instagram.",
      },
      { status: 500 }
    );
  }
}
