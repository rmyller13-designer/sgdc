"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { podeEditarFluxo } from "@/lib/auth";
import { supabase } from "../lib/supabase";

type Item = {
  id: number;
  titulo: string;
  concluido: boolean;
};

function ChecklistDemanda({ demandaId }: { demandaId: number }) {
  const { usuario } = useAuth();
  const podeEditar = podeEditarFluxo(usuario);
  const [itens, setItens] = useState<Item[]>([]);
  const [novoItem, setNovoItem] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarItens();
  }, [demandaId]);

  async function carregarItens() {
    const { data, error } = await supabase
      .from("demanda_checklist")
      .select("*")
      .eq("demanda_id", demandaId)
      .order("id", { ascending: true });

    if (error) {
      setMensagem("Erro ao carregar checklist: " + error.message);
      return;
    }

    setItens(data || []);
  }

  async function adicionarItem() {
    setMensagem("");

    if (!novoItem.trim()) {
      setMensagem("Digite uma tarefa.");
      return;
    }

    if (!podeEditar || !usuario) {
      setMensagem("Seu usuário não tem permissão para alterar o checklist.");
      return;
    }

    const tituloItem = novoItem.trim();

    const { error } = await supabase.from("demanda_checklist").insert({
      demanda_id: demandaId,
      titulo: tituloItem,
    });

    if (error) {
      setMensagem("Erro ao adicionar item: " + error.message);
      return;
    }

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaId,
      usuario_id: usuario.id,
      acao: `${usuario.nome} adicionou checklist: ${tituloItem}`,
    });

    setNovoItem("");
    carregarItens();
  }

  async function alternarItem(item: Item) {
    setMensagem("");

    if (!podeEditar || !usuario) {
      setMensagem("Seu usuário não tem permissão para alterar o checklist.");
      return;
    }

    const novoStatus = !item.concluido;

    const { error } = await supabase
      .from("demanda_checklist")
      .update({ concluido: novoStatus })
      .eq("id", item.id);

    if (error) {
      setMensagem("Erro ao atualizar item: " + error.message);
      return;
    }

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaId,
      usuario_id: usuario.id,
      acao: `${usuario.nome} ${novoStatus ? "concluiu" : "reabriu"} checklist: ${
        item.titulo
      }`,
    });

    carregarItens();
  }

  async function removerItem(id: number) {
    setMensagem("");

    if (!podeEditar || !usuario) {
      setMensagem("Seu usuário não tem permissão para alterar o checklist.");
      return;
    }

    const itemRemovido = itens.find((item) => item.id === id);

    const { error } = await supabase
      .from("demanda_checklist")
      .delete()
      .eq("id", id);

    if (error) {
      setMensagem("Erro ao remover item: " + error.message);
      return;
    }

    if (itemRemovido) {
      await supabase.from("historico_demanda").insert({
        demanda_id: demandaId,
        usuario_id: usuario.id,
        acao: `${usuario.nome} removeu checklist: ${itemRemovido.titulo}`,
      });
    }

    carregarItens();
  }

  const total = itens.length;
  const concluidos = itens.filter((item) => item.concluido).length;
  const progresso = total === 0 ? 0 : Math.round((concluidos / total) * 100);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Checklist de Produção</h2>

      <div style={barraBox}>
        <div style={{ ...barraInterna, width: `${progresso}%` }} />
      </div>

      <p style={textoFraco}>
        Progresso: <strong>{progresso}%</strong> — {concluidos}/{total} itens
        concluídos
      </p>

      <div style={linha}>
        <input
          type="text"
          placeholder="Ex: Texto produzido, Arte aprovada, Publicado..."
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              adicionarItem();
            }
          }}
          disabled={!podeEditar}
          style={campo}
        />

        <button type="button" onClick={adicionarItem} style={botao} disabled={!podeEditar}>
          Adicionar
        </button>
      </div>

      <div style={{ marginTop: "16px" }}>
        {itens.length === 0 ? (
          <p style={textoFraco}>Nenhum item no checklist.</p>
        ) : (
          itens.map((item) => (
            <div key={item.id} style={itemBox}>
              <label style={checkLabel}>
                <input
                  type="checkbox"
                  checked={item.concluido}
                  onChange={() => alternarItem(item)}
                  disabled={!podeEditar}
                />

                <span
                  style={{
                    textDecoration: item.concluido ? "line-through" : "none",
                    color: item.concluido ? "#94a3b8" : "white",
                  }}
                >
                  {item.titulo}
                </span>
              </label>

              <button
                type="button"
                onClick={() => removerItem(item.id)}
                style={botaoRemover}
                disabled={!podeEditar}
              >
                Remover
              </button>
            </div>
          ))
        )}
      </div>

      {mensagem && <p style={textoFraco}>{mensagem}</p>}
    </div>
  );
}

export { ChecklistDemanda };
export default ChecklistDemanda;

const barraBox = {
  width: "100%",
  height: "10px",
  background: "rgba(15, 23, 42, 0.9)",
  borderRadius: "999px",
  overflow: "hidden",
  border: "1px solid rgba(148, 163, 184, 0.25)",
};

const barraInterna = {
  height: "100%",
  background: "linear-gradient(90deg, #22c55e, #16a34a)",
  borderRadius: "999px",
};

const textoFraco = {
  color: "#fecaca",
  fontSize: "14px",
};

const linha = {
  display: "flex",
  gap: "10px",
  marginTop: "14px",
};

const campo = {
  flex: 1,
  padding: "11px 12px",
  background: "rgba(15, 23, 42, 0.85)",
  color: "white",
  border: "1px solid rgba(252, 165, 165, 0.22)",
  borderRadius: "10px",
};

const botao = {
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "white",
  border: "none",
  padding: "11px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const itemBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  background: "rgba(2, 6, 23, 0.35)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: "10px",
  padding: "10px 12px",
  marginBottom: "8px",
};

const checkLabel = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const botaoRemover = {
  background: "rgba(127, 29, 29, 0.65)",
  color: "#fee2e2",
  border: "1px solid rgba(252, 165, 165, 0.25)",
  padding: "7px 10px",
  borderRadius: "8px",
  cursor: "pointer",
};
