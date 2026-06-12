"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function carregarHistorico() {
    const { data } = await supabase
      .from("historico_demanda")
      .select("*")
      .eq("demanda_id", demandaId)
      .order("criado_em", { ascending: false });

    setHistorico(data || []);
  }

  return (
    <div style={{ marginTop: "30px" }}>
      <h2>Histórico</h2>

      {historico.map((item) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #334155",
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "8px",
          }}
        >
          <p>{item.acao}</p>
          <small>
            {new Date(item.criado_em).toLocaleString()}
          </small>
        </div>
      ))}
    </div>
  );
}