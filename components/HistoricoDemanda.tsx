"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Historico = {
  id: number;
  acao: string;
  criado_em: string;
};

export default function HistoricoDemanda({
  demandaId,
}: {
  demandaId: number;
}) {
  const [historico, setHistorico] = useState<Historico[]>([]);

  const carregarHistorico = useCallback(async () => {
    const { data } = await supabase
      .from("historico_demanda")
      .select("id, acao, criado_em")
      .eq("demanda_id", demandaId)
      .order("criado_em", { ascending: false });

    setHistorico((data || []) as Historico[]);
  }, [demandaId]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregarHistorico();
    });
  }, [carregarHistorico]);

  return (
    <div>
      <div style={header}>
        <h2 style={titulo}>Histórico</h2>
        <span style={contador}>{historico.length}</span>
      </div>

      {historico.length === 0 ? (
        <p style={vazio}>Nenhum registro ainda.</p>
      ) : (
        <div style={timeline} className="sg-scroll-y">
          {historico.map((item, index) => {
            const tipo = classificarAcao(item.acao);

            return (
              <div key={item.id} style={linhaTimeline}>
                <div style={marcadorArea}>
                  <span style={{ ...marcador, background: tipo.cor }}>
                    {tipo.sigla}
                  </span>
                  {index < historico.length - 1 && <span style={linha} />}
                </div>

                <div style={conteudo}>
                  <div style={cabecalho}>
                    <strong style={tipoTitulo}>{tipo.titulo}</strong>
                    <time style={dataTexto}>
                      {new Date(item.criado_em).toLocaleString("pt-BR")}
                    </time>
                  </div>
                  <p style={acaoTexto}>{item.acao}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function classificarAcao(acao: string) {
  const texto = acao.toLowerCase();

  if (texto.includes("coment")) {
    return { titulo: "Comentário", sigla: "C", cor: "#3b82f6" };
  }

  if (texto.includes("anex")) {
    return { titulo: "Anexo", sigla: "A", cor: "#8b5cf6" };
  }

  if (texto.includes("status") || texto.includes("moveu")) {
    return { titulo: "Status", sigla: "S", cor: "#f97316" };
  }

  if (texto.includes("checklist")) {
    return { titulo: "Checklist", sigla: "K", cor: "#22c55e" };
  }

  if (texto.includes("editou")) {
    return { titulo: "Edição", sigla: "E", cor: "#eab308" };
  }

  return { titulo: "Atividade", sigla: "H", cor: "#ef4444" };
}

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "14px",
};

const titulo = {
  margin: 0,
  fontSize: "18px",
};

const contador = {
  minWidth: "28px",
  height: "28px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,.08)",
  border: "1px solid rgba(255,255,255,.1)",
  color: "var(--sg-text-muted)",
  fontSize: "12px",
  fontWeight: 700,
};

const timeline = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "0",
  maxHeight: "520px",
  overflowY: "auto" as const,
  paddingRight: "4px",
};

const linhaTimeline = {
  display: "grid",
  gridTemplateColumns: "34px 1fr",
  gap: "10px",
};

const marcadorArea = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
};

const marcador = {
  width: "26px",
  height: "26px",
  borderRadius: "999px",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 800,
  boxShadow: "0 0 0 3px rgba(255,255,255,.08)",
};

const linha = {
  width: "1px",
  flex: 1,
  minHeight: "32px",
  background: "rgba(148,163,184,.22)",
};

const conteudo = {
  background: "rgba(2,6,23,.28)",
  border: "1px solid rgba(148,163,184,.16)",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "10px",
};

const cabecalho = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  alignItems: "center",
};

const tipoTitulo = {
  color: "var(--sg-text-primary)",
  fontSize: "13px",
};

const dataTexto = {
  color: "#94a3b8",
  fontSize: "11px",
  whiteSpace: "nowrap" as const,
};

const acaoTexto = {
  color: "#e5e7eb",
  margin: "8px 0 0",
  fontSize: "13px",
  lineHeight: "18px",
};

const vazio = {
  color: "#fecaca",
  margin: 0,
};
