"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  criarGoogleTaskTexto,
  criarGoogleTasksUrl,
  type GoogleCalendarDemanda,
} from "@/lib/google-calendar";

export default function GoogleTaskButton({
  demanda,
  children = "Adicionar ao Google Agenda",
  style,
}: {
  demanda: GoogleCalendarDemanda;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  if (!demanda.data_entrega) return null;

  async function abrirTarefa() {
    try {
      await navigator.clipboard.writeText(criarGoogleTaskTexto(demanda));
    } catch {
      // Ainda abrimos a tela de tarefas caso o navegador bloqueie a copia.
    }

    window.open(criarGoogleTasksUrl(), "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" onClick={abrirTarefa} style={style || botao}>
      {children}
    </button>
  );
}

const botao: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#bfdbfe",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
  padding: 0,
  textAlign: "left",
};
