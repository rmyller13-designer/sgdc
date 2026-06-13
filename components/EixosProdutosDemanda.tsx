"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Eixo = {
  id: number;
  nome: string;
  descricao: string;
};

type Canal = {
  id: number;
  eixo_id: number;
  nome: string;
};

type Produto = {
  id: number;
  nome: string;
};

type ProdutoSelecionado = {
  id: number;
  produto_id: number;
  quantidade: number;
  produtos: {
    nome: string;
  } | null;
};

type ProdutoSelecionadoSupabase = {
  id: number;
  produto_id: number;
  quantidade: number;
  produtos: { nome: string } | { nome: string }[] | null;
};

export default function EixosProdutosDemanda({
  demandaId,
}: {
  demandaId: number;
}) {
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [canais, setCanais] = useState<Canal[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [eixosSelecionados, setEixosSelecionados] = useState<number[]>([]);
  const [canaisSelecionados, setCanaisSelecionados] = useState<number[]>([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState<
    ProdutoSelecionado[]
  >([]);

  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [edicoes, setEdicoes] = useState<Record<number, number>>({});
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarDados();
  }, [demandaId]);

  async function carregarDados() {
    const { data: eixosData } = await supabase
      .from("eixos_comunicacao")
      .select("*")
      .eq("ativo", true)
      .order("nome");

    const { data: canaisData } = await supabase
      .from("canais_comunicacao")
      .select("*")
      .eq("ativo", true)
      .order("nome");

    const { data: produtosData } = await supabase
      .from("produtos")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");

    const { data: eixosMarcados } = await supabase
      .from("demanda_eixos")
      .select("eixo_id")
      .eq("demanda_id", demandaId);

    const { data: canaisMarcados } = await supabase
      .from("demanda_canais")
      .select("canal_id")
      .eq("demanda_id", demandaId);

    const { data: produtosMarcados } = await supabase
      .from("demanda_produtos_quantidade")
      .select("id, produto_id, quantidade, produtos(nome)")
      .eq("demanda_id", demandaId)
      .order("id", { ascending: true });

    setEixos(eixosData || []);
    setCanais(canaisData || []);
    setProdutos(produtosData || []);

    setEixosSelecionados(eixosMarcados?.map((item) => item.eixo_id) || []);
    setCanaisSelecionados(canaisMarcados?.map((item) => item.canal_id) || []);

    const lista =
      ((produtosMarcados as ProdutoSelecionadoSupabase[] | null) || []).map(
        (item) => ({
          ...item,
          produtos: Array.isArray(item.produtos)
            ? item.produtos[0] || null
            : item.produtos,
        })
      );
    setProdutosSelecionados(lista);

    const mapa: Record<number, number> = {};
    lista.forEach((item) => {
      mapa[item.produto_id] = item.quantidade;
    });
    setEdicoes(mapa);
  }

  async function alternarEixo(eixoId: number) {
    setMensagem("");

    const marcado = eixosSelecionados.includes(eixoId);

    if (marcado) {
      await supabase
        .from("demanda_eixos")
        .delete()
        .eq("demanda_id", demandaId)
        .eq("eixo_id", eixoId);

      const canaisDoEixo = canais
        .filter((canal) => canal.eixo_id === eixoId)
        .map((canal) => canal.id);

      if (canaisDoEixo.length > 0) {
        await supabase
          .from("demanda_canais")
          .delete()
          .eq("demanda_id", demandaId)
          .in("canal_id", canaisDoEixo);
      }

      setEixosSelecionados((atual) => atual.filter((id) => id !== eixoId));
      setCanaisSelecionados((atual) =>
        atual.filter((id) => !canaisDoEixo.includes(id))
      );

      setMensagem("Eixo removido.");
      return;
    }

    const { error } = await supabase.from("demanda_eixos").insert({
      demanda_id: demandaId,
      eixo_id: eixoId,
    });

    if (error) {
      setMensagem("Erro ao adicionar eixo: " + error.message);
      return;
    }

    setEixosSelecionados((atual) => [...atual, eixoId]);
    setMensagem("Eixo adicionado.");
  }

  async function alternarCanal(canalId: number) {
    setMensagem("");

    const marcado = canaisSelecionados.includes(canalId);

    if (marcado) {
      await supabase
        .from("demanda_canais")
        .delete()
        .eq("demanda_id", demandaId)
        .eq("canal_id", canalId);

      setCanaisSelecionados((atual) => atual.filter((id) => id !== canalId));
      setMensagem("Destino removido.");
      return;
    }

    const { error } = await supabase.from("demanda_canais").insert({
      demanda_id: demandaId,
      canal_id: canalId,
    });

    if (error) {
      setMensagem("Erro ao adicionar destino: " + error.message);
      return;
    }

    setCanaisSelecionados((atual) => [...atual, canalId]);
    setMensagem("Destino adicionado.");
  }

  async function adicionarProduto() {
    setMensagem("");

    if (!produtoId) {
      setMensagem("Selecione um produto.");
      return;
    }

    if (quantidade <= 0) {
      setMensagem("A quantidade precisa ser maior que zero.");
      return;
    }

    const { error } = await supabase.from("demanda_produtos_quantidade").upsert(
      {
        demanda_id: demandaId,
        produto_id: Number(produtoId),
        quantidade,
      },
      {
        onConflict: "demanda_id,produto_id",
      }
    );

    if (error) {
      setMensagem("Erro ao adicionar produto: " + error.message);
      return;
    }

    setProdutoId("");
    setQuantidade(1);
    setMensagem("Produto adicionado.");
    await carregarDados();
  }

  async function atualizarQuantidade(produtoIdAtualizar: number) {
    setMensagem("");

    const quantidadeNova = edicoes[produtoIdAtualizar];

    if (!quantidadeNova || quantidadeNova < 1) {
      setMensagem("Quantidade precisa ser maior que zero.");
      return;
    }

    const { error } = await supabase
      .from("demanda_produtos_quantidade")
      .update({
        quantidade: quantidadeNova,
      })
      .eq("demanda_id", demandaId)
      .eq("produto_id", produtoIdAtualizar);

    if (error) {
      setMensagem("Erro ao atualizar quantidade: " + error.message);
      return;
    }

    setMensagem("Quantidade atualizada.");
    await carregarDados();
  }

  async function removerProduto(produtoIdRemover: number) {
    setMensagem("");

    const { error } = await supabase
      .from("demanda_produtos_quantidade")
      .delete()
      .eq("demanda_id", demandaId)
      .eq("produto_id", produtoIdRemover);

    if (error) {
      setMensagem("Erro ao remover produto: " + error.message);
      return;
    }

    setMensagem("Produto removido.");
    await carregarDados();
  }

  const canaisVisiveis = canais.filter((canal) =>
    eixosSelecionados.includes(canal.eixo_id)
  );

  const produtosDisponiveis = produtos.filter(
    (produto) =>
      !produtosSelecionados.some(
        (selecionado) => selecionado.produto_id === produto.id
      )
  );

  return (
    <div style={{ marginTop: "30px" }}>
      <h2>Eixos, destinos e produtos</h2>

      <h3 style={{ marginTop: "20px" }}>1. Eixos da demanda</h3>

      <div style={grid}>
        {eixos.map((eixo) => (
          <label key={eixo.id} style={card}>
            <input
              type="checkbox"
              checked={eixosSelecionados.includes(eixo.id)}
              onChange={() => alternarEixo(eixo.id)}
            />{" "}
            <strong>{eixo.nome}</strong>

            <p style={descricao}>{eixo.descricao}</p>
          </label>
        ))}
      </div>

      <h3 style={{ marginTop: "30px" }}>2. Destinos / canais</h3>

      {canaisVisiveis.length === 0 ? (
        <p style={descricao}>Selecione um eixo para exibir os destinos.</p>
      ) : (
        <div style={grid}>
          {canaisVisiveis.map((canal) => (
            <label key={canal.id} style={cardMenor}>
              <input
                type="checkbox"
                checked={canaisSelecionados.includes(canal.id)}
                onChange={() => alternarCanal(canal.id)}
              />{" "}
              {canal.nome}
            </label>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: "30px" }}>3. Produtos produzidos</h3>

      <p style={descricao}>
        Aqui você informa apenas o que realmente foi produzido nesta demanda.
      </p>

      <div style={linha}>
        <select
          value={produtoId}
          onChange={(e) => setProdutoId(e.target.value)}
          style={campo}
        >
          <option value="">Selecione o produto</option>

          {produtosDisponiveis.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          value={quantidade}
          onChange={(e) => setQuantidade(Number(e.target.value))}
          style={campoQuantidade}
        />

        <button type="button" onClick={adicionarProduto} style={botao}>
          Adicionar
        </button>
      </div>

      <div style={{ marginTop: "20px" }}>
        {produtosSelecionados.length === 0 ? (
          <p style={descricao}>Nenhum produto produzido informado.</p>
        ) : (
          produtosSelecionados.map((item) => (
            <div key={item.id} style={produtoItem}>
              <div style={{ flex: 1 }}>
                <strong>{item.produtos?.nome || "Produto"}</strong>

                <div style={linhaEdicao}>
                  <span>Quantidade:</span>

                  <input
                    type="number"
                    min="1"
                    value={edicoes[item.produto_id] || 1}
                    onChange={(e) =>
                      setEdicoes({
                        ...edicoes,
                        [item.produto_id]: Number(e.target.value),
                      })
                    }
                    style={campoEdicao}
                  />
                </div>
              </div>

              <div style={linhaBotoes}>
                <button
                  type="button"
                  onClick={() => atualizarQuantidade(item.produto_id)}
                  style={botaoSalvar}
                >
                  Salvar
                </button>

                <button
                  type="button"
                  onClick={() => removerProduto(item.produto_id)}
                  style={botaoRemover}
                >
                  Remover
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {mensagem && <p style={{ marginTop: "15px" }}>{mensagem}</p>}
    </div>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
  marginTop: "12px",
};

const card = {
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: "12px",
  padding: "15px",
};

const cardMenor = {
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: "10px",
  padding: "12px",
};

const descricao = {
  color: "#94a3b8",
  marginTop: "6px",
  marginBottom: "0",
};

const linha = {
  display: "flex",
  gap: "10px",
  marginTop: "15px",
  alignItems: "center",
};

const campo = {
  flex: 1,
  padding: "10px",
  background: "#0f172a",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "8px",
};

const campoQuantidade = {
  width: "120px",
  padding: "10px",
  background: "#0f172a",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "8px",
};

const produtoItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #334155",
  borderRadius: "10px",
  padding: "12px",
  marginBottom: "10px",
  background: "#111827",
};

const linhaEdicao = {
  display: "flex",
  gap: "10px",
  marginTop: "10px",
  alignItems: "center",
};

const campoEdicao = {
  width: "90px",
  padding: "6px",
  background: "#0f172a",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "6px",
};

const linhaBotoes = {
  display: "flex",
  gap: "8px",
};

const botao = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
};

const botaoSalvar = {
  background: "#166534",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
};

const botaoRemover = {
  background: "#7f1d1d",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
};
