"use client";

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";
import BaixarAnexoButton from "@/components/BaixarAnexoButton";
import ExcluirAnexo from "@/components/ExcluirAnexo";
import MoverCategoriaAnexo from "@/components/MoverCategoriaAnexo";
import UploadAnexo from "@/components/UploadAnexo";
import { corrigirTextoExibicao } from "@/lib/display-text";

export type DemandaAnexoItem = {
  id: number;
  nome_arquivo: string;
  url_arquivo: string;
  tipo_arquivo: string | null;
  caminho_storage: string;
  categoria?: "referencia" | "final" | null;
  criado_em?: string | null;
};

type FiltroAnexo = "todos" | "referencia" | "final";
type TipoArquivo = "IMG" | "PDF" | "DOC" | "XLS" | "PPT" | "TXT" | "ARQ";

export default function DemandaAnexosSection({
  demandaId,
  anexos,
}: {
  demandaId: number;
  anexos: DemandaAnexoItem[];
}) {
  const [filtro, setFiltro] = useState<FiltroAnexo>("todos");

  const anexosOrdenados = useMemo(() => {
    return [...anexos].sort((a, b) => {
      const dataA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
      const dataB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
      if (dataB !== dataA) return dataB - dataA;
      return b.id - a.id;
    });
  }, [anexos]);

  const anexosReferencia = anexosOrdenados.filter(
    (anexo) => (anexo.categoria || "referencia") === "referencia"
  );
  const anexosFinais = anexosOrdenados.filter(
    (anexo) => anexo.categoria === "final"
  );

  const mostrarReferencia = filtro === "todos" || filtro === "referencia";
  const mostrarFinais = filtro === "todos" || filtro === "final";

  return (
    <div style={wrap}>
      <div style={topbar}>
        <div style={filtros}>
          <FiltroBotao
            ativo={filtro === "todos"}
            onClick={() => setFiltro("todos")}
            label={`Todos (${anexosOrdenados.length})`}
          />
          <FiltroBotao
            ativo={filtro === "referencia"}
            onClick={() => setFiltro("referencia")}
            label={`Referencia (${anexosReferencia.length})`}
          />
          <FiltroBotao
            ativo={filtro === "final"}
            onClick={() => setFiltro("final")}
            label={`Finais (${anexosFinais.length})`}
          />
        </div>

        <span style={ordenacaoInfo}>Mais recentes primeiro</span>
      </div>

      <div style={uploadsGrid}>
        <UploadAnexo
          demandaId={demandaId}
          categoriaInicial="referencia"
          mostrarAlternadorCategoria={false}
          titulo="Anexos de referencia"
          subtitulo="Briefings, arquivos-base, fotos originais e materiais enviados pelo solicitante."
        />

        <UploadAnexo
          demandaId={demandaId}
          categoriaInicial="final"
          mostrarAlternadorCategoria={false}
          titulo="Arquivos finais"
          subtitulo="Pecas prontas, artes aprovadas, PDFs finais e entregas concluidas da demanda."
        />
      </div>

      {anexosOrdenados.length > 0 ? (
        <div style={secoes}>
          {mostrarReferencia ? (
            <GrupoAnexos
              titulo="Anexos de referencia"
              subtitulo="Materiais de entrada e apoio para a equipe produzir."
              itens={anexosReferencia}
              demandaId={demandaId}
              contadorTema="referencia"
              vazio="Nenhum anexo de referencia cadastrado."
            />
          ) : null}

          {mostrarFinais ? (
            <GrupoAnexos
              titulo="Arquivos finais"
              subtitulo="Entregas prontas, aprovadas ou publicadas para consulta futura."
              itens={anexosFinais}
              demandaId={demandaId}
              contadorTema="final"
              vazio="Nenhum arquivo final cadastrado."
            />
          ) : null}
        </div>
      ) : (
        <p style={textoFraco}>Nenhum anexo cadastrado.</p>
      )}
    </div>
  );
}

function FiltroBotao({
  ativo,
  label,
  onClick,
}: {
  ativo: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...filtroBotao,
        ...(ativo ? filtroBotaoAtivo : null),
      }}
    >
      {label}
    </button>
  );
}

function GrupoAnexos({
  titulo,
  subtitulo,
  itens,
  demandaId,
  vazio,
  contadorTema,
}: {
  titulo: string;
  subtitulo: string;
  itens: DemandaAnexoItem[];
  demandaId: number;
  vazio: string;
  contadorTema: "referencia" | "final";
}) {
  return (
    <div style={grupo}>
      <div style={grupoHeader}>
        <div style={grupoHeaderText}>
          <h3
            style={{
              ...grupoTitulo,
              color: contadorTema === "final" ? "#bbf7d0" : "#cbd5e1",
            }}
          >
            {titulo}
          </h3>
          <p style={grupoSubtitulo}>{subtitulo}</p>
        </div>

        <span
          style={{
            ...contador,
            ...(contadorTema === "final" ? contadorFinal : contadorReferencia),
          }}
        >
          {itens.length}
        </span>
      </div>

      {itens.length > 0 ? (
        <div style={grid}>
          {itens.map((anexo) => (
            <AnexoCard key={anexo.id} anexo={anexo} demandaId={demandaId} />
          ))}
        </div>
      ) : (
        <p style={textoFraco}>{vazio}</p>
      )}
    </div>
  );
}

function AnexoCard({
  anexo,
  demandaId,
}: {
  anexo: DemandaAnexoItem;
  demandaId: number;
}) {
  const tipoArquivo = resolverTipoArquivo(anexo);
  const tipoMeta = obterMetaTipoArquivo(tipoArquivo);
  const isImagem = anexo.tipo_arquivo?.startsWith("image/");
  const temaFinal = anexo.categoria === "final";
  const dataCriacao = anexo.criado_em ? formatarDataHora(anexo.criado_em) : null;

  return (
    <div
      style={{
        ...card,
        ...(temaFinal ? cardFinal : cardReferencia),
      }}
    >
      <div style={cardMetaTopo}>
        <span
          style={{
            ...categoriaBadge,
            ...(temaFinal ? categoriaFinal : categoriaReferencia),
          }}
        >
          {temaFinal ? "Arquivo final" : "Referencia"}
        </span>

        <span
          style={{
            ...tipoBadge,
            background: tipoMeta.badgeBg,
            borderColor: tipoMeta.badgeBorder,
            color: tipoMeta.badgeText,
          }}
        >
          {tipoArquivo}
        </span>
      </div>

      <a href={anexo.url_arquivo} target="_blank" rel="noreferrer" style={nomeLink}>
        {corrigirTextoExibicao(anexo.nome_arquivo)}
      </a>

      {isImagem ? (
        <Image
          src={anexo.url_arquivo}
          alt={anexo.nome_arquivo}
          width={480}
          height={320}
          unoptimized
          style={previewImagem}
        />
      ) : (
        <div
          style={{
            ...previewArquivo,
            background: tipoMeta.previewGradient,
            borderColor: tipoMeta.previewBorder,
          }}
        >
          <div style={previewArquivoInner}>
            <span
              style={{
                ...previewArquivoTipo,
                background: tipoMeta.iconBg,
                borderColor: tipoMeta.iconBorder,
                color: tipoMeta.iconText,
              }}
            >
              {tipoArquivo}
            </span>

            <strong style={previewArquivoTitulo}>{tipoMeta.titulo}</strong>
            <span style={previewArquivoLinha}>{tipoMeta.descricao}</span>
            <span style={previewArquivoNome}>
              {corrigirTextoExibicao(anexo.nome_arquivo)}
            </span>
          </div>
        </div>
      )}

      <div style={metaRodape}>
        <span style={metaChip}>{tipoMeta.label}</span>
        {dataCriacao ? <span style={metaChip}>{dataCriacao}</span> : null}
      </div>

      <div style={acoes}>
        <a href={anexo.url_arquivo} target="_blank" rel="noreferrer" style={acaoAbrir}>
          Abrir arquivo
        </a>
        <BaixarAnexoButton
          url={anexo.url_arquivo}
          nomeArquivo={anexo.nome_arquivo}
          style={acaoBaixar}
        />
        <MoverCategoriaAnexo
          demandaId={demandaId}
          anexoId={anexo.id}
          nomeArquivo={anexo.nome_arquivo}
          categoriaAtual={anexo.categoria}
        />
      </div>

      <ExcluirAnexo
        demandaId={demandaId}
        anexoId={anexo.id}
        caminhoStorage={anexo.caminho_storage}
      />
    </div>
  );
}

function resolverTipoArquivo(anexo: DemandaAnexoItem): TipoArquivo {
  const tipo = (anexo.tipo_arquivo || "").toLowerCase();
  const nome = anexo.nome_arquivo.toLowerCase();

  if (tipo.startsWith("image/")) return "IMG";
  if (tipo.includes("pdf") || nome.endsWith(".pdf")) return "PDF";
  if (tipo.includes("word") || nome.endsWith(".doc") || nome.endsWith(".docx")) {
    return "DOC";
  }
  if (
    tipo.includes("excel") ||
    nome.endsWith(".xls") ||
    nome.endsWith(".xlsx") ||
    nome.endsWith(".csv")
  ) {
    return "XLS";
  }
  if (
    tipo.includes("powerpoint") ||
    nome.endsWith(".ppt") ||
    nome.endsWith(".pptx") ||
    nome.endsWith(".pps") ||
    nome.endsWith(".ppsx")
  ) {
    return "PPT";
  }
  if (nome.endsWith(".txt")) return "TXT";
  return "ARQ";
}

function obterMetaTipoArquivo(tipo: TipoArquivo) {
  const mapa: Record<
    TipoArquivo,
    {
      label: string;
      titulo: string;
      descricao: string;
      badgeBg: string;
      badgeBorder: string;
      badgeText: string;
      iconBg: string;
      iconBorder: string;
      iconText: string;
      previewGradient: string;
      previewBorder: string;
    }
  > = {
    IMG: {
      label: "Imagem",
      titulo: "Arquivo visual",
      descricao: "Foto, print ou arte em imagem",
      badgeBg: "rgba(59, 130, 246, 0.14)",
      badgeBorder: "rgba(96, 165, 250, 0.24)",
      badgeText: "#dbeafe",
      iconBg: "rgba(59, 130, 246, 0.16)",
      iconBorder: "rgba(96, 165, 250, 0.22)",
      iconText: "#dbeafe",
      previewGradient:
        "linear-gradient(135deg, rgba(15,23,42,.98), rgba(30,41,59,.92), rgba(17,24,39,.98))",
      previewBorder: "rgba(96, 165, 250, 0.22)",
    },
    PDF: {
      label: "PDF",
      titulo: "Documento em PDF",
      descricao: "Material pronto para leitura ou aprovacao",
      badgeBg: "rgba(239, 68, 68, 0.14)",
      badgeBorder: "rgba(248, 113, 113, 0.24)",
      badgeText: "#fecaca",
      iconBg: "rgba(239, 68, 68, 0.16)",
      iconBorder: "rgba(248, 113, 113, 0.22)",
      iconText: "#fecaca",
      previewGradient:
        "linear-gradient(135deg, rgba(69,10,10,.98), rgba(127,29,29,.92), rgba(41,10,10,.98))",
      previewBorder: "rgba(248, 113, 113, 0.22)",
    },
    DOC: {
      label: "Documento",
      titulo: "Arquivo de texto",
      descricao: "Word ou documento editavel",
      badgeBg: "rgba(37, 99, 235, 0.14)",
      badgeBorder: "rgba(96, 165, 250, 0.24)",
      badgeText: "#dbeafe",
      iconBg: "rgba(37, 99, 235, 0.16)",
      iconBorder: "rgba(96, 165, 250, 0.22)",
      iconText: "#dbeafe",
      previewGradient:
        "linear-gradient(135deg, rgba(23,37,84,.98), rgba(30,64,175,.88), rgba(15,23,42,.98))",
      previewBorder: "rgba(96, 165, 250, 0.22)",
    },
    XLS: {
      label: "Planilha",
      titulo: "Arquivo de planilha",
      descricao: "Excel, CSV ou estrutura tabular",
      badgeBg: "rgba(34, 197, 94, 0.14)",
      badgeBorder: "rgba(74, 222, 128, 0.24)",
      badgeText: "#bbf7d0",
      iconBg: "rgba(34, 197, 94, 0.16)",
      iconBorder: "rgba(74, 222, 128, 0.22)",
      iconText: "#bbf7d0",
      previewGradient:
        "linear-gradient(135deg, rgba(20,83,45,.98), rgba(21,128,61,.88), rgba(15,23,42,.98))",
      previewBorder: "rgba(74, 222, 128, 0.22)",
    },
    PPT: {
      label: "Apresentacao",
      titulo: "Arquivo de apresentacao",
      descricao: "PowerPoint, PPS ou material de exposicao",
      badgeBg: "rgba(249, 115, 22, 0.14)",
      badgeBorder: "rgba(251, 146, 60, 0.24)",
      badgeText: "#fed7aa",
      iconBg: "rgba(249, 115, 22, 0.16)",
      iconBorder: "rgba(251, 146, 60, 0.22)",
      iconText: "#fed7aa",
      previewGradient:
        "linear-gradient(135deg, rgba(124,45,18,.98), rgba(194,65,12,.88), rgba(67,20,7,.98))",
      previewBorder: "rgba(251, 146, 60, 0.22)",
    },
    TXT: {
      label: "Texto",
      titulo: "Arquivo simples",
      descricao: "Conteudo em texto puro",
      badgeBg: "rgba(168, 85, 247, 0.14)",
      badgeBorder: "rgba(192, 132, 252, 0.24)",
      badgeText: "#e9d5ff",
      iconBg: "rgba(168, 85, 247, 0.16)",
      iconBorder: "rgba(192, 132, 252, 0.22)",
      iconText: "#e9d5ff",
      previewGradient:
        "linear-gradient(135deg, rgba(59,7,100,.98), rgba(107,33,168,.88), rgba(30,27,75,.98))",
      previewBorder: "rgba(192, 132, 252, 0.22)",
    },
    ARQ: {
      label: "Arquivo",
      titulo: "Arquivo geral",
      descricao: "Formato diverso salvo na demanda",
      badgeBg: "rgba(148, 163, 184, 0.14)",
      badgeBorder: "rgba(148, 163, 184, 0.24)",
      badgeText: "#cbd5e1",
      iconBg: "rgba(148, 163, 184, 0.16)",
      iconBorder: "rgba(148, 163, 184, 0.22)",
      iconText: "#e2e8f0",
      previewGradient:
        "linear-gradient(135deg, rgba(15,23,42,.98), rgba(51,65,85,.92), rgba(17,24,39,.98))",
      previewBorder: "rgba(148, 163, 184, 0.22)",
    },
  };

  return mapa[tipo];
}

function formatarDataHora(data: string) {
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return null;

  return valor.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const wrap: CSSProperties = {
  display: "grid",
  gap: "18px",
};

const topbar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const filtros: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const filtroBotao: CSSProperties = {
  border: "1px solid var(--sg-border-soft)",
  background: "var(--sg-button-neutral-bg)",
  color: "var(--sg-nav-chip-text)",
  borderRadius: "999px",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};

const filtroBotaoAtivo: CSSProperties = {
  background: "var(--sg-button-primary-bg)",
  color: "var(--sg-button-primary-text)",
  border: "1px solid transparent",
};

const ordenacaoInfo: CSSProperties = {
  color: "var(--sg-text-subtle)",
  fontSize: "12px",
};

const uploadsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const secoes: CSSProperties = {
  display: "grid",
  gap: "22px",
};

const grupo: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const grupoHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const grupoHeaderText: CSSProperties = {
  display: "grid",
  gap: "4px",
};

const grupoTitulo: CSSProperties = {
  margin: 0,
  fontSize: "16px",
};

const grupoSubtitulo: CSSProperties = {
  margin: 0,
  color: "var(--sg-text-subtle)",
  fontSize: "12px",
};

const contador: CSSProperties = {
  minWidth: "28px",
  height: "28px",
  borderRadius: "999px",
  padding: "0 9px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 700,
  border: "1px solid transparent",
};

const contadorReferencia: CSSProperties = {
  background: "rgba(148, 163, 184, 0.12)",
  borderColor: "rgba(148, 163, 184, 0.24)",
  color: "#cbd5e1",
};

const contadorFinal: CSSProperties = {
  background: "rgba(34, 197, 94, 0.14)",
  borderColor: "rgba(74, 222, 128, 0.26)",
  color: "#bbf7d0",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "12px",
};

const card: CSSProperties = {
  background: "var(--sg-card-bg-soft)",
  border: "1px solid var(--sg-border-soft)",
  borderRadius: "12px",
  padding: "14px",
  display: "grid",
  gap: "12px",
};

const cardReferencia: CSSProperties = {
  boxShadow: "inset 0 0 0 1px rgba(148,163,184,.08)",
};

const cardFinal: CSSProperties = {
  boxShadow: "inset 0 0 0 1px rgba(34,197,94,.12)",
};

const cardMetaTopo: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
};

const categoriaBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "11px",
  fontWeight: 700,
  border: "1px solid transparent",
};

const categoriaReferencia: CSSProperties = {
  background: "rgba(148, 163, 184, 0.14)",
  borderColor: "rgba(148, 163, 184, 0.24)",
  color: "#cbd5e1",
};

const categoriaFinal: CSSProperties = {
  background: "rgba(34, 197, 94, 0.14)",
  borderColor: "rgba(74, 222, 128, 0.26)",
  color: "#bbf7d0",
};

const tipoBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "48px",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "11px",
  fontWeight: 800,
  border: "1px solid transparent",
};

const nomeLink: CSSProperties = {
  color: "var(--sg-text-primary)",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: "20px",
  overflowWrap: "anywhere",
};

const previewImagem: CSSProperties = {
  width: "100%",
  height: "180px",
  objectFit: "contain",
  background: "var(--sg-panel-bg-strong)",
  borderRadius: "10px",
  border: "1px solid var(--sg-border-soft)",
};

const previewArquivo: CSSProperties = {
  width: "100%",
  minHeight: "180px",
  borderRadius: "10px",
  border: "1px solid transparent",
  display: "grid",
  placeItems: "center",
  padding: "18px",
};

const previewArquivoInner: CSSProperties = {
  width: "100%",
  display: "grid",
  gap: "8px",
  justifyItems: "center",
  textAlign: "center",
};

const previewArquivoTipo: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "72px",
  height: "72px",
  borderRadius: "20px",
  border: "1px solid transparent",
  fontSize: "18px",
  fontWeight: 800,
  letterSpacing: "0.04em",
};

const previewArquivoTitulo: CSSProperties = {
  color: "#f8fafc",
  fontSize: "15px",
  lineHeight: "20px",
};

const previewArquivoLinha: CSSProperties = {
  color: "#e2e8f0",
  fontSize: "12px",
  lineHeight: "18px",
};

const previewArquivoNome: CSSProperties = {
  color: "#cbd5e1",
  fontSize: "12px",
  lineHeight: "18px",
  overflowWrap: "anywhere",
};

const metaRodape: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const metaChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "11px",
  fontWeight: 700,
  color: "var(--sg-text-muted)",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const acoes: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const acaoBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  padding: "9px 12px",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: 700,
};

const acaoAbrir: CSSProperties = {
  ...acaoBase,
  background: "var(--sg-button-neutral-bg)",
  border: "1px solid var(--sg-border-soft)",
  color: "var(--sg-nav-chip-text)",
};

const acaoBaixar: CSSProperties = {
  ...acaoBase,
  background: "rgba(37, 99, 235, 0.18)",
  border: "1px solid rgba(96, 165, 250, 0.24)",
  color: "#dbeafe",
};

const textoFraco: CSSProperties = {
  color: "var(--sg-text-secondary)",
};
