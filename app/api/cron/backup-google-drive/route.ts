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
        motivo: "Hoje ainda não é o último dia do mês.",
      });
    }

    const resultado = await executarBackupGoogleDrive();

    return NextResponse.json({
      ok: true,
      resultado,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível executar o acervo mensal." },
      { status: 500 }
    );
  }
}
