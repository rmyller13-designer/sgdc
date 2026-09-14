import { NextResponse } from "next/server";
import { importarGoogleAlerts } from "@/lib/google-alerts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    validarAcessoCron(request);
    const resultado = await importarGoogleAlerts();
    return NextResponse.json({ ok: true, resultado });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel importar o Google Alerts.",
      },
      { status: 500 }
    );
  }
}

function validarAcessoCron(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error("Configure CRON_SECRET na Vercel.");
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    throw new Error("Acesso nao autorizado ao importador do Google Alerts.");
  }
}
