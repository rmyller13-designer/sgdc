"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function EixosProdutosDemanda({
  demandaId,
}: {
  demandaId: number;
}) {
  const [eixos, setEixos] = useState<any[]>([]);
  const [canais, setCanais] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);

  const [eixosSelecionados, setEixosSelecionados] = useState<number[]>([]);
  const [canaisSelecionados, setCanaisSelecionados] = useState<number[]>([]);
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});

  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

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
      .select("*")
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
      .select("produto_id, quantidade")
      .eq("demanda_id", demandaId);

    setEixos(eixosData || []);
    setCanais(canaisData || []);
    setProdutos(produtosData || []);

    setEixosSelecionados(
      eixosMarcados?.map((item) => item.eixo_id) || []
    );

    setCanaisSelecionados(
      canaisMarcados?.map((item) => item.canal_id) || []
    );

    const mapaQuantidades: Record<number, number> = {};

    produtosMarcados?.forEach((item) => {
      mapaQuantidades[item.produto_id] = item.quantidade;
    });

    setQuantidades(mapaQuantidades);
  }

  async function alternarEixo(eixoId: number) {
    setMensagem("");

    const jaSelecionado = eixosSelecionados.includes(eixoId);

    if (jaSelecionado) {
      await supabase
        .from("demanda_eixos")
        .delete()
        .eq("demanda_id", demandaId)
        .eq("eixo_id", eixoId);

      const canaisDoEixo = canais
        .filter((canal) => canal.eixo_id === eixoId)
        .map((canal) => canal.id);

      await supabase
        .from("demanda_canais")
        .delete()
        .eq("demanda_id", demandaId)
        .in("canal_id", canaisDoEixo);

      setEixosSelecionados((atual) =>
        atual.filter((id) => id !== eixoId)
      );

      setCanaisSelecionados((atual) =>
        atual.filter((id) => !canaisDoEixo.includes(id))
      );

      setMensagem("Eixo removido.");
      return;
    }

    await supabase.from("demanda_eixos").insert({
      demanda_id: demandaId,
      eixo_id: eixoId,
    });

    setEixosSelecionados((atual) => [...atual, eixoId]);
    setMensagem("Eixo adicionado.");
  }

  async function alternarCanal(canalId: number) {
    setMensagem("");

    const jaSelecionado = canaisSelecionados.includes(canalId);

    if (jaSelecionado) {
      await supabase
        .from("demanda_canais")
        .delete()
        .eq("demanda_id", demandaId)
        .eq("canal_id", canalId);

      setCanaisSelecionados((atual) =>
        atual.filter((id) => id !== canalId)
      );

      setMensagem("Destino removido.");
      return;
    }

    await supabase.from("demanda_canais").insert({
      demanda_id: demandaId,
      canal_id: canalId,
    });

    setCanaisSelecionados((atual) => [...atual, canalId]);
    setMensagem("Destino adicionado.");
  }

  async function salvarProduto(produtoId: number, quantidade: number) {
    setMensagem("");

    setQuantidades((atual) => ({
      ...atual,
      [produtoId]: quantidade,
    }));

    if (quantidade <= 0) {
      await supabase
        .from("demanda_produtos_quantidade")
        .delete()
        .eq("demanda_id", demandaId)
        .eq("produto_id", produtoId);

      setMensagem("Produto removido.");
      return;
    }

    await supabase.from("demanda_produtos_quantidade").upsert({
      demanda_id: demandaId,
      produto_id: produtoId,
      quantidade,
    });

    setMensagem("Produto atualizado.");
  }

  const canaisVisiveis = canais.filter((canal) =>
    eixosSelecionados.includes(canal.eixo_id)
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

            <p style={{ color: "#94a3b8", marginTop: "8px" }}>
              {eixo.descricao}
            </p>
          </label>
        ))}
      </div>

      <h3 style={{ marginTop: "30px" }}>2. Destinos / canais</h3>

      {canaisVisiveis.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>
          Selecione pelo menos um eixo para exibir os destinos.
        </p>
      ) : (
        <div style={grid}>
          {canaisVisiveis.map((canal) => (
            <label key={canal.id} style={card}>
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

      <h3 style={{ marginTop: "30px" }}>3. Produtos gerados</h3>

      <p style={{ color: "#94a3b8" }}>
        Informe a quantidade produzida em cada produto. Deixe 0 quando não usar.
      </p>

      <div style={gridProdutos}>
        {produtos.map((produto) => (
          <div key={produto.id} style={card}>
            <strong>{produto.nome}</strong>

            <input
              type="number"
              min="0"
              value={quantidades[produto.id] || 0}
              style={campo}
              onChange={(e) =>
                salvarProduto(produto.id, Number(e.target.value))
              }
            />
          </div>
        ))}
      </div>

      {mensagem && <p style={{ marginTop: "15px" }}>{mensagem}</p>}
    </div>
  );
}

const card = {
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: "12px",
  padding: "15px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
  marginTop: "12px",
};

const gridProdutos = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
  marginTop: "12px",
};

const campo = {
  width: "100%",
  marginTop: "10px",
  padding: "8px",
  background: "#0f172a",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "8px",
};