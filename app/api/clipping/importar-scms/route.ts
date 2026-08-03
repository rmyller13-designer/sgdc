import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import { usuarioEstaAutorizado } from "@/lib/auth";
import dataset from "@/data/clipping-scms-import.json";
import {
  criarChaveClippingExistente,
  criarChaveClippingImportado,
  type ArquivoClippingImportado,
  type RegistroClippingImportado,
} from "@/lib/clipping-import";

type ImportBody = {
  usuario?: {
    id?: number;
    nome?: string | null;
  };
};

const arquivoImportacao = dataset as ArquivoClippingImportado;
const TAMANHO_LOTE = 250;
const ANOS_PERMITIDOS = new Set([2025, 2026]);

const registrosPermitidos = arquivoImportacao.registros.filter((registro) =>
  ANOS_PERMITIDOS.has(registro.ano_origem)
);

const metaPermitida = {
  ...arquivoImportacao.meta,
  total_registros: registrosPermitidos.length,
  por_ano: Object.fromEntries(
    Object.entries(arquivoImportacao.meta.por_ano).filter(([ano]) =>
      ANOS_PERMITIDOS.has(Number(ano))
    )
  ),
  sentimentos: somarContadores(registrosPermitidos, (registro) => registro.sentimento),
  canais: somarContadores(registrosPermitidos, (registro) => registro.canal),
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    meta: metaPermitida,
    generatedAt: arquivoImportacao.generated_at,
    sourceFile: arquivoImportacao.source_file,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportBody;
    const usuarioNome = body.usuario?.nome?.trim() || "";

    if (!usuarioNome || !usuarioEstaAutorizado(usuarioNome)) {
      return NextResponse.json(
        { error: "Usuário inválido para importar o acervo." },
        { status: 401 }
      );
    }

    const admin = criarSupabaseAdmin();
    const { data: existentes, error: leituraError } = await admin
      .from("clipping_registros")
      .select("autoria, titulo, url, data_publicacao");

    if (leituraError) {
      return NextResponse.json(
        { error: "Não foi possível verificar os clippings já existentes." },
        { status: 500 }
      );
    }

    const chavesExistentes = new Set(
      ((existentes || []) as Array<{
        autoria?: string | null;
        titulo?: string | null;
        url?: string | null;
        data_publicacao?: string | null;
      }>).map(criarChaveClippingExistente)
    );

    const registrosNovos = registrosPermitidos.filter((registro) => {
      const chave = criarChaveClippingImportado(registro);
      if (chavesExistentes.has(chave)) {
        return false;
      }
      chavesExistentes.add(chave);
      return true;
    });

    let inseridos = 0;
    const lotes = chunk(registrosNovos, TAMANHO_LOTE);

    for (const lote of lotes) {
      const payload = lote.map((registro) => montarPayload(registro, body.usuario?.id, usuarioNome));
      const { error } = await admin.from("clipping_registros").insert(payload);

      if (error) {
        const detalhe = error.message || "";
        const migracaoSentimento =
          detalhe.toLowerCase().includes("sentimento") ||
          detalhe.toLowerCase().includes("clipping_registros_sentimento_check");

        return NextResponse.json(
          {
            error: migracaoSentimento
              ? "O banco ainda não foi atualizado para aceitar matérias não classificadas no clipping."
              : `A importação travou durante o lote ${inseridos + 1}. Detalhe: ${detalhe}`,
          },
          { status: 500 }
        );
      }

      inseridos += lote.length;
    }

    return NextResponse.json({
      ok: true,
      totalArquivo: metaPermitida.total_registros,
      inseridos,
      ignorados: metaPermitida.total_registros - inseridos,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível importar o acervo histórico agora." },
      { status: 500 }
    );
  }
}

function somarContadores<T>(
  itens: T[],
  seletor: (item: T) => string
): Record<string, number> {
  return itens.reduce<Record<string, number>>((acc, item) => {
    const chave = seletor(item);
    acc[chave] = (acc[chave] || 0) + 1;
    return acc;
  }, {});
}

function montarPayload(registro: RegistroClippingImportado, usuarioId?: number, usuarioNome?: string) {
  const notas = [registro.observacoes, `Importação histórica SCMS. Chave: ${registro.chave}`]
    .filter(Boolean)
    .join(" ");

  return {
    titulo: registro.titulo,
    canal: registro.canal,
    sentimento: registro.sentimento,
    status: registro.status,
    url: registro.url,
    data_publicacao: registro.data_publicacao,
    autoria: registro.autoria,
    views: registro.views,
    comentarios: registro.comentarios,
    likes: registro.likes,
    compartilhamentos: registro.compartilhamentos,
    salvos: registro.salvos,
    engajamento: registro.engajamento,
    observacoes: notas || null,
    criado_por_usuario_id:
      Number.isInteger(usuarioId) && Number(usuarioId) > 0 ? Number(usuarioId) : null,
    criado_por_nome: usuarioNome || "Importação SCMS",
  };
}

function chunk<T>(itens: T[], tamanho: number) {
  const lotes: T[][] = [];
  for (let index = 0; index < itens.length; index += tamanho) {
    lotes.push(itens.slice(index, index + tamanho));
  }
  return lotes;
}
