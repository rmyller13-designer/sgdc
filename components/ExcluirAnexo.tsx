"use client";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "../lib/supabase";

export default function ExcluirAnexo({
  demandaId,
  anexoId,
  caminhoStorage,
}: {
  demandaId: number;
  anexoId: number;
  caminhoStorage?: string | null;
}) {
  const { usuario } = useAuth();

  async function excluir() {
    const confirmar = confirm("Deseja realmente excluir este anexo?");

    if (!confirmar) return;

    if (caminhoStorage) {
      const { error: storageError } = await supabase.storage
        .from("demandas")
        .remove([caminhoStorage]);

      if (storageError) {
        console.error("Erro Storage:", storageError.message);
      }
    }

    const { error } = await supabase
      .from("demanda_anexos")
      .delete()
      .eq("id", anexoId);

    if (error) {
      alert("Nao foi possivel excluir o anexo agora.");
      return;
    }

    if (usuario) {
      await supabase.from("historico_demanda").insert({
        demanda_id: demandaId,
        usuario_id: usuario.id,
        acao: `${usuario.nome} excluiu um anexo`,
      });
    }

    location.reload();
  }

  return (
    <button type="button" onClick={excluir} style={botaoExcluir}>
      🗑 Excluir
    </button>
  );
}

const botaoExcluir = {
  marginTop: "10px",
  background: "rgba(127,29,29,.65)",
  color: "#fee2e2",
  border: "1px solid rgba(252,165,165,.25)",
  padding: "8px 10px",
  borderRadius: "8px",
  cursor: "pointer",
};
