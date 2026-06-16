"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { podeEditarFluxo } from "@/lib/auth";
import { supabase } from "../lib/supabase";

export default function StatusDemanda({
  demandaId,
  statusAtual,
}: {
  demandaId: number;
  statusAtual: string;
}) {
  const router = useRouter();
  const { usuario } = useAuth();
  const podeEditar = podeEditarFluxo(usuario);
  const [status, setStatus] = useState(statusAtual);
  const [mensagem, setMensagem] = useState("");

  async function atualizarStatus() {
    setMensagem("");

    if (!podeEditar || !usuario) {
      setMensagem("Seu usuÃ¡rio nÃ£o tem permissÃ£o para alterar status.");
      return;
    }

    const { data: statusSelecionado, error: statusError } = await supabase
      .from("status_demanda")
      .select("id")
      .eq("nome", status)
      .single();

    if (statusError || !statusSelecionado) {
      setMensagem("Erro ao localizar o status selecionado.");
      return;
    }

    const { error } = await supabase
      .from("demandas")
      .update({ status_id: statusSelecionado.id })
      .eq("id", demandaId)
      .select("id")
      .single();

    if (error) {
      setMensagem("Erro ao atualizar status: " + error.message);
      return;
    }

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaId,
      usuario_id: usuario.id,
      acao: `${usuario.nome} alterou o status para ${status}`,
    });

    setMensagem("Status atualizado com sucesso!");
    router.refresh();
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <label>Status da demanda</label>

      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={campo}
          disabled={!podeEditar}
        >
          <option value="RECEBIDO">RECEBIDO</option>
          <option value="EM_PRODUCAO">EM_PRODUCAO</option>
          <option value="EM_APROVACAO">EM_APROVACAO</option>
          <option value="CONCLUIDO">CONCLUIDO</option>
          <option value="CANCELADO">CANCELADO</option>
        </select>

        <button type="button" onClick={atualizarStatus} style={botao} disabled={!podeEditar}>
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
