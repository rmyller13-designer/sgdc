"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

export default function BaixarAnexoButton({
  url,
  nomeArquivo,
  style,
}: {
  url: string;
  nomeArquivo: string;
  style: CSSProperties;
}) {
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);

    try {
      const resposta = await fetch(url);

      if (!resposta.ok) {
        throw new Error("Falha ao baixar arquivo.");
      }

      const blob = await resposta.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = nomeArquivo || "arquivo";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      alert("Nao foi possivel baixar o arquivo agora.");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <button type="button" onClick={baixar} disabled={baixando} style={style}>
      {baixando ? "Baixando..." : "Baixar copia"}
    </button>
  );
}
