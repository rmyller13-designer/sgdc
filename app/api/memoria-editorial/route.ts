import { NextResponse } from "next/server";
import { buscarMemoriaEditorial } from "@/lib/memoria-editorial";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const titulo = searchParams.get("titulo");
  const descricao = searchParams.get("descricao");
  const setor = searchParams.get("setor");
  const excluirDemandaId = Number(searchParams.get("excluirDemandaId") || "");

  const sugestoes = await buscarMemoriaEditorial({
    titulo,
    descricao,
    setor,
    excluirDemandaId: Number.isNaN(excluirDemandaId) ? null : excluirDemandaId,
  });

  return NextResponse.json({ data: sugestoes });
}
