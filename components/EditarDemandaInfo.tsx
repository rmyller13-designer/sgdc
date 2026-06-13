"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type CampoEditando =
  | "titulo"
  | "descricao"
  | "setor_id"
  | "usuario_comunicacao_id"
  | "produto_id"
  | "prioridade_id"
  | "data_entrega"
  | null;

export default function EditarDemandaInfo({ demandaId }: { demandaId: number }) {
  const [editando, setEditando] = useState<CampoEditando>(null);
  const [mensagem, setMensagem] = useState("");

  const [setores, setSetores] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [prioridades, setPrioridades] = useState<any[]>([]);

  const [form, setForm] = useState<any>({
    titulo: "",
    descricao: "",
    setor_id: "",
    usuario_comunicacao_id: "",
    produto_id: "",
    prioridade_id: "",
    data_entrega: "",
    criado_em: "",
  });

  useEffect(() => {
    carregarDados();
  }, [demandaId]);

  async function carregarDados() {
    const { data: demanda } = await supabase
      .from("demandas")
      .select(
        "titulo, descricao, setor_id, usuario_comunicacao_id, produto_id, prioridade_id, data_entrega, criado_em"
      )
      .eq("id", demandaId)
      .single();

    const { data: setoresData } = await supabase
      .from("setores")
      .select("*")
      .order("nome");

    const { data: usuariosData } = await supabase
      .from("usuarios_comunicacao")
      .select("*")
      .order("nome");

    const { data: produtosData } = await supabase
      .from("produtos")
      .select("*")
      .order("nome");

    const { data: prioridadesData } = await supabase
      .from("prioridades")
      .select("*")
      .order("ordem");

    if (demanda) {
      setForm({
        titulo: demanda.titulo || "",
        descricao: demanda.descricao || "",
        setor_id: demanda.setor_id ? String(demanda.setor_id) : "",
        usuario_comunicacao_id: demanda.usuario_comunicacao_id
          ? String(demanda.usuario_comunicacao_id)
          : "",
        produto_id: demanda.produto_id ? String(demanda.produto_id) : "",
        prioridade_id: demanda.prioridade_id
          ? String(demanda.prioridade_id)
          : "",
        data_entrega: demanda.data_entrega || "",
        criado_em: demanda.criado_em || "",
      });
    }

    setSetores(setoresData || []);
    setUsuarios(usuariosData || []);
    setProdutos(produtosData || []);
    setPrioridades(prioridadesData || []);
  }

  async function salvar(campo: CampoEditando) {
    if (!campo) return;

    setMensagem("");

    const valor = form[campo];

    const { error } = await supabase
      .from("demandas")
      .update({
        [campo]:
          campo.includes("_id")
            ? valor
              ? Number(valor)
              : null
            : valor || null,
      })
      .eq("id", demandaId);

    if (error) {
      setMensagem("Erro ao salvar: " + error.message);
      return;
    }

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaId,
      usuario_id: 18,
      acao: `Roberto editou o campo ${campo}`,
    });

    setEditando(null);
    location.reload();
  }

  return (
    <div>
      <h2 style={sectionTitle}>Informações principais</h2>

      <div style={grid}>
        <CampoTexto
          label="Título"
          campo="titulo"
          valor={form.titulo}
          editando={editando}
          setEditando={setEditando}
          onChange={(v) => setForm({ ...form, titulo: v })}
          onSalvar={salvar}
        />

        <CampoTextoArea
          label="Descrição"
          campo="descricao"
          valor={form.descricao}
          editando={editando}
          setEditando={setEditando}
          onChange={(v) => setForm({ ...form, descricao: v })}
          onSalvar={salvar}
        />

        <CampoSelect
          label="Setor"
          campo="setor_id"
          valor={form.setor_id}
          opcoes={setores}
          editando={editando}
          setEditando={setEditando}
          onChange={(v) => setForm({ ...form, setor_id: v })}
          onSalvar={salvar}
        />

        <CampoSelect
          label="Solicitante"
          campo="usuario_comunicacao_id"
          valor={form.usuario_comunicacao_id}
          opcoes={usuarios}
          editando={editando}
          setEditando={setEditando}
          onChange={(v) => setForm({ ...form, usuario_comunicacao_id: v })}
          onSalvar={salvar}
        />

        <CampoSelect
          label="Produto inicial"
          campo="produto_id"
          valor={form.produto_id}
          opcoes={produtos}
          editando={editando}
          setEditando={setEditando}
          onChange={(v) => setForm({ ...form, produto_id: v })}
          onSalvar={salvar}
        />

        <CampoSelect
          label="Prioridade"
          campo="prioridade_id"
          valor={form.prioridade_id}
          opcoes={prioridades}
          editando={editando}
          setEditando={setEditando}
          onChange={(v) => setForm({ ...form, prioridade_id: v })}
          onSalvar={salvar}
        />

        <CampoData
          label="Data de entrega"
          campo="data_entrega"
          valor={form.data_entrega}
          editando={editando}
          setEditando={setEditando}
          onChange={(v) => setForm({ ...form, data_entrega: v })}
          onSalvar={salvar}
        />

        <div style={infoBox}>
          <span style={labelStyle}>Criado em</span>
          <strong>
            {form.criado_em
              ? new Date(form.criado_em).toLocaleString("pt-BR")
              : "Não informado"}
          </strong>
        </div>
      </div>

      {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
    </div>
  );
}

function CampoTexto(props: any) {
  const ativo = props.editando === props.campo;

  return (
    <div style={infoBox}>
      <LinhaTitulo label={props.label} campo={props.campo} setEditando={props.setEditando} />

      {ativo ? (
        <>
          <input
            value={props.valor}
            onChange={(e) => props.onChange(e.target.value)}
            style={campo}
          />
          <Botoes campo={props.campo} onSalvar={props.onSalvar} setEditando={props.setEditando} />
        </>
      ) : (
        <strong>{props.valor || "Não informado"}</strong>
      )}
    </div>
  );
}

function CampoTextoArea(props: any) {
  const ativo = props.editando === props.campo;

  return (
    <div style={{ ...infoBox, gridColumn: "1 / -1" }}>
      <LinhaTitulo label={props.label} campo={props.campo} setEditando={props.setEditando} />

      {ativo ? (
        <>
          <textarea
            value={props.valor}
            onChange={(e) => props.onChange(e.target.value)}
            rows={4}
            style={campo}
          />
          <Botoes campo={props.campo} onSalvar={props.onSalvar} setEditando={props.setEditando} />
        </>
      ) : (
        <strong>{props.valor || "Não informado"}</strong>
      )}
    </div>
  );
}

function CampoSelect(props: any) {
  const ativo = props.editando === props.campo;
  const itemAtual = props.opcoes.find((item: any) => String(item.id) === String(props.valor));

  return (
    <div style={infoBox}>
      <LinhaTitulo label={props.label} campo={props.campo} setEditando={props.setEditando} />

      {ativo ? (
        <>
          <select
            value={props.valor}
            onChange={(e) => props.onChange(e.target.value)}
            style={campo}
          >
            <option value="">Não informado</option>
            {props.opcoes.map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
          <Botoes campo={props.campo} onSalvar={props.onSalvar} setEditando={props.setEditando} />
        </>
      ) : (
        <strong>{itemAtual?.nome || "Não informado"}</strong>
      )}
    </div>
  );
}

function CampoData(props: any) {
  const ativo = props.editando === props.campo;

  return (
    <div style={infoBox}>
      <LinhaTitulo label={props.label} campo={props.campo} setEditando={props.setEditando} />

      {ativo ? (
        <>
          <input
            type="date"
            value={props.valor}
            onChange={(e) => props.onChange(e.target.value)}
            style={campo}
          />
          <Botoes campo={props.campo} onSalvar={props.onSalvar} setEditando={props.setEditando} />
        </>
      ) : (
        <strong>{props.valor ? formatarData(props.valor) : "Não informada"}</strong>
      )}
    </div>
  );
}

function LinhaTitulo({ label, campo, setEditando }: any) {
  return (
    <div style={linhaTitulo}>
      <span style={labelStyle}>{label}</span>
      <button type="button" onClick={() => setEditando(campo)} style={botaoEditar}>
        ✏️ Editar
      </button>
    </div>
  );
}

function Botoes({ campo, onSalvar, setEditando }: any) {
  return (
    <div style={botoes}>
      <button type="button" onClick={() => onSalvar(campo)} style={botaoSalvar}>
        Salvar
      </button>
      <button type="button" onClick={() => setEditando(null)} style={botaoCancelar}>
        Cancelar
      </button>
    </div>
  );
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

const sectionTitle = {
  marginTop: 0,
  marginBottom: "16px",
  fontSize: "18px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(240px, 1fr))",
  gap: "12px",
};

const infoBox = {
  background: "rgba(2, 6, 23, 0.35)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: "12px",
  padding: "14px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
  color: "#fecaca",
};

const linhaTitulo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const labelStyle = {
  color: "#fecaca",
  fontSize: "14px",
};

const campo = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "rgba(15, 23, 42, 0.85)",
  color: "white",
  border: "1px solid rgba(252, 165, 165, 0.22)",
  borderRadius: "10px",
  padding: "11px",
};

const botoes = {
  display: "flex",
  gap: "8px",
  marginTop: "6px",
};

const botaoEditar = {
  background: "rgba(15,23,42,.85)",
  color: "#fee2e2",
  border: "1px solid rgba(252,165,165,.25)",
  padding: "6px 9px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "12px",
};

const botaoSalvar = {
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botaoCancelar = {
  background: "rgba(127,29,29,.55)",
  color: "#fee2e2",
  border: "1px solid rgba(252,165,165,.25)",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
};

const mensagemStyle = {
  color: "#fecaca",
};