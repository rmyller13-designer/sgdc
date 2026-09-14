import { NextResponse } from "next/server";
import {
  obterStatusInstagramMeta,
  sincronizarMetricasInstagramMeta,
} from "@/lib/instagram-meta";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    validarAcessoCron(request);

    const statusAtual = await obterStatusInstagramMeta();
    if (!statusAtual.configuracao.ativo) {
      return NextResponse.json({
        ok: true,
        ignorado: true,
        motivo: "Sincronizacao automatica do Instagram desativada.",
      });
    }

    const { resultado } = await sincronizarMetricasInstagramMeta();
    return NextResponse.json({ ok: true, resultado });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel sincronizar o Instagram automaticamente.",
      },
      { status: 500 }
    );
  }
}

function validarAcessoCron(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    throw new Error("Configure CRON_SECRET na Vercel para habilitar a sincronizacao automatica.");
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    throw new Error("Acesso nao autorizado ao sincronizador do Instagram.");
  }
}
