import { NextResponse } from "next/server";
import { criarSessaoUsuario } from "@/lib/auth";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import {
  trocarCategoriaNoCaminhoAnexoDemanda,
  type CategoriaAnexoDemanda,
} from "@/lib/storage-policy";

type Params = {
  params: Promise<{ id: string; anexoId: string }>;
};

type Body = {
  categoriaDestino?: CategoriaAnexoDemanda;
  nomeArquivo?: string;
  caminhoStorage?: string | null;
  usuario?: {
    id?: number;
    nome?: string | null;
    funcao?: string | null;
    email?: string | null;
  };
};

export async function POST(request: Request, { params }: Params) {
  const { id, anexoId } = await params;
  const demandaId = Number(id);
  const anexoIdNumero = Number(anexoId);

  if (!Number.isInteger(demandaId) || demandaId <= 0) {
    return NextResponse.json({ error: "ID da demanda invalido." }, { status: 400 });
  }

  if (!Number.isInteger(anexoIdNumero) || anexoIdNumero <= 0) {
    return NextResponse.json({ error: "ID do anexo invalido." }, { status: 400 });
  }

  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
  }

  const categoriaDestino = body.categoriaDestino;

  if (categoriaDestino !== "referencia" && categoriaDestino !== "final") {
    return NextResponse.json({ error: "Categoria de destino invalida." }, { status: 400 });
  }

  if (!body.usuario?.nome) {
    return NextResponse.json({ error: "Usuario invalido." }, { status: 401 });
  }

  let admin;

  try {
    admin = criarSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "As configuracoes internas do Supabase ainda nao foram concluidas." },
      { status: 500 }
    );
  }

  const usuarioSessao = criarSessaoUsuario({
    id: Number(body.usuario.id || 0),
    nome: body.usuario.nome,
    funcao: body.usuario.funcao || null,
    email: body.usuario.email || null,
    ativo: true,
  });

  const { data: anexoAtual, error: anexoError } = await admin
    .from("demanda_anexos")
    .select("id, demanda_id, categoria, caminho_storage, url_arquivo, nome_arquivo")
    .eq("id", anexoIdNumero)
    .eq("demanda_id", demandaId)
    .maybeSingle();

  if (anexoError || !anexoAtual) {
    return NextResponse.json(
      { error: "Nao foi possivel localizar o anexo agora." },
      { status: 404 }
    );
  }

  let reorganizouStorage = false;
  let proximoCaminho = anexoAtual.caminho_storage;
  let proximaUrl = anexoAtual.url_arquivo;

  if (anexoAtual.caminho_storage) {
    const caminhoDestino = trocarCategoriaNoCaminhoAnexoDemanda(
      anexoAtual.caminho_storage,
      categoriaDestino
    );

    if (caminhoDestino !== anexoAtual.caminho_storage) {
      const { error: erroMove } = await admin.storage
        .from("demandas")
        .move(anexoAtual.caminho_storage, caminhoDestino);

      if (!erroMove) {
        reorganizouStorage = true;
        proximoCaminho = caminhoDestino;
        const { data } = admin.storage.from("demandas").getPublicUrl(caminhoDestino);
        proximaUrl = data.publicUrl;
      }
    }
  }

  const payload: {
    categoria: CategoriaAnexoDemanda;
    caminho_storage?: string | null;
    url_arquivo?: string | null;
  } = {
    categoria: categoriaDestino,
  };

  if (reorganizouStorage) {
    payload.caminho_storage = proximoCaminho;
    payload.url_arquivo = proximaUrl;
  }

  const { error: updateError } = await admin
    .from("demanda_anexos")
    .update(payload)
    .eq("id", anexoIdNumero)
    .eq("demanda_id", demandaId);

  if (updateError) {
    return NextResponse.json(
      { error: "Nao foi possivel atualizar a categoria do anexo agora." },
      { status: 500 }
    );
  }

  await admin.from("historico_demanda").insert({
    demanda_id: demandaId,
    usuario_id: usuarioSessao.id,
    acao: `${usuarioSessao.nome} moveu o anexo ${
      body.nomeArquivo || anexoAtual.nome_arquivo
    } para ${categoriaDestino === "final" ? "arquivos finais" : "anexos de referencia"}${
      reorganizouStorage ? "" : " (sem mover pasta no storage)"
    }`,
  });

  return NextResponse.json({
    ok: true,
    reorganizouStorage,
  });
}
