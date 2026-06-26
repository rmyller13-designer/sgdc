import { NextResponse } from "next/server";
import {
  executarBackupGoogleDrive,
  obterConfiguracaoBackupGoogleDrive,
  obterStatusInfraBackup,
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
      infra: obterStatusInfraBackup(),
    });
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Falha ao carregar as configuracoes do acervo.";

    return NextResponse.json({ error: mensagem }, { status: 500 });
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
      infra: obterStatusInfraBackup(),
    });
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Falha ao salvar as configuracoes do acervo.";

    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}

export async function POST() {
  try {
    const resultado = await executarBackupGoogleDrive({ origem: "manual" });
    const configuracao = await obterConfiguracaoBackupGoogleDrive();

    return NextResponse.json({
      ok: true,
      resultado,
      configuracao,
      infra: obterStatusInfraBackup(),
    });
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Falha ao executar o acervo manual.";

    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
