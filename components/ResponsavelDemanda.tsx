"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ResponsavelDemanda({
  demandaId,
  responsavelAtual,
}: {
  demandaId: number;
  responsavelAtual?: string | null;
}) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [responsavelId, setResponsavelId] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    const { data } = await supabase
      .from("usuarios_comunicacao")
      .select("id, nome, funcao")
      .order("nome");

    setUsuarios(data || []);
  }

 async function atualizarResponsavel() {
  setMensagem("");

  if (!responsavelId) {
    setMensagem("Selecione um responsável.");
    return;
  }

  const usuarioSelecionado = usuarios.find(
    (usuario) => String(usuario.id) === responsavelId
  );

  const { error } = await supabase
    .from("demandas")
    .update({ responsavel_id: Number(responsavelId) })
    .eq("id", demandaId);

  if (error) {
    setMensagem("Erro ao atualizar responsável.");
    return;
  }

  await supabase.from("historico_demanda").insert({
    demanda_id: demandaId,
    usuario_id: 18,
    acao: `Roberto atribuiu a demanda para ${usuarioSelecionado?.nome}`,
  });

  setMensagem("Responsável atualizado com sucesso!");
}

  return (
    <div style={{ marginTop: "20px" }}>
      <p>
        <strong>Responsável atual:</strong>{" "}
        {responsavelAtual || "Não definido"}
      </p>

      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        <select
          value={responsavelId}
          onChange={(e) => setResponsavelId(e.target.value)}
          style={campo}
        >
          <option value="">Selecione o responsável</option>

          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome} - {usuario.funcao}
            </option>
          ))}
        </select>

        <button onClick={atualizarResponsavel} style={botao}>
          Atualizar Responsável
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