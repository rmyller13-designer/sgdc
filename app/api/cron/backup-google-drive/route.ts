import { NextResponse } from "next/server";
import {
  executarBackupGoogleDrive,
  hojeEhUltimoDiaDoMes,
  obterConfiguracaoBackupGoogleDrive,
  validarAcessoCron,
} from "@/lib/google-drive-backup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    validarAcessoCron(request);

    const configuracao = await obterConfiguracaoBackupGoogleDrive();

    if (!configuracao.ativo) {
      return NextResponse.json({
        ok: true,
        ignorado: true,
        motivo: "Acervo mensal desativado.",
      });
    }

    if (!hojeEhUltimoDiaDoMes()) {
      return NextResponse.json({
        ok: true,
        ignorado: true,
        motivo: "Hoje ainda nao e o ultimo dia do mes.",
      });
    }

    const resultado = await executarBackupGoogleDrive();

    return NextResponse.json({
      ok: true,
      resultado,
    });
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Falha ao executar o acervo mensal.";

    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
