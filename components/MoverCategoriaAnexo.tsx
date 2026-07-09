"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  trocarCategoriaNoCaminhoAnexoDemanda,
  type CategoriaAnexoDemanda,
} from "@/lib/storage-policy";

export default function MoverCategoriaAnexo({
  demandaId,
  anexoId,
  nomeArquivo,
  categoriaAtual = "referencia",
  caminhoStorage,
}: {
  demandaId: number;
  anexoId: number;
  nomeArquivo: string;
  categoriaAtual?: CategoriaAnexoDemanda | null;
  caminhoStorage?: string | null;
}) {
  const { usuario } = useAuth();
  const [movendo, setMovendo] = useState(false);

  const categoriaOrigem: CategoriaAnexoDemanda =
    categoriaAtual === "final" ? "final" : "referencia";
  const categoriaDestino: CategoriaAnexoDemanda =
    categoriaOrigem === "final" ? "referencia" : "final";

  async function mover() {
    setMovendo(true);

    try {
      let proximoCaminho = caminhoStorage || null;
      let proximaUrl: string | null = null;
      let reorganizouStorage = false;

      if (caminhoStorage) {
        const caminhoDestino = trocarCategoriaNoCaminhoAnexoDemanda(
          caminhoStorage,
          categoriaDestino
        );

        if (caminhoDestino !== caminhoStorage) {
          const { error: erroMove } = await supabase.storage
            .from("demandas")
            .move(caminhoStorage, caminhoDestino);

          if (!erroMove) {
            proximoCaminho = caminhoDestino;
            reorganizouStorage = true;

            const { data } = supabase.storage
              .from("demandas")
              .getPublicUrl(caminhoDestino);
            proximaUrl = data.publicUrl;
          } else {
            console.warn(
              "Nao foi possivel reorganizar o arquivo no storage. A categoria sera atualizada no sistema mesmo assim.",
              erroMove.message
            );
          }
        }
      }

      const atualizacao: {
        categoria: CategoriaAnexoDemanda;
        caminho_storage?: string | null;
        url_arquivo?: string | null;
      } = {
        categoria: categoriaDestino,
      };

      if (reorganizouStorage && proximoCaminho && proximoCaminho !== caminhoStorage) {
        atualizacao.caminho_storage = proximoCaminho;
      }

      if (reorganizouStorage && proximaUrl) {
        atualizacao.url_arquivo = proximaUrl;
      }

      const { error } = await supabase
        .from("demanda_anexos")
        .update(atualizacao)
        .eq("id", anexoId);

      if (error) {
        alert("Nao foi possivel atualizar a categoria do anexo agora.");
        return;
      }

      if (usuario) {
        await supabase.from("historico_demanda").insert({
          demanda_id: demandaId,
          usuario_id: usuario.id,
          acao: `${usuario.nome} moveu o anexo ${nomeArquivo} para ${
            categoriaDestino === "final" ? "arquivos finais" : "anexos de referencia"
          }${reorganizouStorage ? "" : " (sem mover pasta no storage)"}`,
        });
      }

      location.reload();
    } finally {
      setMovendo(false);
    }
  }

  return (
    <button type="button" onClick={mover} disabled={movendo} style={botaoMover}>
      {movendo
        ? "Movendo..."
        : categoriaDestino === "final"
          ? "Mover para arquivos finais"
          : "Mover para referencia"}
    </button>
  );
}

const botaoMover = {
  background: "rgba(255,255,255,0.04)",
  color: "#e2e8f0",
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "9px 12px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};
