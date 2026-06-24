"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { podeAtribuirResponsavel } from "@/lib/auth";
import { supabase } from "../lib/supabase";
import { corrigirTextoExibicao } from "@/lib/display-text";

type UsuarioResponsavel = {
  id: number;
  nome: string;
  funcao: string | null;
};

export default function ResponsavelDemanda({
  demandaId,
  responsavelAtual,
}: {
  demandaId: number;
  responsavelAtual?: string | null;
}) {
  const router = useRouter();
  const { usuario } = useAuth();
  const podeAtribuir = podeAtribuirResponsavel(usuario);
  const [usuarios, setUsuarios] = useState<UsuarioResponsavel[]>([]);
  const [responsavelId, setResponsavelId] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregarUsuarios = useCallback(async () => {
    const { data } = await supabase
      .from("usuarios_comunicacao")
      .select("id, nome, funcao")
      .order("nome");

    setUsuarios((data as UsuarioResponsavel[] | null) || []);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void carregarUsuarios();
    });
  }, [carregarUsuarios]);

  async function atualizarResponsavel() {
    setMensagem("");

    if (!podeAtribuir || !usuario) {
      setMensagem("Seu usuário não tem permissão para atribuir responsável.");
      return;
    }

    if (!responsavelId) {
      setMensagem("Selecione um responsável.");
      return;
    }

    const usuarioSelecionado = usuarios.find(
      (item) => String(item.id) === responsavelId
    );

    const { error } = await supabase
      .from("demandas")
      .update({ responsavel_id: Number(responsavelId) })
      .eq("id", demandaId)
      .select("id")
      .single();

    if (error) {
      setMensagem("Erro ao atualizar responsável: " + error.message);
      return;
    }

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaId,
      usuario_id: usuario.id,
      acao: `${usuario.nome} atribuiu a demanda para ${usuarioSelecionado?.nome}`,
    });

    setMensagem("Responsável atualizado com sucesso!");
    router.refresh();
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <p>
        <strong>Responsável atual:</strong>{" "}
        {corrigirTextoExibicao(responsavelAtual) || "Não definido"}
      </p>

      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        <select
          value={responsavelId}
          onChange={(e) => setResponsavelId(e.target.value)}
          style={campo}
          disabled={!podeAtribuir}
        >
          <option value="">Selecione o responsável</option>

          {usuarios.map((item) => (
            <option key={item.id} value={item.id}>
              {corrigirTextoExibicao(item.nome)} - {corrigirTextoExibicao(item.funcao)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={atualizarResponsavel}
          style={botao}
          disabled={!podeAtribuir}
        >
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
