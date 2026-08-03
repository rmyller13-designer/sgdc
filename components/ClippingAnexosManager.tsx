"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { corrigirTextoExibicao } from "@/lib/display-text";

export type ClippingAnexoItem = {
  id: number;
  clipping_id: number;
  nome_arquivo: string;
  url_arquivo: string;
  tipo_arquivo: string | null;
  tamanho_arquivo: number | null;
  caminho_storage: string;
  criado_em?: string | null;
};

const LIMITE_CLIPPING_MB = 25;
const LIMITE_CLIPPING_BYTES = LIMITE_CLIPPING_MB * 1024 * 1024;

export default function ClippingAnexosManager({
  clippingId,
  titulo,
  anexos,
  onAtualizar,
}: {
  clippingId: number;
  titulo: string;
  anexos: ClippingAnexoItem[];
  onAtualizar: () => Promise<void>;
}) {
  const { usuario } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  const anexosOrdenados = useMemo(() => {
    return [...anexos].sort((a, b) => {
      const dataA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
      const dataB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
      if (dataB !== dataA) return dataB - dataA;
      return b.id - a.id;
    });
  }, [anexos]);

  async function enviarArquivos() {
    setMensagem("");

    if (arquivos.length === 0) {
      setMensagem("Selecione pelo menos um arquivo.");
      return;
    }

    setEnviando(true);

    try {
      for (const arquivo of arquivos) {
        if (arquivo.size > LIMITE_CLIPPING_BYTES) {
          setMensagem(
            `O arquivo ${arquivo.name} ultrapassa o limite de ${LIMITE_CLIPPING_MB} MB.`
          );
          return;
        }

        const caminhoArquivo = criarCaminhoAnexoClipping(clippingId, arquivo);

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

        const { error } = await supabase.from("clipping_anexos").insert({
          clipping_id: clippingId,
          nome_arquivo: arquivo.name,
          url_arquivo: data.publicUrl,
          tipo_arquivo: arquivo.type || null,
          tamanho_arquivo: arquivo.size,
          caminho_storage: caminhoArquivo,
        });

        if (error) {
          setMensagem("Não foi possível salvar o anexo agora.");
          return;
        }
      }

      if (usuario) {
        await supabase.from("historico_demanda").insert({
          demanda_id: null,
          usuario_id: usuario.id,
          acao: `${usuario.nome} anexou ${arquivos.length} arquivo(s) ao clipping #${clippingId}`,
        });
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

      await onAtualizar();
    } finally {
      setEnviando(false);
    }
  }

  async function excluirAnexo(anexo: ClippingAnexoItem) {
    const confirmou = window.confirm(
      `Deseja excluir o arquivo "${corrigirTextoExibicao(anexo.nome_arquivo)}"?`
    );

    if (!confirmou) return;

    setMensagem("");
    setExcluindoId(anexo.id);

    try {
      const { error: storageError } = await supabase.storage
        .from("demandas")
        .remove([anexo.caminho_storage]);

      if (storageError) {
        setMensagem("Não foi possível remover o arquivo do storage.");
        return;
      }

      const { error } = await supabase.from("clipping_anexos").delete().eq("id", anexo.id);

      if (error) {
        setMensagem("Não foi possível excluir o anexo agora.");
        return;
      }

      setMensagem("Anexo removido com sucesso.");
      await onAtualizar();
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <section style={wrap}>
      <div style={header}>
        <div>
          <h3 style={tituloStyle}>Anexos do clipping</h3>
          <p style={subtitulo}>
            Registro atual: <strong>{corrigirTextoExibicao(titulo)}</strong>
          </p>
        </div>
        <span style={contador}>{anexosOrdenados.length} arquivo(s)</span>
      </div>

      <div style={acoesLinha}>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => setArquivos(Array.from(e.target.files || []))}
          style={{ display: "none" }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={caixaArquivo}
        >
          <span style={caixaTitulo}>Selecionar arquivos</span>
          <span style={caixaTexto}>
            {arquivos.length > 0
              ? `${arquivos.length} arquivo(s) selecionado(s)`
              : "Prints, artes, PDFs, planilhas, apresentações ou qualquer outro arquivo"}
          </span>
        </button>

        <button
          type="button"
          onClick={enviarArquivos}
          disabled={enviando}
          style={botaoPrimario}
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
        Limite por arquivo: {LIMITE_CLIPPING_MB} MB. Os anexos do clipping ficam
        organizados em pasta própria no storage.
      </p>

      {anexosOrdenados.length > 0 ? (
        <div style={grid}>
          {anexosOrdenados.map((anexo) => (
            <AnexoCard
              key={anexo.id}
              anexo={anexo}
              excluindo={excluindoId === anexo.id}
              onExcluir={() => void excluirAnexo(anexo)}
            />
          ))}
        </div>
      ) : (
        <p style={textoFraco}>Nenhum anexo cadastrado neste clipping.</p>
      )}
    </section>
  );
}

function AnexoCard({
  anexo,
  excluindo,
  onExcluir,
}: {
  anexo: ClippingAnexoItem;
  excluindo: boolean;
  onExcluir: () => void;
}) {
  const isImagem = anexo.tipo_arquivo?.startsWith("image/");
  const dataCriacao = anexo.criado_em ? formatarDataHora(anexo.criado_em) : null;

  return (
    <div style={card}>
      <div style={cardTop}>
        <span style={tipoBadge}>{resolverTipoArquivo(anexo)}</span>
        {dataCriacao ? <span style={meta}>{dataCriacao}</span> : null}
      </div>

      <strong style={nomeArquivo}>{corrigirTextoExibicao(anexo.nome_arquivo)}</strong>

      {isImagem ? (
        <Image
          src={anexo.url_arquivo}
          alt={anexo.nome_arquivo}
          width={440}
          height={280}
          unoptimized
          style={previewImagem}
        />
      ) : (
        <div style={previewArquivo}>
          <span style={previewArquivoTipo}>{resolverTipoArquivo(anexo)}</span>
          <span style={previewArquivoNome}>{corrigirTextoExibicao(anexo.nome_arquivo)}</span>
        </div>
      )}

      <div style={acoesCard}>
        <a href={anexo.url_arquivo} target="_blank" rel="noreferrer" style={botaoLink}>
          Abrir arquivo
        </a>
        <a href={anexo.url_arquivo} download={anexo.nome_arquivo} style={botaoLinkSecundario}>
          Baixar cópia
        </a>
        <button type="button" onClick={onExcluir} disabled={excluindo} style={botaoExcluir}>
          {excluindo ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </div>
  );
}

function criarCaminhoAnexoClipping(clippingId: number, arquivo: File) {
  return `clipping/clipping-${clippingId}/anexos/${Date.now()}-${limparNomeArquivo(
    arquivo.name
  )}`;
}

function limparNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function resolverTipoArquivo(anexo: ClippingAnexoItem) {
  if (anexo.tipo_arquivo?.startsWith("image/")) return "IMG";
  if (anexo.tipo_arquivo === "application/pdf") return "PDF";
  if (anexo.tipo_arquivo?.includes("word")) return "DOC";
  if (anexo.tipo_arquivo?.includes("excel") || anexo.tipo_arquivo?.includes("sheet"))
    return "XLS";
  if (anexo.tipo_arquivo?.includes("powerpoint") || anexo.tipo_arquivo?.includes("presentation"))
    return "PPT";

  const extensao = anexo.nome_arquivo.split(".").pop()?.toUpperCase();
  return extensao || "ARQ";
}

function formatarDataHora(valor: string) {
  return new Date(valor).toLocaleString("pt-BR");
}

const wrap: CSSProperties = {
  display: "grid",
  gap: "14px",
  background: "var(--sg-panel-bg)",
  border: "1px solid var(--sg-border-strong)",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "var(--sg-shadow-card)",
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const tituloStyle: CSSProperties = {
  margin: 0,
  fontSize: "20px",
};

const subtitulo: CSSProperties = {
  margin: "6px 0 0",
  color: "var(--sg-text-secondary)",
  fontSize: "14px",
};

const contador: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(59,130,246,.16)",
  border: "1px solid rgba(96,165,250,.26)",
  color: "#dbeafe",
  fontWeight: 700,
  fontSize: "12px",
};

const acoesLinha: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "10px",
  alignItems: "stretch",
};

const caixaArquivo: CSSProperties = {
  background: "var(--sg-panel-bg-strong)",
  border: "1px solid var(--sg-border-soft)",
  color: "var(--sg-text-primary)",
  padding: "12px 14px",
  borderRadius: "12px",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: "4px",
};

const caixaTitulo: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
};

const caixaTexto: CSSProperties = {
  fontSize: "12px",
  color: "var(--sg-text-secondary)",
};

const botaoPrimario: CSSProperties = {
  background: "var(--sg-button-primary-bg)",
  color: "var(--sg-button-primary-text)",
  border: "none",
  padding: "12px 16px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: 700,
  minWidth: "140px",
};

const listaBox: CSSProperties = {
  color: "var(--sg-text-primary)",
  fontSize: "13px",
  background: "var(--sg-panel-bg-strong)",
  border: "1px solid var(--sg-border-soft)",
  borderRadius: "12px",
  padding: "12px 14px",
};

const lista: CSSProperties = {
  margin: "8px 0 0",
  paddingLeft: "18px",
};

const mensagemStyle: CSSProperties = {
  color: "var(--sg-text-secondary)",
  margin: 0,
};

const regraUpload: CSSProperties = {
  color: "var(--sg-text-subtle)",
  fontSize: "12px",
  margin: 0,
};

const textoFraco: CSSProperties = {
  margin: 0,
  color: "var(--sg-text-secondary)",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "14px",
};

const card: CSSProperties = {
  display: "grid",
  gap: "10px",
  padding: "14px",
  borderRadius: "12px",
  background: "var(--sg-panel-bg-soft)",
  border: "1px solid var(--sg-border-soft)",
};

const cardTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  alignItems: "center",
  flexWrap: "wrap",
};

const tipoBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: "999px",
  background: "rgba(148,163,184,.16)",
  border: "1px solid rgba(148,163,184,.24)",
  color: "#e2e8f0",
  fontSize: "12px",
  fontWeight: 700,
};

const meta: CSSProperties = {
  color: "var(--sg-text-secondary)",
  fontSize: "12px",
};

const nomeArquivo: CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.5,
};

const previewImagem: CSSProperties = {
  width: "100%",
  height: "180px",
  objectFit: "cover",
  borderRadius: "10px",
  border: "1px solid var(--sg-border-soft)",
};

const previewArquivo: CSSProperties = {
  minHeight: "180px",
  borderRadius: "10px",
  border: "1px dashed var(--sg-border-soft)",
  background: "linear-gradient(135deg, rgba(15,23,42,.82), rgba(30,41,59,.52))",
  display: "grid",
  placeItems: "center",
  padding: "16px",
  textAlign: "center",
  gap: "6px",
};

const previewArquivoTipo: CSSProperties = {
  fontSize: "28px",
  fontWeight: 800,
  color: "#bfdbfe",
};

const previewArquivoNome: CSSProperties = {
  fontSize: "13px",
  color: "var(--sg-text-secondary)",
};

const acoesCard: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const botaoLink: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 12px",
  borderRadius: "10px",
  background: "rgba(30,64,175,.24)",
  border: "1px solid rgba(96,165,250,.34)",
  color: "#dbeafe",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: 700,
};

const botaoLinkSecundario: CSSProperties = {
  ...botaoLink,
  background: "var(--sg-button-neutral-bg)",
  border: "1px solid var(--sg-nav-chip-border)",
  color: "var(--sg-nav-chip-text)",
};

const botaoExcluir: CSSProperties = {
  border: "1px solid rgba(248,113,113,.32)",
  borderRadius: "10px",
  padding: "9px 12px",
  background: "rgba(127,29,29,.26)",
  color: "#fecaca",
  cursor: "pointer",
  fontWeight: 700,
};
