import { NextResponse } from "next/server";
import {
  executarBackupGoogleDrive,
  obterConfiguracaoBackupGoogleDrive,
  salvarConfiguracaoBackupGoogleDrive,
} from "@/lib/google-drive-backup";

export const dynamic = "force-dynamic";

type ConfiguracaoBody = {
  ativo?: boolean;
  pastaPaiId?: string | null;
};

export async function GET() {
  try {
    const configuracao = await obterConfiguracaoBackupGoogleDrive();
    return NextResponse.json({
      configuracao,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar as configurações do acervo." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as ConfiguracaoBody;
    const configuracao = await salvarConfiguracaoBackupGoogleDrive({
      ativo: Boolean(body.ativo),
      pastaPaiId: body.pastaPaiId || null,
    });

    return NextResponse.json({
      ok: true,
      configuracao,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível salvar as configurações do acervo." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const resultado = await executarBackupGoogleDrive();
    const configuracao = await obterConfiguracaoBackupGoogleDrive();

    return NextResponse.json({
      ok: true,
      resultado,
      configuracao,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível gerar o acervo agora." },
      { status: 500 }
    );
  }
}
