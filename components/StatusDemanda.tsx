"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function StatusDemanda({
  demandaId,
  statusAtual,
}: {
  demandaId: number;
  statusAtual: string;
}) {
  const [status, setStatus] = useState(statusAtual);
  const [mensagem, setMensagem] = useState("");

  async function atualizarStatus() {
  setMensagem("");

  const { data: statusSelecionado } = await supabase
    .from("status_demanda")
    .select("id")
    .eq("nome", status)
    .single();

  const { error } = await supabase
    .from("demandas")
    .update({ status_id: statusSelecionado?.id })
    .eq("id", demandaId);

  if (error) {
    setMensagem("Erro ao atualizar status.");
    return;
  }

  await supabase.from("historico_demanda").insert({
    demanda_id: demandaId,
    usuario_id: 18,
    acao: `Roberto alterou o status para ${status}`,
  });

  setMensagem("Status atualizado com sucesso!");
}

  return (
    <div style={{ marginTop: "20px" }}>
      <label>Status da demanda</label>

      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={campo}
        >
          <option value="RECEBIDO">RECEBIDO</option>
          <option value="EM_PRODUCAO">EM_PRODUCAO</option>
          <option value="EM_APROVACAO">EM_APROVACAO</option>
          <option value="CONCLUIDO">CONCLUIDO</option>
          <option value="CANCELADO">CANCELADO</option>
        </select>

        <button onClick={atualizarStatus} style={botao}>
          Atualizar
        </button>
      </div>

      {mensagem && <p>{mensagem}</p>}
    </div>
  );
}

const campo = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#111827",
  color: "white",
};

const botao = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "8px",
  cursor: "pointer",
};