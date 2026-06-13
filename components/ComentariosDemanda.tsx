"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  criarCaminhoAnexoComentario,
  LIMITE_UPLOAD_MB,
  TIPOS_UPLOAD_PERMITIDOS,
  validarArquivoUpload,
} from "@/lib/storage-policy";
import { supabase } from "../lib/supabase";

type ComentarioAnexo = {
  id: number;
  nome_arquivo: string;
  url_arquivo: string;
  tipo_arquivo: string | null;
  tamanho_arquivo: number | null;
  caminho_storage: string;
};

type Comentario = {
  id: number;
  comentario: string;
  criado_em: string;
  usuario_id: number | null;
  comentario_anexos?: ComentarioAnexo[];
};

export default function ComentariosDemanda({
  demandaId,
}: {
  demandaId: number;
}) {
  const { usuario } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregarComentarios = useCallback(async () => {
    const { data, error } = await supabase
      .from("comentarios_demanda")
      .select(
        "id, comentario, criado_em, usuario_id, comentario_anexos(id, nome_arquivo, url_arquivo, tipo_arquivo, tamanho_arquivo, caminho_storage)"
      )
      .eq("demanda_id", demandaId)
      .order("criado_em", { ascending: true });

    if (!error) {
      setComentarios((data || []) as Comentario[]);
      return;
    }

    const fallback = await supabase
      .from("comentarios_demanda")
      .select("id, comentario, criado_em, usuario_id")
      .eq("demanda_id", demandaId)
      .order("criado_em", { ascending: true });

    setComentarios((fallback.data || []) as Comentario[]);
  }, [demandaId]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregarComentarios();
    });
  }, [carregarComentarios]);

  async function enviarComentario() {
    setMensagem("");

    if (!texto.trim() && arquivos.length === 0) {
      setMensagem("Digite um comentario ou selecione um anexo.");
      return;
    }

    if (!usuario) {
      setMensagem("Faca login para comentar.");
      return;
    }

    for (const arquivo of arquivos) {
      const erroArquivo = validarArquivoUpload(arquivo);
      if (erroArquivo) {
        setMensagem(erroArquivo);
        return;
      }
    }

    setEnviando(true);

    const { data: comentarioCriado, error } = await supabase
      .from("comentarios_demanda")
      .insert({
        demanda_id: demandaId,
        usuario_id: usuario.id,
        comentario: texto.trim() || "Anexo enviado.",
      })
      .select("id")
      .single();

    if (error || !comentarioCriado) {
      setMensagem("Erro ao enviar comentario: " + (error?.message || ""));
      setEnviando(false);
      return;
    }

    for (const arquivo of arquivos) {
      const caminhoArquivo = criarCaminhoAnexoComentario(
        demandaId,
        comentarioCriado.id,
        arquivo
      );

      const { error: erroUpload } = await supabase.storage
        .from("demandas")
        .upload(caminhoArquivo, arquivo);

      if (erroUpload) {
        setMensagem("Comentario salvo, mas houve erro no anexo: " + erroUpload.message);
        continue;
      }

      const { data: urlPublica } = supabase.storage
        .from("demandas")
        .getPublicUrl(caminhoArquivo);

      const { error: erroAnexo } = await supabase
        .from("comentario_anexos")
        .insert({
          comentario_id: comentarioCriado.id,
          demanda_id: demandaId,
          nome_arquivo: arquivo.name,
          tipo_arquivo: arquivo.type,
          tamanho_arquivo: arquivo.size,
          url_arquivo: urlPublica.publicUrl,
          caminho_storage: caminhoArquivo,
        });

      if (erroAnexo) {
        setMensagem("Anexo enviado, mas nao foi vinculado ao comentario.");
      }
    }

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaId,
      usuario_id: usuario.id,
      acao:
        arquivos.length > 0
          ? `${usuario.nome} adicionou comentario com ${arquivos.length} anexo(s)`
          : `${usuario.nome} adicionou um comentario`,
    });

    setTexto("");
    setArquivos([]);
    if (inputRef.current) inputRef.current.value = "";
    await carregarComentarios();
    setEnviando(false);
  }

  function selecionarArquivos(lista: FileList | null) {
    setArquivos(Array.from(lista || []));
  }

  return (
    <div>
      <h2 style={titulo}>Comentarios</h2>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Digite um comentario..."
        style={campoTexto}
      />

      <div style={barraAcoes}>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={TIPOS_UPLOAD_PERMITIDOS.join(",")}
          onChange={(e) => selecionarArquivos(e.target.files)}
          style={{ display: "none" }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={botaoSecundario}
        >
          Anexar arquivo
        </button>

        <button
          type="button"
          onClick={enviarComentario}
          style={botao}
          disabled={enviando}
        >
          {enviando ? "Enviando..." : "Enviar"}
        </button>
      </div>

      {arquivos.length > 0 && (
        <div style={arquivosBox}>
          {arquivos.map((arquivo) => (
            <span key={`${arquivo.name}-${arquivo.size}`} style={arquivoPill}>
              {arquivo.name}
            </span>
          ))}
        </div>
      )}

      <p style={regraUpload}>
        Anexos ate {LIMITE_UPLOAD_MB} MB, organizados na pasta da demanda.
      </p>

      {mensagem && <p style={mensagemStyle}>{mensagem}</p>}

      <div style={lista}>
        {comentarios.map((comentario) => (
          <div key={comentario.id} style={cardComentario}>
            <p style={comentarioTexto}>{comentario.comentario}</p>
            <small style={dataTexto}>
              {new Date(comentario.criado_em).toLocaleString("pt-BR")}
            </small>

            {comentario.comentario_anexos &&
              comentario.comentario_anexos.length > 0 && (
                <div style={anexosLista}>
                  {comentario.comentario_anexos.map((anexo) => (
                    <a
                      key={anexo.id}
                      href={anexo.url_arquivo}
                      target="_blank"
                      rel="noreferrer"
                      style={anexoLink}
                    >
                      {anexo.nome_arquivo}
                    </a>
                  ))}
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}

const titulo = {
  marginTop: 0,
};

const campoTexto = {
  width: "100%",
  minHeight: "84px",
  boxSizing: "border-box" as const,
  padding: "10px",
  background: "#111827",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "8px",
  resize: "vertical" as const,
};

const barraAcoes = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
  marginTop: "10px",
};

const botao = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const botaoSecundario = {
  ...botao,
  background: "rgba(15,23,42,.85)",
  border: "1px solid rgba(252,165,165,.25)",
  color: "#fee2e2",
};

const arquivosBox = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "6px",
  marginTop: "10px",
};

const arquivoPill = {
  background: "rgba(37,99,235,.2)",
  border: "1px solid rgba(147,197,253,.24)",
  color: "#bfdbfe",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "12px",
};

const regraUpload = {
  color: "#94a3b8",
  fontSize: "12px",
  margin: "10px 0 0",
};

const mensagemStyle = {
  color: "#fecaca",
  marginBottom: 0,
};

const lista = {
  marginTop: "18px",
};

const cardComentario = {
  border: "1px solid rgba(148,163,184,.22)",
  background: "rgba(2,6,23,.32)",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "10px",
};

const comentarioTexto = {
  margin: 0,
  marginBottom: "8px",
  whiteSpace: "pre-wrap" as const,
};

const dataTexto = {
  color: "#94a3b8",
};

const anexosLista = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px",
  marginTop: "10px",
};

const anexoLink = {
  color: "#93c5fd",
  textDecoration: "none",
  fontSize: "13px",
  overflowWrap: "anywhere" as const,
};
