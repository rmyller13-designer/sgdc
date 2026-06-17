import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import {
  PRIORIDADES_PADRAO,
  normalizarNomePrioridade,
} from "@/lib/prioridades-padrao";

type PrioridadeRow = {
  id: number;
  nome: string;
  ordem: number | null;
};

export async function POST() {
  try {
    const admin = criarSupabaseAdmin();

    const { data: prioridadesAtuais, error: erroConsulta } = await admin
      .from("prioridades")
      .select("id, nome, ordem")
      .order("ordem");

    if (erroConsulta) {
      return NextResponse.json(
        { error: `Erro ao consultar prioridades: ${erroConsulta.message}` },
        { status: 500 }
      );
    }

    const prioridadesExistentes =
      (prioridadesAtuais as PrioridadeRow[] | null) || [];
    const nomesExistentes = new Set(
      prioridadesExistentes.map((item) =>
        normalizarNomePrioridade(item.nome)
      )
    );

    const prioridadesFaltantes = PRIORIDADES_PADRAO.filter(
      (item) => !nomesExistentes.has(normalizarNomePrioridade(item.nome))
    );

    if (prioridadesFaltantes.length > 0) {
      const { error: erroInsert } = await admin
        .from("prioridades")
        .insert(prioridadesFaltantes);

      if (erroInsert) {
        return NextResponse.json(
          { error: `Erro ao sincronizar prioridades: ${erroInsert.message}` },
          { status: 500 }
        );
      }
    }

    const { data: prioridadesAtualizadas, error: erroFinal } = await admin
      .from("prioridades")
      .select("id, nome, ordem")
      .order("ordem");

    if (erroFinal) {
      return NextResponse.json(
        { error: `Erro ao carregar prioridades: ${erroFinal.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: (prioridadesAtualizadas as PrioridadeRow[] | null) || [],
    });
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Falha ao sincronizar prioridades.";

    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
