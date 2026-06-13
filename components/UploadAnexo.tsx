"use client";

import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export default function UploadAnexo({ demandaId }: { demandaId: number }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState("");

  async function enviarArquivo() {
    setMensagem("");

    if (!arquivo) {
      setMensagem("Selecione um arquivo.");
      return;
    }

    const caminhoArquivo = `demanda-${demandaId}/${Date.now()}-${arquivo.name}`;

    const { error: erroUpload } = await supabase.storage
      .from("demandas")
      .upload(caminhoArquivo, arquivo);

    if (erroUpload) {
      setMensagem("Erro ao enviar arquivo: " + erroUpload.message);
      return;
    }

    const { data } = supabase.storage
      .from("demandas")
      .getPublicUrl(caminhoArquivo);

    const { error } = await supabase.from("demanda_anexos").insert({
      demanda_id: demandaId,
      nome_arquivo: arquivo.name,
      url_arquivo: data.publicUrl,
      tipo_arquivo: arquivo.type,
      tamanho_arquivo: arquivo.size,
      caminho_storage: caminhoArquivo,
    });

    if (error) {
      setMensagem("Erro ao salvar anexo: " + error.message);
      return;
    }

    location.reload();
  }

  return (
    <div style={container}>
      <input
        ref={inputRef}
        type="file"
        onChange={(e) => setArquivo(e.target.files?.[0] || null)}
        style={{ display: "none" }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={caixaArquivo}
      >
        📎 {arquivo ? arquivo.name : "Clique para escolher um arquivo"}
      </button>

      <button type="button" onClick={enviarArquivo} style={botao}>
        Enviar Arquivo
      </button>

      {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
    </div>
  );
}

const container = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
  marginBottom: "18px",
};

const caixaArquivo = {
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(252, 165, 165, 0.25)",
  color: "#e5e7eb",
  padding: "12px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  minWidth: "280px",
  textAlign: "left" as const,
};

const botao = {
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const mensagemStyle = {
  width: "100%",
  color: "#fecaca",
  margin: 0,
};