"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { podeEditarDados } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type CampoEditando =
  | "titulo"
  | "descricao"
  | "setor_id"
  | "usuario_comunicacao_id"
  | "produto_id"
  | "prioridade_id"
  | "data_entrega";

type CampoAtual = CampoEditando | null;

type DemandaForm = Record<CampoEditando, string> & {
  criado_em: string;
};

type Opcao = {
  id: number;
  nome: string;
};

async function sincronizarSetores() {
  const response = await fetch("/api/setores/sync", {
    method: "POST",
  });

  if (!response.ok) {
    return [] as Opcao[];
  }

  const resultado = (await response.json()) as { data?: Opcao[] };
  return resultado.data || [];
}

async function sincronizarPrioridades() {
  const response = await fetch("/api/prioridades/sync", {
    method: "POST",
  });

  if (!response.ok) {
    return [] as Opcao[];
  }

  const resultado = (await response.json()) as { data?: Opcao[] };
  return resultado.data || [];
}

type DemandaRow = {
  titulo: string | null;
  descricao: string | null;
  setor_id: number | null;
  usuario_comunicacao_id: number | null;
  produto_id: number | null;
  prioridade_id: number | null;
  data_entrega: string | null;
  criado_em: string | null;
};

const formInicial: DemandaForm = {
  titulo: "",
  descricao: "",
  setor_id: "",
  usuario_comunicacao_id: "",
  produto_id: "",
  prioridade_id: "",
  data_entrega: "",
  criado_em: "",
};

export default function EditarDemandaInfo({ demandaId }: { demandaId: number }) {
  const router = useRouter();
  const { usuario } = useAuth();
  const podeEditar = podeEditarDados(usuario);
  const [editando, setEditando] = useState<CampoAtual>(null);
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState<CampoAtual>(null);

  const [setores, setSetores] = useState<Opcao[]>([]);
  const [usuarios, setUsuarios] = useState<Opcao[]>([]);
  const [produtos, setProdutos] = useState<Opcao[]>([]);
  const [prioridades, setPrioridades] = useState<Opcao[]>([]);

  const [form, setForm] = useState<DemandaForm>(formInicial);
  const [valoresSalvos, setValoresSalvos] = useState<DemandaForm>(formInicial);

  const carregarDados = useCallback(async () => {
    const [
      { data: demanda, error: demandaError },
      { data: setoresData },
      { data: usuariosData },
      { data: produtosData },
      { data: prioridadesData },
    ] = await Promise.all([
      supabase
        .from("demandas")
        .select(
          "titulo, descricao, setor_id, usuario_comunicacao_id, produto_id, prioridade_id, data_entrega, criado_em"
        )
        .eq("id", demandaId)
        .limit(1)
        .maybeSingle<DemandaRow>(),
      supabase.from("setores").select("id, nome").order("nome"),
      supabase.from("usuarios_comunicacao").select("id, nome").order("nome"),
      supabase.from("produtos").select("id, nome").order("nome"),
      supabase.from("prioridades").select("id, nome").order("ordem"),
    ]);

    if (demandaError) {
      setMensagem(`Erro ao carregar demanda: ${demandaError.message}`);
      return;
    }

    if (demanda) {
      const proximoForm = demandaParaForm(demanda);
      setForm(proximoForm);
      setValoresSalvos(proximoForm);
    }

    const listaSetores = (setoresData as Opcao[] | null) || [];
    const listaPrioridades = (prioridadesData as Opcao[] | null) || [];
    setSetores(
      listaSetores.length > 0 ? listaSetores : await sincronizarSetores()
    );
    setUsuarios((usuariosData as Opcao[] | null) || []);
    setProdutos((produtosData as Opcao[] | null) || []);
    setPrioridades(
      listaPrioridades.length > 0
        ? listaPrioridades
        : await sincronizarPrioridades()
    );
  }, [demandaId]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregarDados();
    });
  }, [carregarDados]);

  function atualizarCampo(campo: CampoEditando, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function cancelar(campo: CampoEditando) {
    setForm((atual) => ({ ...atual, [campo]: valoresSalvos[campo] }));
    setEditando(null);
    setMensagem("");
  }

  async function salvar(campo: CampoEditando) {
    setMensagem("");
    setSalvando(campo);

    if (!podeEditar || !usuario) {
      setMensagem("Seu usuário não tem permissão para editar a demanda.");
      setSalvando(null);
      return;
    }

    const valor = form[campo];
    const valorBanco = campo.endsWith("_id") ? (valor ? Number(valor) : null) : valor || null;

    const { error } = await supabase
      .from("demandas")
      .update({ [campo]: valorBanco })
      .eq("id", demandaId);

    if (error) {
      setMensagem(`Erro ao salvar: ${error.message}`);
      setSalvando(null);
      return;
    }

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaId,
      usuario_id: usuario.id,
      acao: `${usuario.nome} editou o campo ${rotulos[campo]}`,
    });

    await carregarDados();
    setEditando(null);
    setSalvando(null);
    setMensagem(`${rotulos[campo]} salvo com sucesso.`);
    router.refresh();
  }

  return (
    <div>
      <div style={sectionHeader}>
        <div>
          <p style={eyebrow}>Dados da solicitação</p>
          <h2 style={sectionTitle}>Informações principais</h2>
        </div>
      </div>

      <div style={grid}>
        <CampoTexto
          label="Título"
          campo="titulo"
          valor={form.titulo}
          editando={editando}
          salvando={salvando}
          setEditando={setEditando}
          podeEditar={podeEditar}
          onChange={atualizarCampo}
          onSalvar={salvar}
          onCancelar={cancelar}
        />

        <CampoTextoArea
          label="Descrição"
          campo="descricao"
          valor={form.descricao}
          editando={editando}
          salvando={salvando}
          setEditando={setEditando}
          podeEditar={podeEditar}
          onChange={atualizarCampo}
          onSalvar={salvar}
          onCancelar={cancelar}
        />

        <CampoSelect
          label="Setor"
          campo="setor_id"
          valor={form.setor_id}
          opcoes={setores}
          editando={editando}
          salvando={salvando}
          setEditando={setEditando}
          podeEditar={podeEditar}
          onChange={atualizarCampo}
          onSalvar={salvar}
          onCancelar={cancelar}
        />

        <CampoSelect
          label="Solicitante"
          campo="usuario_comunicacao_id"
          valor={form.usuario_comunicacao_id}
          opcoes={usuarios}
          editando={editando}
          salvando={salvando}
          setEditando={setEditando}
          podeEditar={podeEditar}
          onChange={atualizarCampo}
          onSalvar={salvar}
          onCancelar={cancelar}
        />

        <CampoSelect
          label="Produto inicial"
          campo="produto_id"
          valor={form.produto_id}
          opcoes={produtos}
          editando={editando}
          salvando={salvando}
          setEditando={setEditando}
          podeEditar={podeEditar}
          onChange={atualizarCampo}
          onSalvar={salvar}
          onCancelar={cancelar}
        />

        <CampoSelect
          label="Prioridade"
          campo="prioridade_id"
          valor={form.prioridade_id}
          opcoes={prioridades}
          editando={editando}
          salvando={salvando}
          setEditando={setEditando}
          podeEditar={podeEditar}
          onChange={atualizarCampo}
          onSalvar={salvar}
          onCancelar={cancelar}
        />

        <CampoData
          label="Data de entrega"
          campo="data_entrega"
          valor={form.data_entrega}
          editando={editando}
          salvando={salvando}
          setEditando={setEditando}
          podeEditar={podeEditar}
          onChange={atualizarCampo}
          onSalvar={salvar}
          onCancelar={cancelar}
        />

        <div style={infoBox}>
          <span style={labelStyle}>Criado em</span>
          <strong style={valorStyle}>
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

type CampoBaseProps = {
  label: string;
  campo: CampoEditando;
  valor: string;
  editando: CampoAtual;
  salvando: CampoAtual;
  setEditando: (campo: CampoAtual) => void;
  podeEditar: boolean;
  onChange: (campo: CampoEditando, valor: string) => void;
  onSalvar: (campo: CampoEditando) => Promise<void>;
  onCancelar: (campo: CampoEditando) => void;
};

function CampoTexto(props: CampoBaseProps) {
  const ativo = props.editando === props.campo;

  return (
    <div style={infoBox}>
      <LinhaTitulo
        label={props.label}
        campo={props.campo}
        setEditando={props.setEditando}
        ativo={ativo}
        podeEditar={props.podeEditar}
      />

      {ativo ? (
        <>
          <input
            value={props.valor}
            onChange={(e) => props.onChange(props.campo, e.target.value)}
            style={campoStyle}
          />
          <Botoes {...props} />
        </>
      ) : (
        <strong style={valorStyle}>{props.valor || "Não informado"}</strong>
      )}
    </div>
  );
}

function CampoTextoArea(props: CampoBaseProps) {
  const ativo = props.editando === props.campo;

  return (
    <div style={{ ...infoBox, gridColumn: "1 / -1" }}>
      <LinhaTitulo
        label={props.label}
        campo={props.campo}
        setEditando={props.setEditando}
        ativo={ativo}
        podeEditar={props.podeEditar}
      />

      {ativo ? (
        <>
          <textarea
            value={props.valor}
            onChange={(e) => props.onChange(props.campo, e.target.value)}
            rows={5}
            style={{ ...campoStyle, resize: "vertical", lineHeight: "22px" }}
          />
          <Botoes {...props} />
        </>
      ) : (
        <strong style={{ ...valorStyle, whiteSpace: "pre-wrap" }}>
          {props.valor || "Não informado"}
        </strong>
      )}
    </div>
  );
}

type CampoSelectProps = CampoBaseProps & {
  opcoes: Opcao[];
};

function CampoSelect(props: CampoSelectProps) {
  const ativo = props.editando === props.campo;
  const itemAtual = props.opcoes.find((item) => String(item.id) === String(props.valor));

  return (
    <div style={infoBox}>
      <LinhaTitulo
        label={props.label}
        campo={props.campo}
        setEditando={props.setEditando}
        ativo={ativo}
        podeEditar={props.podeEditar}
      />

      {ativo ? (
        <>
          <select
            value={props.valor}
            onChange={(e) => props.onChange(props.campo, e.target.value)}
            style={campoStyle}
          >
            <option value="">Não informado</option>
            {props.opcoes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
          <Botoes {...props} />
        </>
      ) : (
        <strong style={valorStyle}>{itemAtual?.nome || "Não informado"}</strong>
      )}
    </div>
  );
}

function CampoData(props: CampoBaseProps) {
  const ativo = props.editando === props.campo;

  return (
    <div style={infoBox}>
      <LinhaTitulo
        label={props.label}
        campo={props.campo}
        setEditando={props.setEditando}
        ativo={ativo}
        podeEditar={props.podeEditar}
      />

      {ativo ? (
        <>
          <input
            type="date"
            value={props.valor}
            onChange={(e) => props.onChange(props.campo, e.target.value)}
            style={campoStyle}
          />
          <Botoes {...props} />
        </>
      ) : (
        <strong style={valorStyle}>
          {props.valor ? formatarData(props.valor) : "Não informada"}
        </strong>
      )}
    </div>
  );
}

function LinhaTitulo({
  label,
  campo,
  setEditando,
  ativo,
  podeEditar,
}: {
  label: string;
  campo: CampoEditando;
  setEditando: (campo: CampoAtual) => void;
  ativo: boolean;
  podeEditar: boolean;
}) {
  return (
    <div style={linhaTitulo}>
      <span style={labelStyle}>{label}</span>
      {!ativo && podeEditar && (
        <button type="button" onClick={() => setEditando(campo)} style={botaoEditar}>
          Editar
        </button>
      )}
    </div>
  );
}

function Botoes({
  campo,
  salvando,
  onSalvar,
  onCancelar,
}: Pick<CampoBaseProps, "campo" | "salvando" | "onSalvar" | "onCancelar">) {
  const estaSalvando = salvando === campo;

  return (
    <div style={botoes}>
      <button
        type="button"
        onClick={() => void onSalvar(campo)}
        style={botaoSalvar}
        disabled={estaSalvando}
      >
        {estaSalvando ? "Salvando..." : "Salvar"}
      </button>
      <button
        type="button"
        onClick={() => onCancelar(campo)}
        style={botaoCancelar}
        disabled={estaSalvando}
      >
        Cancelar
      </button>
    </div>
  );
}

function demandaParaForm(demanda: DemandaRow): DemandaForm {
  return {
    titulo: demanda.titulo || "",
    descricao: demanda.descricao || "",
    setor_id: demanda.setor_id ? String(demanda.setor_id) : "",
    usuario_comunicacao_id: demanda.usuario_comunicacao_id
      ? String(demanda.usuario_comunicacao_id)
      : "",
    produto_id: demanda.produto_id ? String(demanda.produto_id) : "",
    prioridade_id: demanda.prioridade_id ? String(demanda.prioridade_id) : "",
    data_entrega: normalizarDataInput(demanda.data_entrega),
    criado_em: demanda.criado_em || "",
  };
}

function normalizarDataInput(data: string | null) {
  return data ? data.slice(0, 10) : "";
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

const rotulos: Record<CampoEditando, string> = {
  titulo: "Título",
  descricao: "Descrição",
  setor_id: "Setor",
  usuario_comunicacao_id: "Solicitante",
  produto_id: "Produto inicial",
  prioridade_id: "Prioridade",
  data_entrega: "Data de entrega",
};

const sectionHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "18px",
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#fecaca",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const sectionTitle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: "20px",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
};

const infoBox: CSSProperties = {
  background: "rgba(2, 6, 23, 0.35)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: "8px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  color: "#fecaca",
  minWidth: 0,
};

const linhaTitulo: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const labelStyle: CSSProperties = {
  color: "#fecaca",
  fontSize: "13px",
  fontWeight: 700,
};

const valorStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "15px",
  lineHeight: "22px",
  overflowWrap: "anywhere",
};

const campoStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(15, 23, 42, 0.9)",
  color: "white",
  border: "1px solid rgba(252, 165, 165, 0.28)",
  borderRadius: "8px",
  padding: "11px",
  outline: "none",
};

const botoes: CSSProperties = {
  display: "flex",
  gap: "8px",
  marginTop: "6px",
  flexWrap: "wrap",
};

const botaoEditar: CSSProperties = {
  background: "rgba(127, 29, 29, 0.65)",
  color: "#fee2e2",
  border: "1px solid rgba(252,165,165,.32)",
  padding: "6px 10px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};

const botaoSalvar: CSSProperties = {
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const botaoCancelar: CSSProperties = {
  background: "rgba(15, 23, 42, 0.85)",
  color: "#fee2e2",
  border: "1px solid rgba(252,165,165,.25)",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
};

const mensagemStyle: CSSProperties = {
  color: "#fecaca",
  marginBottom: 0,
};
