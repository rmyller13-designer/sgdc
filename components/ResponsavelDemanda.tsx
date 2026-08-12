"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { nomeDoUsuario, podeAtribuirResponsavel } from "@/lib/auth";
import { formatarListaResponsaveis } from "@/lib/demanda-responsaveis";
import { supabase } from "../lib/supabase";
import { corrigirTextoExibicao } from "@/lib/display-text";

type UsuarioResponsavel = {
  id: number;
  nome: string;
  funcao: string | null;
};

export default function ResponsavelDemanda({
  demandaId,
  responsavelAtual,
  responsaveisAtuais = [],
}: {
  demandaId: number;
  responsavelAtual?: string | null;
  responsaveisAtuais?: string[];
}) {
  const router = useRouter();
  const { usuario } = useAuth();
  const podeAtribuir = podeAtribuirResponsavel(usuario);
  const [usuarios, setUsuarios] = useState<UsuarioResponsavel[]>([]);
  const [responsaveisSelecionados, setResponsaveisSelecionados] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarUsuarios() {
      const { data } = await supabase
        .from("usuarios_comunicacao")
        .select("id, nome, funcao")
        .order("nome");

      if (!ativo) return;
      setUsuarios((data as UsuarioResponsavel[] | null) || []);
    }

    queueMicrotask(() => {
      void carregarUsuarios();
    });

    return () => {
      ativo = false;
    };
  }, []);

  const nomesAtuaisNormalizados = useMemo(
    () =>
      (responsaveisAtuais || []).map((item) =>
        corrigirTextoExibicao(item).trim().toLowerCase()
      ),
    [responsaveisAtuais]
  );

  useEffect(() => {
    if (usuarios.length === 0 || nomesAtuaisNormalizados.length === 0) return;

    const selecionados = usuarios
      .filter((item) =>
        nomesAtuaisNormalizados.includes(
          corrigirTextoExibicao(nomeDoUsuario(item.nome)).trim().toLowerCase()
        )
      )
      .map((item) => String(item.id));

    if (selecionados.length > 0) {
      setResponsaveisSelecionados((atual) =>
        atual.length > 0 ? atual : selecionados
      );
    }
  }, [usuarios, nomesAtuaisNormalizados]);

  async function atualizarResponsavel() {
    setMensagem("");

    if (!podeAtribuir || !usuario) {
      setMensagem("Seu usuario nao tem permissao para atribuir responsaveis.");
      return;
    }

    if (responsaveisSelecionados.length === 0) {
      setMensagem("Selecione ao menos um responsavel.");
      return;
    }

    setSalvando(true);

    try {
      const response = await fetch(`/api/demandas/${demandaId}/responsaveis`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            funcao: usuario.funcao,
            email: usuario.email,
          },
          responsaveisIds: responsaveisSelecionados.map(Number),
        }),
      });

      const resultado = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !resultado?.ok) {
        setMensagem(resultado?.error || "Nao foi possivel atualizar os responsaveis agora.");
        return;
      }

      setMensagem("Responsaveis atualizados com sucesso!");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  function alternarResponsavel(responsavelId: string) {
    setResponsaveisSelecionados((atual) => {
      if (atual.includes(responsavelId)) {
        return atual.filter((item) => item !== responsavelId);
      }

      return [...atual, responsavelId];
    });
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <p>
        <strong>Responsaveis atuais:</strong>{" "}
        {corrigirTextoExibicao(
          formatarListaResponsaveis(
            responsaveisAtuais,
            responsavelAtual || null
          )
        ) || "Nao definido"}
      </p>

      <div style={linha}>
        <div style={listaCheckboxes}>
          {usuarios.map((item) => (
            <label key={item.id} style={opcaoCheckbox}>
              <input
                type="checkbox"
                checked={responsaveisSelecionados.includes(String(item.id))}
                onChange={() => alternarResponsavel(String(item.id))}
                disabled={!podeAtribuir || salvando}
              />
              <span>
                {corrigirTextoExibicao(nomeDoUsuario(item.nome))} - {corrigirTextoExibicao(item.funcao)}
                {responsaveisSelecionados[0] === String(item.id) ? " (principal)" : ""}
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={atualizarResponsavel}
          style={botao}
          disabled={!podeAtribuir || salvando}
        >
          {salvando ? "Salvando..." : "Atualizar Responsaveis"}
        </button>
      </div>

      <p style={ajuda}>
        Marque os nomes desejados. O primeiro nome marcado fica como responsavel principal para compatibilidade com os pontos antigos do sistema.
      </p>

      {mensagem && <p>{mensagem}</p>}
    </div>
  );
}

const linha = {
  display: "flex",
  gap: "10px",
  marginTop: "8px",
  alignItems: "flex-start",
};

const listaCheckboxes = {
  display: "grid",
  gap: "8px",
  minWidth: "320px",
  maxHeight: "240px",
  overflowY: "auto" as const,
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#111827",
  color: "white",
};

const opcaoCheckbox = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
};

const botao = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "8px",
  cursor: "pointer",
};

const ajuda = {
  fontSize: "12px",
  color: "#94a3b8",
  marginTop: "8px",
};
