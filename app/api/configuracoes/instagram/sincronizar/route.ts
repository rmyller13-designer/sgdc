import { NextResponse } from "next/server";
import { sincronizarMetricasInstagramMeta } from "@/lib/instagram-meta";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { resultado, status } = await sincronizarMetricasInstagramMeta();

    return NextResponse.json({
      ok: true,
      resultado,
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel sincronizar as metricas do Instagram.",
      },
      { status: 500 }
    );
  }
}
