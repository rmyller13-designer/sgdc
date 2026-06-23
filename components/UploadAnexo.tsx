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
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviarArquivos() {
    setMensagem("");

    if (arquivos.length === 0) {
      setMensagem("Selecione pelo menos um arquivo.");
      return;
    }

    setEnviando(true);

    try {
      for (const arquivo of arquivos) {
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
      }

      setMensagem(
        arquivos.length === 1
          ? "Arquivo enviado com sucesso."
          : `${arquivos.length} arquivos enviados com sucesso.`
      );

      setArquivos([]);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      location.reload();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={container}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={TIPOS_ACEITOS_UPLOAD.join(",")}
        onChange={(e) => setArquivos(Array.from(e.target.files || []))}
        style={{ display: "none" }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={caixaArquivo}
      >
        {arquivos.length > 0
          ? `${arquivos.length} arquivo(s) selecionado(s)`
          : "Clique para escolher um ou mais arquivos"}
      </button>

      <button
        type="button"
        onClick={enviarArquivos}
        style={botao}
        disabled={enviando}
      >
        {enviando ? "Enviando..." : "Enviar Arquivos"}
      </button>

      {arquivos.length > 0 && (
        <div style={listaBox}>
          <strong>Selecionados:</strong>
          <ul style={lista}>
            {arquivos.map((arquivo) => (
              <li key={`${arquivo.name}-${arquivo.size}`}>{arquivo.name}</li>
            ))}
          </ul>
        </div>
      )}

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

const listaBox = {
  width: "100%",
  color: "#e5e7eb",
  fontSize: "13px",
};

const lista = {
  margin: "8px 0 0",
  paddingLeft: "18px",
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

