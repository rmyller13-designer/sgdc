"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  type CategoriaAnexoDemanda,
  criarCaminhoAnexoDemanda,
  LIMITE_UPLOAD_MB,
  TIPOS_ACEITOS_UPLOAD,
  validarArquivoUpload,
} from "@/lib/storage-policy";
import { supabase } from "../lib/supabase";

export default function UploadAnexo({
  demandaId,
  categoriaInicial = "final",
  mostrarAlternadorCategoria = true,
  titulo,
  subtitulo,
}: {
  demandaId: number;
  categoriaInicial?: CategoriaAnexoDemanda;
  mostrarAlternadorCategoria?: boolean;
  titulo?: string;
  subtitulo?: string;
}) {
  const { usuario } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [categoria, setCategoria] =
    useState<CategoriaAnexoDemanda>(categoriaInicial);

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

        const caminhoArquivo = criarCaminhoAnexoDemanda(
          demandaId,
          arquivo,
          categoria
        );

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
          categoria,
        });

        if (error) {
          setMensagem("Nao foi possivel salvar o anexo agora.");
          return;
        }

        if (usuario) {
          await supabase.from("historico_demanda").insert({
            demanda_id: demandaId,
            usuario_id: usuario.id,
            acao: `${usuario.nome} anexou o arquivo ${arquivo.name} em ${
              categoria === "final" ? "arquivos finais" : "anexos de referencia"
            }`,
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
    <div
      style={{
        ...container,
        ...(categoria === "final" ? containerFinal : containerReferencia),
      }}
    >
      <div style={grupoCategoria}>
        {titulo || subtitulo ? (
          <div style={cabecalho}>
            {titulo ? <strong style={tituloStyle}>{titulo}</strong> : null}
            {subtitulo ? <p style={subtituloStyle}>{subtitulo}</p> : null}
          </div>
        ) : null}

        {mostrarAlternadorCategoria ? (
          <>
            <span style={categoriaLabel}>Destino</span>

            <div style={categoriaTabs}>
              <button
                type="button"
                onClick={() => setCategoria("referencia")}
                style={{
                  ...categoriaBotao,
                  ...(categoria === "referencia" ? categoriaBotaoAtivo : null),
                }}
              >
                Anexos de referencia
              </button>

              <button
                type="button"
                onClick={() => setCategoria("final")}
                style={{
                  ...categoriaBotao,
                  ...(categoria === "final" ? categoriaBotaoAtivo : null),
                }}
              >
                Arquivos finais
              </button>
            </div>
          </>
        ) : (
          <span
            style={{
              ...categoriaFixa,
              ...(categoria === "final" ? categoriaFixaFinal : categoriaFixaReferencia),
            }}
          >
            {categoria === "final"
              ? "Destino: arquivos finais"
              : "Destino: anexos de referencia"}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={TIPOS_ACEITOS_UPLOAD.join(",")}
        onChange={(e) => setArquivos(Array.from(e.target.files || []))}
        style={{ display: "none" }}
      />

      <div style={acoesLinha}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={caixaArquivo}
        >
          <span style={caixaTitulo}>Selecionar arquivos</span>
          <span style={caixaTexto}>
            {arquivos.length > 0
              ? `${arquivos.length} arquivo(s) selecionado(s)`
              : "Clique para escolher um ou mais arquivos"}
          </span>
        </button>

        <button
          type="button"
          onClick={enviarArquivos}
          style={botao}
          disabled={enviando}
        >
          {enviando ? "Enviando..." : "Enviar arquivos"}
        </button>
      </div>

      {arquivos.length > 0 ? (
        <div style={listaBox}>
          <strong>Selecionados</strong>
          <ul style={lista}>
            {arquivos.map((arquivo) => (
              <li key={`${arquivo.name}-${arquivo.size}`}>{arquivo.name}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {mensagem ? <p style={mensagemStyle}>{mensagem}</p> : null}

      <p style={regraUpload}>
        Limite por arquivo: {LIMITE_UPLOAD_MB} MB. Os arquivos ficam
        organizados por categoria dentro da pasta da demanda.
      </p>
    </div>
  );
}

const container = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid var(--sg-border-soft)",
  background: "var(--sg-card-bg-soft)",
};

const containerReferencia = {
  boxShadow: "inset 0 0 0 1px rgba(148,163,184,.08)",
};

const containerFinal = {
  boxShadow: "inset 0 0 0 1px rgba(34,197,94,.12)",
};

const grupoCategoria = {
  width: "100%",
  display: "grid",
  gap: "8px",
};

const cabecalho = {
  display: "grid",
  gap: "4px",
};

const tituloStyle = {
  color: "var(--sg-text-primary)",
  fontSize: "14px",
};

const subtituloStyle = {
  margin: 0,
  color: "var(--sg-text-subtle)",
  fontSize: "12px",
  lineHeight: "18px",
};

const categoriaLabel = {
  color: "var(--sg-text-secondary)",
  fontSize: "13px",
  fontWeight: 700,
};

const categoriaTabs = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const categoriaBotao = {
  border: "1px solid var(--sg-border-soft)",
  background: "var(--sg-button-neutral-bg)",
  color: "var(--sg-nav-chip-text)",
  borderRadius: "999px",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};

const categoriaBotaoAtivo = {
  background: "var(--sg-button-primary-bg)",
  color: "var(--sg-button-primary-text)",
  border: "1px solid transparent",
};

const categoriaFixa = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "11px",
  fontWeight: 700,
  border: "1px solid transparent",
};

const categoriaFixaReferencia = {
  background: "rgba(148, 163, 184, 0.14)",
  borderColor: "rgba(148, 163, 184, 0.24)",
  color: "#cbd5e1",
};

const categoriaFixaFinal = {
  background: "rgba(34, 197, 94, 0.14)",
  borderColor: "rgba(74, 222, 128, 0.26)",
  color: "#bbf7d0",
};

const acoesLinha = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "10px",
  alignItems: "stretch",
};

const caixaArquivo = {
  background: "var(--sg-panel-bg-strong)",
  border: "1px solid var(--sg-border-soft)",
  color: "var(--sg-text-primary)",
  padding: "12px 14px",
  borderRadius: "12px",
  cursor: "pointer",
  textAlign: "left" as const,
  display: "grid",
  gap: "4px",
};

const caixaTitulo = {
  fontSize: "13px",
  fontWeight: 700,
  color: "var(--sg-text-primary)",
};

const caixaTexto = {
  fontSize: "12px",
  color: "var(--sg-text-secondary)",
};

const botao = {
  background: "var(--sg-button-primary-bg)",
  color: "var(--sg-button-primary-text)",
  border: "none",
  padding: "12px 16px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "bold",
  minWidth: "140px",
};

const listaBox = {
  width: "100%",
  color: "var(--sg-text-primary)",
  fontSize: "13px",
  background: "var(--sg-panel-bg-strong)",
  border: "1px solid var(--sg-border-soft)",
  borderRadius: "12px",
  padding: "12px 14px",
};

const lista = {
  margin: "8px 0 0",
  paddingLeft: "18px",
};

const mensagemStyle = {
  width: "100%",
  color: "var(--sg-text-secondary)",
  margin: 0,
};

const regraUpload = {
  width: "100%",
  color: "var(--sg-text-subtle)",
  fontSize: "12px",
  margin: 0,
};
