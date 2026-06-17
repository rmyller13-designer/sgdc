import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { SETORES_OFICIAIS, normalizarNomeSetor } from "@/lib/setores-oficiais";

type SetorRow = {
  id: number;
  nome: string;
};

export async function POST() {
  try {
    const admin = criarSupabaseAdmin();

    const { data: setoresAtuais, error: erroConsulta } = await admin
      .from("setores")
      .select("id, nome")
      .order("nome");

    if (erroConsulta) {
      return NextResponse.json(
        { error: `Erro ao consultar setores: ${erroConsulta.message}` },
        { status: 500 }
      );
    }

    const setoresExistentes = (setoresAtuais as SetorRow[] | null) || [];
    const nomesExistentes = new Set(
      setoresExistentes.map((setor) => normalizarNomeSetor(setor.nome))
    );

    const setoresFaltantes = SETORES_OFICIAIS.filter(
      (nome) => !nomesExistentes.has(normalizarNomeSetor(nome))
    ).map((nome) => ({ nome }));

    if (setoresFaltantes.length > 0) {
      const { error: erroInsert } = await admin
        .from("setores")
        .insert(setoresFaltantes);

      if (erroInsert) {
        return NextResponse.json(
          { error: `Erro ao sincronizar setores: ${erroInsert.message}` },
          { status: 500 }
        );
      }
    }

    const { data: setoresAtualizados, error: erroFinal } = await admin
      .from("setores")
      .select("id, nome")
      .order("nome");

    if (erroFinal) {
      return NextResponse.json(
        { error: `Erro ao carregar setores: ${erroFinal.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: (setoresAtualizados as SetorRow[] | null) || [],
    });
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Falha ao sincronizar setores.";

    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
