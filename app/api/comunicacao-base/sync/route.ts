import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";
import {
  CANAIS_COMUNICACAO_PADRAO,
  EIXOS_COMUNICACAO_PADRAO,
  PRODUTOS_COMUNICACAO_PADRAO,
  normalizarTextoComunicacao,
} from "@/lib/comunicacao-base";

type EixoRow = {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean | null;
};

type CanalRow = {
  id: number;
  eixo_id: number;
  nome: string;
  ativo: boolean | null;
};

type ProdutoRow = {
  id: number;
  nome: string;
  ativo: boolean | null;
};

export async function POST() {
  try {
    const admin = criarSupabaseAdmin();

    const { data: eixosAtuais, error: eixosErro } = await admin
      .from("eixos_comunicacao")
      .select("id, nome, descricao, ativo")
      .order("nome");

    if (eixosErro) {
      return NextResponse.json(
        { error: `Erro ao consultar eixos: ${eixosErro.message}` },
        { status: 500 }
      );
    }

    const mapaEixos = new Map<string, EixoRow>();
    ((eixosAtuais as EixoRow[] | null) || []).forEach((eixo) => {
      mapaEixos.set(normalizarTextoComunicacao(eixo.nome), eixo);
    });

    for (const eixoPadrao of EIXOS_COMUNICACAO_PADRAO) {
      const chave = normalizarTextoComunicacao(eixoPadrao.nome);
      const existente = mapaEixos.get(chave);

      if (!existente) {
        const { error } = await admin.from("eixos_comunicacao").insert({
          nome: eixoPadrao.nome,
          descricao: eixoPadrao.descricao,
          ativo: true,
        });

        if (error) {
          return NextResponse.json(
            { error: `Erro ao inserir eixo ${eixoPadrao.nome}: ${error.message}` },
            { status: 500 }
          );
        }
      } else if (
        existente.ativo !== true ||
        existente.descricao !== eixoPadrao.descricao ||
        existente.nome !== eixoPadrao.nome
      ) {
        const { error } = await admin
          .from("eixos_comunicacao")
          .update({
            nome: eixoPadrao.nome,
            descricao: eixoPadrao.descricao,
            ativo: true,
          })
          .eq("id", existente.id);

        if (error) {
          return NextResponse.json(
            { error: `Erro ao atualizar eixo ${eixoPadrao.nome}: ${error.message}` },
            { status: 500 }
          );
        }
      }
    }

    const { data: eixosSincronizados, error: eixosFinalErro } = await admin
      .from("eixos_comunicacao")
      .select("id, nome, descricao, ativo")
      .or("ativo.is.null,ativo.eq.true")
      .order("nome");

    if (eixosFinalErro) {
      return NextResponse.json(
        { error: `Erro ao carregar eixos: ${eixosFinalErro.message}` },
        { status: 500 }
      );
    }

    const eixosLista = (eixosSincronizados as EixoRow[] | null) || [];
    const eixoIdPorNome = new Map<string, number>();
    eixosLista.forEach((eixo) => {
      eixoIdPorNome.set(normalizarTextoComunicacao(eixo.nome), eixo.id);
    });

    const { data: canaisAtuais, error: canaisErro } = await admin
      .from("canais_comunicacao")
      .select("id, eixo_id, nome, ativo")
      .order("nome");

    if (canaisErro) {
      return NextResponse.json(
        { error: `Erro ao consultar canais: ${canaisErro.message}` },
        { status: 500 }
      );
    }

    const mapaCanais = new Map<string, CanalRow>();
    ((canaisAtuais as CanalRow[] | null) || []).forEach((canal) => {
      mapaCanais.set(normalizarTextoComunicacao(canal.nome), canal);
    });

    for (const canalPadrao of CANAIS_COMUNICACAO_PADRAO) {
      const chave = normalizarTextoComunicacao(canalPadrao.nome);
      const eixoId = eixoIdPorNome.get(
        normalizarTextoComunicacao(canalPadrao.eixo)
      );

      if (!eixoId) continue;

      const existente = mapaCanais.get(chave);

      if (!existente) {
        const { error } = await admin.from("canais_comunicacao").insert({
          nome: canalPadrao.nome,
          eixo_id: eixoId,
          ativo: true,
        });

        if (error) {
          return NextResponse.json(
            { error: `Erro ao inserir canal ${canalPadrao.nome}: ${error.message}` },
            { status: 500 }
          );
        }
      } else if (
        existente.ativo !== true ||
        Number(existente.eixo_id) !== eixoId ||
        existente.nome !== canalPadrao.nome
      ) {
        const { error } = await admin
          .from("canais_comunicacao")
          .update({
            nome: canalPadrao.nome,
            eixo_id: eixoId,
            ativo: true,
          })
          .eq("id", existente.id);

        if (error) {
          return NextResponse.json(
            { error: `Erro ao atualizar canal ${canalPadrao.nome}: ${error.message}` },
            { status: 500 }
          );
        }
      }
    }

    const { data: canaisSincronizados, error: canaisFinalErro } = await admin
      .from("canais_comunicacao")
      .select("id, eixo_id, nome, ativo")
      .or("ativo.is.null,ativo.eq.true")
      .order("nome");

    if (canaisFinalErro) {
      return NextResponse.json(
        { error: `Erro ao carregar canais: ${canaisFinalErro.message}` },
        { status: 500 }
      );
    }

    const { data: produtosAtuais, error: produtosErro } = await admin
      .from("produtos")
      .select("id, nome, ativo")
      .order("nome");

    if (produtosErro) {
      return NextResponse.json(
        { error: `Erro ao consultar produtos: ${produtosErro.message}` },
        { status: 500 }
      );
    }

    const mapaProdutos = new Map<string, ProdutoRow>();
    ((produtosAtuais as ProdutoRow[] | null) || []).forEach((produto) => {
      mapaProdutos.set(normalizarTextoComunicacao(produto.nome), produto);
    });

    for (const nomeProduto of PRODUTOS_COMUNICACAO_PADRAO) {
      const chave = normalizarTextoComunicacao(nomeProduto);
      const existente = mapaProdutos.get(chave);

      if (!existente) {
        const { error } = await admin.from("produtos").insert({
          nome: nomeProduto,
          ativo: true,
        });

        if (error) {
          return NextResponse.json(
            { error: `Erro ao inserir produto ${nomeProduto}: ${error.message}` },
            { status: 500 }
          );
        }
      } else if (existente.ativo !== true || existente.nome !== nomeProduto) {
        const { error } = await admin
          .from("produtos")
          .update({ nome: nomeProduto, ativo: true })
          .eq("id", existente.id);

        if (error) {
          return NextResponse.json(
            { error: `Erro ao atualizar produto ${nomeProduto}: ${error.message}` },
            { status: 500 }
          );
        }
      }
    }

    const { data: produtosSincronizados, error: produtosFinalErro } = await admin
      .from("produtos")
      .select("id, nome, ativo")
      .or("ativo.is.null,ativo.eq.true")
      .order("nome");

    if (produtosFinalErro) {
      return NextResponse.json(
        { error: `Erro ao carregar produtos: ${produtosFinalErro.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        eixos: eixosLista,
        canais: (canaisSincronizados as CanalRow[] | null) || [],
        produtos: (produtosSincronizados as ProdutoRow[] | null) || [],
      },
    });
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Falha ao sincronizar base de comunicacao.";

    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
