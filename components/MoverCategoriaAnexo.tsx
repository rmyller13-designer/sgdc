"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { type CategoriaAnexoDemanda } from "@/lib/storage-policy";

export default function MoverCategoriaAnexo({
  demandaId,
  anexoId,
  nomeArquivo,
  categoriaAtual = "referencia",
}: {
  demandaId: number;
  anexoId: number;
  nomeArquivo: string;
  categoriaAtual?: CategoriaAnexoDemanda | null;
}) {
  const { usuario } = useAuth();
  const [movendo, setMovendo] = useState(false);

  const categoriaOrigem: CategoriaAnexoDemanda =
    categoriaAtual === "final" ? "final" : "referencia";
  const categoriaDestino: CategoriaAnexoDemanda =
    categoriaOrigem === "final" ? "referencia" : "final";

  async function mover() {
    if (!usuario) {
      alert("Usuario nao identificado.");
      return;
    }

    setMovendo(true);

    try {
      const response = await fetch(
        `/api/demandas/${demandaId}/anexos/${anexoId}/mover`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categoriaDestino,
            nomeArquivo,
            usuario,
          }),
        }
      );

      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !json.ok) {
        alert(json.error || "Nao foi possivel mover o anexo agora.");
        return;
      }

      location.reload();
    } catch {
      alert("Nao foi possivel mover o anexo agora.");
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
