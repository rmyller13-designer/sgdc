"use client";

import Link from "next/link";
import type { SugestaoMemoriaEditorial } from "@/lib/memoria-editorial";

export default function MemoriaEditorialSection({
  itens,
  titulo = "Memória editorial",
  subtitulo = "Demandas parecidas para reaproveitar ideias, texto-base e referências.",
  vazio = "Nenhuma sugestão encontrada ainda.",
  onUsarComoBase,
}: {
  itens: SugestaoMemoriaEditorial[];
  titulo?: string;
  subtitulo?: string;
  vazio?: string;
  onUsarComoBase?: (item: SugestaoMemoriaEditorial) => void;
}) {
  return (
    <section style={box}>
      <div style={header}>
        <div>
          <p style={eyebrow}>Reaproveitamento inteligente</p>
          <h2 style={title}>{titulo}</h2>
          <p style={subtitle}>{subtitulo}</p>
        </div>
      </div>

      {itens.length === 0 ? (
        <p style={empty}>{vazio}</p>
      ) : (
        <div style={grid}>
          {itens.map((item) => (
            <article key={item.id} style={card}>
              <div style={top}>
                <span style={badgeId}>#{item.id}</span>
                <span style={badgeScore(item.classificacao)}>{item.classificacao}</span>
              </div>

              <strong style={cardTitle}>{item.titulo}</strong>
              <p style={cardText}>{item.descricaoResumo}</p>

              <div style={meta}>
                <span style={pill}>{item.setor}</span>
                <span style={pill}>{item.status}</span>
                <span style={pill}>{item.prioridade}</span>
              </div>

              <div style={reasonList}>
                {item.motivos.map((motivo) => (
                  <span key={motivo} style={reasonPill}>
                    {motivo}
                  </span>
                ))}
              </div>

              <div style={footer}>
                <span style={metaSmall}>
                  Responsável: <strong>{item.responsavel}</strong>
                </span>
                <span style={metaSmall}>
                  {item.criadoEm
                    ? new Date(item.criadoEm).toLocaleDateString("pt-BR")
                    : "Sem data"}
                </span>
              </div>

              <div style={actions}>
                <Link href={`/demandas/${item.id}`} style={linkAction}>
                  Abrir original
                </Link>

                {onUsarComoBase ? (
                  <button
                    type="button"
                    onClick={() => onUsarComoBase(item)}
                    style={buttonAction}
                  >
                    Usar descrição como base
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const box = {
  width: "100%",
  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(30, 41, 59, 0.72))",
  border: "1px solid rgba(96, 165, 250, 0.16)",
  borderRadius: "16px",
  padding: "18px",
  display: "grid",
  gap: "14px",
  boxShadow: "0 16px 32px rgba(0,0,0,0.18)",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
};

const eyebrow = {
  margin: 0,
  color: "#93c5fd",
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const title = {
  margin: "6px 0 4px",
  fontSize: "22px",
};

const subtitle = {
  margin: 0,
  color: "#cbd5e1",
  lineHeight: "20px",
  fontSize: "13px",
};

const empty = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "13px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
};

const card = {
  background: "rgba(2, 6, 23, 0.42)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "14px",
  padding: "14px",
  display: "grid",
  gap: "10px",
};

const top = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  alignItems: "center",
};

const badgeId = {
  color: "#94a3b8",
  fontSize: "12px",
};

function badgeScore(classificacao: SugestaoMemoriaEditorial["classificacao"]) {
  const tema =
    classificacao === "Muito semelhante"
      ? { bg: "rgba(20,83,45,.74)", color: "#bbf7d0" }
      : classificacao === "Semelhante"
        ? { bg: "rgba(88,28,135,.74)", color: "#e9d5ff" }
        : { bg: "rgba(30,41,59,.82)", color: "#cbd5e1" };

  return {
    background: tema.bg,
    color: tema.color,
    borderRadius: "999px",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 700,
  };
}

const cardTitle = {
  fontSize: "15px",
  lineHeight: "20px",
};

const cardText = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "13px",
  lineHeight: "20px",
};

const meta = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "8px",
};

const pill = {
  background: "rgba(255,255,255,.06)",
  borderRadius: "999px",
  padding: "4px 8px",
  color: "#e2e8f0",
  fontSize: "11px",
};

const reasonList = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "8px",
};

const reasonPill = {
  background: "rgba(37,99,235,.14)",
  border: "1px solid rgba(96,165,250,.18)",
  borderRadius: "999px",
  padding: "4px 8px",
  color: "#dbeafe",
  fontSize: "11px",
};

const footer = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const metaSmall = {
  color: "#94a3b8",
  fontSize: "12px",
};

const actions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
  marginTop: "2px",
};

const actionBase = {
  borderRadius: "9px",
  padding: "10px 12px",
  fontSize: "12px",
  fontWeight: 700,
  textDecoration: "none",
};

const linkAction = {
  ...actionBase,
  background: "rgba(15,23,42,.82)",
  border: "1px solid rgba(148,163,184,.18)",
  color: "#fff",
};

const buttonAction = {
  ...actionBase,
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  border: "1px solid rgba(147,197,253,.2)",
  color: "#fff",
  cursor: "pointer",
};
