"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import {
  criarTarefaGoogle,
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
  const [criando, setCriando] = useState(false);

  if (!demanda.data_entrega) return null;

  async function criarTarefa() {
    if (criando) return;

    setCriando(true);

    try {
      await criarTarefaGoogle(demanda);
      alert("Tarefa criada no Google Agenda.");
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Erro ao criar tarefa no Google Agenda.";

      alert(mensagem);
    } finally {
      setCriando(false);
    }
  }

  return (
    <button type="button" onClick={criarTarefa} disabled={criando} style={style || botao}>
      {criando ? "Criando tarefa..." : children}
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
