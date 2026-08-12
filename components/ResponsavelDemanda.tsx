"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { podeAtribuirResponsavel } from "@/lib/auth";
import {
  criarMapaResponsaveis,
  formatarListaResponsaveis,
  type DemandaResponsavelRow,
} from "@/lib/demanda-responsaveis";
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

  const carregarUsuarios = useCallback(async () => {
    const { data } = await supabase
      .from("usuarios_comunicacao")
      .select("id, nome, funcao")
      .order("nome");

    setUsuarios((data as UsuarioResponsavel[] | null) || []);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void carregarUsuarios();
    });
  }, [carregarUsuarios]);

  useEffect(() => {
    let ativo = true;

    async function carregarResponsaveisAtuais() {
      const { data } = await supabase
        .from("demanda_responsaveis")
        .select("demanda_id, usuario_id, principal, usuarios_comunicacao(id, nome, funcao)")
        .eq("demanda_id", demandaId)
        .order("principal", { ascending: false });

      if (!ativo) return;

      const mapa = criarMapaResponsaveis((data as DemandaResponsavelRow[] | null) || []);
      setResponsaveisSelecionados(
        (mapa.get(demandaId) || []).map((item) => String(item.id))
      );
    }

    queueMicrotask(() => {
      void carregarResponsaveisAtuais();
    });

    return () => {
      ativo = false;
    };
  }, [demandaId]);

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

    const usuariosSelecionados = usuarios.filter((item) =>
      responsaveisSelecionados.includes(String(item.id))
    );

    const registros = responsaveisSelecionados.map((responsavelId, index) => ({
      demanda_id: demandaId,
      usuario_id: Number(responsavelId),
      principal: index === 0,
    }));

    const { error: erroRemocao } = await supabase
      .from("demanda_responsaveis")
      .delete()
      .eq("demanda_id", demandaId);

    if (erroRemocao) {
      setMensagem("Nao foi possivel atualizar os responsaveis agora.");
      return;
    }

    const { error: erroInsercao } = await supabase
      .from("demanda_responsaveis")
      .insert(registros);

    if (erroInsercao) {
      setMensagem("Nao foi possivel atualizar os responsaveis agora.");
      return;
    }

    const { error: erroDemanda } = await supabase
      .from("demandas")
      .update({ responsavel_id: registros[0]?.usuario_id || null })
      .eq("id", demandaId)
      .select("id")
      .single();

    if (erroDemanda) {
      setMensagem(
        "Os responsaveis foram salvos, mas o responsavel principal nao foi sincronizado."
      );
      return;
    }

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaId,
      usuario_id: usuario.id,
      acao: `${usuario.nome} definiu os responsaveis da demanda para ${usuariosSelecionados
        .map((item) => item.nome)
        .filter(Boolean)
        .join(", ")}`,
    });

    setMensagem("Responsaveis atualizados com sucesso!");
    router.refresh();
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
        <select
          value={responsaveisSelecionados}
          onChange={(e) =>
            setResponsaveisSelecionados(
              Array.from(e.target.selectedOptions, (option) => option.value)
            )
          }
          style={campo}
          disabled={!podeAtribuir}
          multiple
          size={Math.min(Math.max(usuarios.length, 4), 8)}
        >
          {usuarios.map((item) => (
            <option key={item.id} value={item.id}>
              {corrigirTextoExibicao(item.nome)} - {corrigirTextoExibicao(item.funcao)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={atualizarResponsavel}
          style={botao}
          disabled={!podeAtribuir}
        >
          Atualizar Responsaveis
        </button>
      </div>

      <p style={ajuda}>
        Segure Ctrl para selecionar mais de um nome. O primeiro nome salvo fica como responsavel principal para compatibilidade com os pontos antigos do sistema.
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

const campo = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#111827",
  color: "white",
  minWidth: "280px",
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
