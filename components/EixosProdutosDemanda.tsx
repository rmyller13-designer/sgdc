"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  CANAL_PARA_PRODUTOS_PADRAO,
  normalizarTextoComunicacao,
} from "@/lib/comunicacao-base";

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

type StatusProducao = "ANDAMENTO" | "CONCLUIDO" | "CANCELADO";

type ProdutoSelecionado = {
  id: number;
  produto_id: number;
  quantidade: number;
  status_producao: StatusProducao;
  produtos: {
    nome: string;
  } | null;
};

type ProdutoSelecionadoSupabase = {
  id: number;
  produto_id: number;
  quantidade: number;
  status_producao?: StatusProducao | null;
  produtos: { nome: string } | { nome: string }[] | null;
};

type ProdutoSelecionadoSemStatusSupabase = Omit<
  ProdutoSelecionadoSupabase,
  "status_producao"
>;

type BaseComunicacaoSync = {
  data?: {
    eixos?: Eixo[];
    canais?: Canal[];
    produtos?: Produto[];
  };
};

async function sincronizarBaseComunicacao() {
  const response = await fetch("/api/comunicacao-base/sync", {
    method: "POST",
  });

  if (!response.ok) {
    return {
      eixos: [] as Eixo[],
      canais: [] as Canal[],
      produtos: [] as Produto[],
    };
  }

  const resultado = (await response.json()) as BaseComunicacaoSync;

  return {
    eixos: resultado.data?.eixos || [],
    canais: resultado.data?.canais || [],
    produtos: resultado.data?.produtos || [],
  };
}

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

  const carregarDados = useCallback(async () => {
    const { data: eixosData } = await supabase
      .from("eixos_comunicacao")
      .select("*")
      .or("ativo.is.null,ativo.eq.true")
      .order("nome");

    const { data: canaisData } = await supabase
      .from("canais_comunicacao")
      .select("*")
      .or("ativo.is.null,ativo.eq.true")
      .order("nome");

    const { data: produtosData } = await supabase
      .from("produtos")
      .select("id, nome")
      .or("ativo.is.null,ativo.eq.true")
      .order("nome");

    const { data: eixosMarcados } = await supabase
      .from("demanda_eixos")
      .select("eixo_id")
      .eq("demanda_id", demandaId);

    const { data: canaisMarcados } = await supabase
      .from("demanda_canais")
      .select("canal_id")
      .eq("demanda_id", demandaId);

    const { data: produtosMarcados, error: produtosErro } = await supabase
      .from("demanda_produtos_quantidade")
      .select("id, produto_id, quantidade, status_producao, produtos(nome)")
      .eq("demanda_id", demandaId)
      .order("id", { ascending: true });

    let produtosMarcadosLista:
      | ProdutoSelecionadoSupabase[]
      | ProdutoSelecionadoSemStatusSupabase[]
      | null = produtosMarcados;

    if (colunaStatusAusente(produtosErro)) {
      const { data: produtosSemStatus } = await supabase
        .from("demanda_produtos_quantidade")
        .select("id, produto_id, quantidade, produtos(nome)")
        .eq("demanda_id", demandaId)
        .order("id", { ascending: true });

      produtosMarcadosLista = produtosSemStatus;
    }

    const listaEixos = (eixosData || []) as Eixo[];
    const listaCanais = (canaisData || []) as Canal[];
    const listaProdutos = (produtosData || []) as Produto[];
    const baseSincronizada =
      listaEixos.length === 0 || listaCanais.length === 0 || listaProdutos.length === 0
        ? await sincronizarBaseComunicacao()
        : null;

    setEixos(baseSincronizada?.eixos?.length ? baseSincronizada.eixos : listaEixos);
    setCanais(
      baseSincronizada?.canais?.length ? baseSincronizada.canais : listaCanais
    );
    setProdutos(
      baseSincronizada?.produtos?.length
        ? baseSincronizada.produtos
        : listaProdutos
    );

    setEixosSelecionados(eixosMarcados?.map((item) => item.eixo_id) || []);
    setCanaisSelecionados(canaisMarcados?.map((item) => item.canal_id) || []);

    const lista =
      ((produtosMarcadosLista as ProdutoSelecionadoSupabase[] | null) || []).map(
        (item) => ({
          ...item,
          status_producao:
            item.status_producao ||
            lerStatusProdutoLocal(demandaId, item.produto_id),
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
  }, [demandaId]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregarDados();
    });
  }, [carregarDados]);

  async function alternarEixo(eixoId: number) {
    setMensagem("");

    const marcado = eixosSelecionados.includes(eixoId);

    if (marcado) {
      const { count, error } = await supabase
        .from("demanda_eixos")
        .delete({ count: "exact" })
        .eq("demanda_id", demandaId)
        .eq("eixo_id", eixoId);

      if (error || count === 0) {
        setMensagem(
          "Erro ao remover eixo: " +
            (error?.message || "Eixo não encontrado ou sem permissão.")
        );
        return;
      }

      const canaisDoEixo = canais
        .filter((canal) => canal.eixo_id === eixoId)
        .map((canal) => canal.id);

      if (canaisDoEixo.length > 0) {
        const { error: errorCanais } = await supabase
          .from("demanda_canais")
          .delete()
          .eq("demanda_id", demandaId)
          .in("canal_id", canaisDoEixo);

        if (errorCanais) {
          setMensagem("Erro ao remover destinos do eixo: " + errorCanais.message);
          return;
        }
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
      const { count, error } = await supabase
        .from("demanda_canais")
        .delete({ count: "exact" })
        .eq("demanda_id", demandaId)
        .eq("canal_id", canalId);

      if (error || count === 0) {
        setMensagem(
          "Erro ao remover destino: " +
            (error?.message || "Destino não encontrado ou sem permissão.")
        );
        return;
      }

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

    await sincronizarProdutosDoCanal(canalId);
    setCanaisSelecionados((atual) => [...atual, canalId]);
    setMensagem("Destino adicionado e produtos relacionados atualizados.");
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

    const produtoIdNumero = Number(produtoId);

    const { error } = await supabase.from("demanda_produtos_quantidade").upsert(
      {
        demanda_id: demandaId,
        produto_id: produtoIdNumero,
        quantidade,
        status_producao: "ANDAMENTO",
      },
      {
        onConflict: "demanda_id,produto_id",
      }
    );

    if (colunaStatusAusente(error)) {
      const { error: erroSemStatus } = await supabase
        .from("demanda_produtos_quantidade")
        .upsert(
          {
            demanda_id: demandaId,
            produto_id: produtoIdNumero,
            quantidade,
          },
          {
            onConflict: "demanda_id,produto_id",
          }
        );

      if (erroSemStatus) {
        setMensagem("Erro ao adicionar produto: " + erroSemStatus.message);
        return;
      }

      salvarStatusProdutoLocal(demandaId, produtoIdNumero, "ANDAMENTO");
    } else if (error) {
      setMensagem("Erro ao adicionar produto: " + error.message);
      return;
    }

    setProdutoId("");
    setQuantidade(1);
    setMensagem("Produto adicionado.");
    notificarAtualizacaoProdutos(demandaId);
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
      .eq("produto_id", produtoIdAtualizar)
      .select("produto_id")
      .single();

    if (error) {
      setMensagem("Erro ao atualizar quantidade: " + error.message);
      return;
    }

    setMensagem("Quantidade atualizada.");
    notificarAtualizacaoProdutos(demandaId);
    await carregarDados();
  }

  async function atualizarStatusProduto(
    produtoIdAtualizar: number,
    status: StatusProducao
  ) {
    setMensagem("");

    const { error } = await supabase
      .from("demanda_produtos_quantidade")
      .update({
        status_producao: status,
      })
      .eq("demanda_id", demandaId)
      .eq("produto_id", produtoIdAtualizar)
      .select("produto_id")
      .single();

    if (error && !colunaStatusAusente(error)) {
      setMensagem("Erro ao atualizar status: " + error.message);
      return;
    }

    if (colunaStatusAusente(error)) {
      salvarStatusProdutoLocal(demandaId, produtoIdAtualizar, status);
    }

    setMensagem("Status do produto atualizado.");
    notificarAtualizacaoProdutos(demandaId);
    await carregarDados();
  }

  async function removerProduto(produtoIdRemover: number) {
    setMensagem("");

    const { count, error } = await supabase
      .from("demanda_produtos_quantidade")
      .delete({ count: "exact" })
      .eq("demanda_id", demandaId)
      .eq("produto_id", produtoIdRemover);

    if (error || count === 0) {
      setMensagem(
        "Erro ao remover produto: " +
          (error?.message || "Produto não encontrado ou sem permissão.")
      );
      return;
    }

    setMensagem("Produto removido.");
    removerStatusProdutoLocal(demandaId, produtoIdRemover);
    notificarAtualizacaoProdutos(demandaId);
    await carregarDados();
  }

  async function sincronizarProdutosDoCanal(canalId: number) {
    const canal = canais.find((item) => item.id === canalId);
    if (!canal) return;

    const produtosRelacionados =
      CANAL_PARA_PRODUTOS_PADRAO[normalizarTextoComunicacao(canal.nome)] || [];

    if (produtosRelacionados.length === 0) return;

    const produtosPorNome = new Map(
      produtos.map((produto) => [
        normalizarTextoComunicacao(produto.nome),
        produto,
      ])
    );

    for (const nomeProduto of produtosRelacionados) {
      const produto = produtosPorNome.get(normalizarTextoComunicacao(nomeProduto));

      if (!produto) continue;

      const jaExiste = produtosSelecionados.some(
        (item) => Number(item.produto_id) === Number(produto.id)
      );

      if (jaExiste) continue;

      const { error } = await supabase.from("demanda_produtos_quantidade").upsert(
        {
          demanda_id: demandaId,
          produto_id: produto.id,
          quantidade: 1,
          status_producao: "ANDAMENTO",
        },
        {
          onConflict: "demanda_id,produto_id",
        }
      );

      if (colunaStatusAusente(error)) {
        const { error: erroSemStatus } = await supabase
          .from("demanda_produtos_quantidade")
          .upsert(
            {
              demanda_id: demandaId,
              produto_id: produto.id,
              quantidade: 1,
            },
            {
              onConflict: "demanda_id,produto_id",
            }
          );

        if (erroSemStatus) {
          setMensagem(
            "Erro ao sincronizar produto automatico: " + erroSemStatus.message
          );
          return;
        }

        salvarStatusProdutoLocal(demandaId, produto.id, "ANDAMENTO");
        continue;
      }

      if (error) {
        setMensagem("Erro ao sincronizar produto automatico: " + error.message);
        return;
      }
    }

    notificarAtualizacaoProdutos(demandaId);
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

                <div style={statusGrupo} aria-label="Status do produto">
                  {statusOpcoes.map((opcao) => (
                    <label
                      key={opcao.valor}
                      style={{
                        ...statusOpcao,
                        ...(item.status_producao === opcao.valor
                          ? statusOpcaoAtiva[opcao.valor]
                          : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name={`status-produto-${item.id}`}
                        value={opcao.valor}
                        checked={item.status_producao === opcao.valor}
                        onChange={() =>
                          atualizarStatusProduto(item.produto_id, opcao.valor)
                        }
                        style={radioStatus}
                      />
                      {opcao.label}
                    </label>
                  ))}
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

const statusOpcoes: { valor: StatusProducao; label: string }[] = [
  { valor: "ANDAMENTO", label: "Andamento" },
  { valor: "CONCLUIDO", label: "Concluído" },
  { valor: "CANCELADO", label: "Cancelado" },
];

function lerStatusProdutoLocal(
  demandaId: number,
  produtoId: number
): StatusProducao {
  const storage = obterStorageSeguro();
  if (!storage) return "ANDAMENTO";

  const status = storage.getItem(
    chaveStatusProduto(demandaId, produtoId)
  ) as StatusProducao | null;

  return statusValido(status) ? status : "ANDAMENTO";
}

function salvarStatusProdutoLocal(
  demandaId: number,
  produtoId: number,
  status: StatusProducao
) {
  const storage = obterStorageSeguro();
  if (!storage) return;

  storage.setItem(chaveStatusProduto(demandaId, produtoId), status);
}

function removerStatusProdutoLocal(demandaId: number, produtoId: number) {
  const storage = obterStorageSeguro();
  if (!storage) return;

  storage.removeItem(chaveStatusProduto(demandaId, produtoId));
}

function chaveStatusProduto(demandaId: number, produtoId: number) {
  return `sgdc_produto_status:${demandaId}:${produtoId}`;
}

function statusValido(status: string | null): status is StatusProducao {
  return (
    status === "ANDAMENTO" ||
    status === "CONCLUIDO" ||
    status === "CANCELADO"
  );
}

function obterStorageSeguro() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function colunaStatusAusente(error?: { code?: string } | null) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

function notificarAtualizacaoProdutos(demandaId: number) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("sgdc:produtos-atualizados", {
      detail: { demandaId },
    })
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

const statusGrupo = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "8px",
  marginTop: "12px",
};

const statusOpcao = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  border: "1px solid #334155",
  borderRadius: "999px",
  padding: "7px 10px",
  color: "#cbd5e1",
  background: "#0f172a",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 700,
};

const statusOpcaoAtiva: Record<StatusProducao, object> = {
  ANDAMENTO: {
    color: "#dbeafe",
    borderColor: "#2563eb",
    background: "rgba(37, 99, 235, 0.22)",
  },
  CONCLUIDO: {
    color: "#dcfce7",
    borderColor: "#16a34a",
    background: "rgba(22, 163, 74, 0.22)",
  },
  CANCELADO: {
    color: "#fee2e2",
    borderColor: "#dc2626",
    background: "rgba(220, 38, 38, 0.22)",
  },
};

const radioStatus = {
  accentColor: "#dc2626",
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
