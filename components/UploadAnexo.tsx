"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  criarCaminhoAnexoDemanda,
  LIMITE_UPLOAD_MB,
  TIPOS_ACEITOS_UPLOAD,
  validarArquivoUpload,
} from "@/lib/storage-policy";
import { supabase } from "../lib/supabase";

export default function UploadAnexo({ demandaId }: { demandaId: number }) {
  const { usuario } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState("");

  async function enviarArquivo() {
    setMensagem("");

    if (!arquivo) {
      setMensagem("Selecione um arquivo.");
      return;
    }

    const erroArquivo = validarArquivoUpload(arquivo);

    if (erroArquivo) {
      setMensagem(erroArquivo);
      return;
    }

    const caminhoArquivo = criarCaminhoAnexoDemanda(demandaId, arquivo);

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

    if (usuario) {
      await supabase.from("historico_demanda").insert({
        demanda_id: demandaId,
        usuario_id: usuario.id,
        acao: `${usuario.nome} anexou o arquivo ${arquivo.name}`,
      });
    }

    location.reload();
  }

  return (
    <div style={container}>
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ACEITOS_UPLOAD.join(",")}
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
      <p style={regraUpload}>
        Limite por arquivo: {LIMITE_UPLOAD_MB} MB. Os anexos ficam em pasta da
        demanda.
      </p>
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

const regraUpload = {
  width: "100%",
  color: "#94a3b8",
  fontSize: "12px",
  margin: 0,
};
