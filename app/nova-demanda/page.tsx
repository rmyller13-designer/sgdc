"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  autorizarGoogleTasks,
  criarTarefaGoogle,
} from "@/lib/google-calendar";
import {
  criarCaminhoAnexoDemanda,
  TIPOS_ACEITOS_UPLOAD,
  validarArquivoUpload,
} from "@/lib/storage-policy";
import { supabase } from "../../lib/supabase";

type Opcao = {
  id: number;
  nome: string;
  ordem?: number | null;
  funcao?: string | null;
  ativo?: boolean | null;
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

export default function NovaDemanda() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [setores, setSetores] = useState<Opcao[]>([]);
  const [prioridades, setPrioridades] = useState<Opcao[]>([]);
  const [usuarios, setUsuarios] = useState<Opcao[]>([]);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [setorId, setSetorId] = useState("");
  const [prioridadeId, setPrioridadeId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [incluirGoogleAgenda, setIncluirGoogleAgenda] = useState(false);
  const [arquivos, setArquivos] = useState<FileList | null>(null);
  const [mensagem, setMensagem] = useState("");

  const carregarDados = useCallback(async () => {
    const { data: setoresData } = await supabase
      .from("setores")
      .select("*")
      .order("nome");

    const { data: prioridadesData } = await supabase
      .from("prioridades")
      .select("*")
      .order("ordem");

    const { data: usuariosData } = await supabase
      .from("usuarios_comunicacao")
      .select("*")
      .order("nome");

    const listaUsuarios = (usuariosData as Opcao[] | null) || [];
    const listaSetores = (setoresData as Opcao[] | null) || [];
    const setoresCarregados =
      listaSetores.length > 0 ? listaSetores : await sincronizarSetores();

    setSetores(setoresCarregados);
    setPrioridades((prioridadesData as Opcao[] | null) || []);
    setUsuarios(listaUsuarios);

    if (usuario && listaUsuarios.some((item) => item.id === usuario.id)) {
      setUsuarioId((atual) => atual || String(usuario.id));
    }
  }, [usuario]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregarDados();
    });
  }, [carregarDados]);

  async function salvarDemanda() {
    setMensagem("");

    if (!titulo || !setorId || !prioridadeId || !usuarioId) {
      setMensagem("Preencha os campos obrigatórios.");
      return;
    }

    if (!usuario) {
      setMensagem("Faça login para salvar uma demanda.");
      return;
    }

    if (incluirGoogleAgenda && !dataEntrega) {
      setMensagem("Informe a data de entrega para incluir como tarefa no Google Agenda.");
      return;
    }

    let googleAccessToken: string | undefined;

    if (incluirGoogleAgenda) {
      try {
        googleAccessToken = await autorizarGoogleTasks();
      } catch (error) {
        setMensagem(
          error instanceof Error
            ? error.message
            : "Nao foi possivel autorizar o Google Agenda."
        );
        return;
      }
    }

    const { data: statusRecebido, error: erroStatus } = await supabase
      .from("status_demanda")
      .select("id")
      .eq("nome", "RECEBIDO")
      .single();

    if (erroStatus || !statusRecebido) {
      setMensagem("Erro ao localizar o status RECEBIDO.");
      return;
    }

    const { data: demandaCriada, error: erroDemanda } = await supabase
      .from("demandas")
      .insert({
        titulo,
        descricao,
        setor_id: Number(setorId),
        prioridade_id: Number(prioridadeId),
        usuario_comunicacao_id: Number(usuarioId),
        status_id: statusRecebido.id,
        data_entrega: dataEntrega || null,
      })
      .select()
      .single();

    if (erroDemanda) {
      setMensagem("Erro ao salvar demanda: " + erroDemanda.message);
      return;
    }

    await supabase.from("historico_demanda").insert({
      demanda_id: demandaCriada.id,
      usuario_id: usuario.id,
      acao: `${usuario.nome} criou a demanda`,
    });

    if (arquivos && arquivos.length > 0) {
      for (const arquivo of Array.from(arquivos)) {
        const erroArquivo = validarArquivoUpload(arquivo);

        if (erroArquivo) {
          setMensagem(erroArquivo);
          return;
        }

        const caminhoArquivo = criarCaminhoAnexoDemanda(
          demandaCriada.id,
          arquivo
        );

        const { error: erroUpload } = await supabase.storage
          .from("demandas")
          .upload(caminhoArquivo, arquivo);

        if (erroUpload) {
          setMensagem(
            "Demanda salva, mas erro ao enviar anexo: " + erroUpload.message
          );
          return;
        }

        const { data: urlPublica } = supabase.storage
          .from("demandas")
          .getPublicUrl(caminhoArquivo);

        const { error: erroAnexo } = await supabase
          .from("demanda_anexos")
          .insert({
            demanda_id: demandaCriada.id,
            nome_arquivo: arquivo.name,
            tipo_arquivo: arquivo.type,
            tamanho_arquivo: arquivo.size,
            url_arquivo: urlPublica.publicUrl,
            caminho_storage: caminhoArquivo,
          });

        if (erroAnexo) {
          setMensagem(
            "Arquivo enviado, mas erro ao salvar anexo: " + erroAnexo.message
          );
          return;
        }
      }
    }

    if (incluirGoogleAgenda) {
      const demandaGoogle = {
        id: demandaCriada.id,
        titulo,
        descricao,
        setor: setores.find((setor) => setor.id === Number(setorId))?.nome,
        prioridade: prioridades.find(
          (prioridade) => prioridade.id === Number(prioridadeId)
        )?.nome,
        responsavel: usuarios.find(
          (solicitante) => solicitante.id === Number(usuarioId)
        )?.nome,
        status: "RECEBIDO",
        data_entrega: dataEntrega,
      };

      try {
        await criarTarefaGoogle(demandaGoogle, googleAccessToken);
      } catch (error) {
        setMensagem(
          "Demanda salva, mas erro ao criar tarefa no Google Agenda: " +
            (error instanceof Error ? error.message : "")
        );
        return;
      }
    }

    setMensagem(
      incluirGoogleAgenda
        ? "Demanda salva com sucesso! Tarefa criada no Google Agenda."
        : "Demanda salva com sucesso! Agora abra a demanda para definir eixos, destinos e produtos produzidos."
    );

    setTitulo("");
    setDescricao("");
    setSetorId("");
    setPrioridadeId("");
    setUsuarioId("");
    setDataEntrega("");
    setIncluirGoogleAgenda(false);
    setArquivos(null);

    const inputArquivo = document.getElementById(
      "arquivos"
    ) as HTMLInputElement;

    if (inputArquivo) inputArquivo.value = "";

    router.push("/demandas");
    router.refresh();
  }

  return (
    <div>
      <h1>Nova Demanda</h1>

      <p style={textoAjuda}>
        Cadastre primeiro as informações principais. Depois, ao abrir a demanda,
        você poderá informar os eixos, destinos e produtos produzidos.
      </p>

      <form style={formStyle}>
        <input
          type="text"
          placeholder="Título da Demanda"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={campo}
        />

        <textarea
          placeholder="Descrição"
          rows={5}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          style={campo}
        />

        <select
          value={setorId}
          onChange={(e) => setSetorId(e.target.value)}
          style={campo}
        >
          <option value="">Setor Solicitante</option>

          {setores.map((setor) => (
            <option key={setor.id} value={setor.id}>
              {setor.nome}
            </option>
          ))}
        </select>

        <select
          value={prioridadeId}
          onChange={(e) => setPrioridadeId(e.target.value)}
          style={campo}
        >
          <option value="">Prioridade</option>

          {prioridades.map((prioridade) => (
            <option key={prioridade.id} value={prioridade.id}>
              {prioridade.nome}
            </option>
          ))}
        </select>

        <select
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          style={campo}
        >
          <option value="">Solicitante</option>

          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome} - {usuario.funcao}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dataEntrega}
          onChange={(e) => setDataEntrega(e.target.value)}
          style={campo}
        />

        <label style={checkboxBox}>
          <input
            type="checkbox"
            checked={incluirGoogleAgenda}
            onChange={(e) => setIncluirGoogleAgenda(e.target.checked)}
            style={checkbox}
          />
          <span>Deseja incluir demanda como tarefa no Google Agenda?</span>
        </label>

        <input
          id="arquivos"
          type="file"
          multiple
          accept={TIPOS_ACEITOS_UPLOAD.join(",")}
          onChange={(e) => setArquivos(e.target.files)}
          style={campo}
        />

        {arquivos && arquivos.length > 0 && (
          <div style={{ fontSize: "14px", color: "#cbd5e1" }}>
            <strong>Arquivos selecionados:</strong>

            <ul>
              {Array.from(arquivos).map((arquivo) => (
                <li key={arquivo.name}>{arquivo.name}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={aviso}>
          Eixos, destinos e produtos produzidos serão definidos após a criação da
          demanda.
        </div>

        <button type="button" onClick={salvarDemanda} style={botao}>
          Salvar Demanda
        </button>

        {mensagem && <p>{mensagem}</p>}
      </form>
    </div>
  );
}

const formStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "15px",
  maxWidth: "600px",
  marginTop: "20px",
};

const campo = {
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #444",
  background: "#111827",
  color: "white",
};

const checkboxBox = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#e2e8f0",
  padding: "12px",
  borderRadius: "8px",
  fontSize: "14px",
  cursor: "pointer",
};

const checkbox = {
  width: "16px",
  height: "16px",
  accentColor: "#dc2626",
};

const botao = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const textoAjuda = {
  color: "#94a3b8",
  maxWidth: "600px",
  marginTop: "8px",
};

const aviso = {
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#cbd5e1",
  padding: "12px",
  borderRadius: "8px",
  fontSize: "14px",
};
