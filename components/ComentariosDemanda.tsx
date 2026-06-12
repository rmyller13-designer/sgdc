"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Comentario = {
  id: number;
  comentario: string;
  criado_em: string;
};

export default function ComentariosDemanda({
  demandaId,
}: {
  demandaId: number;
}) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    carregarComentarios();
  }, []);

  async function carregarComentarios() {
    const { data } = await supabase
      .from("comentarios_demanda")
      .select("*")
      .eq("demanda_id", demandaId)
      .order("criado_em", { ascending: true });

    setComentarios(data || []);
  }

  async function enviarComentario() {
    if (!texto.trim()) return;

    const { error } = await supabase.from("comentarios_demanda").insert({
      demanda_id: demandaId,
      usuario_id: 18,
      comentario: texto,
    });

   if (!error) {
  await supabase.from("historico_demanda").insert({
    demanda_id: demandaId,
    usuario_id: 18,
    acao: "Roberto adicionou um comentário",
  });

  setTexto("");
  carregarComentarios();
}
  }

  return (
    <div style={{ marginTop: "30px" }}>
      <h2>Comentários</h2>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Digite um comentário..."
        style={campoTexto}
      />

      <button onClick={enviarComentario} style={botao}>
        Enviar Comentário
      </button>

      <div style={{ marginTop: "20px" }}>
        {comentarios.map((comentario) => (
          <div key={comentario.id} style={cardComentario}>
            <p>{comentario.comentario}</p>
            <small>{new Date(comentario.criado_em).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

const campoTexto = {
  width: "100%",
  minHeight: "80px",
  padding: "10px",
  background: "#111827",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "8px",
};

const botao = {
  marginTop: "10px",
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 20px",
  borderRadius: "8px",
  cursor: "pointer",
};

const cardComentario = {
  border: "1px solid #334155",
  padding: "10px",
  borderRadius: "8px",
  marginBottom: "10px",
};