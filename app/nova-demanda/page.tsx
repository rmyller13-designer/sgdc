"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import RichTextEditor, {
  type RichTextEditorHandle,
} from "@/components/RichTextEditor";
import {
  autorizarGoogleTasks,
  criarTarefaGoogle,
} from "@/lib/google-calendar";
import { sanitizeRichText, stripRichText } from "@/lib/rich-text";
import {
  criarCaminhoAnexoDemanda,
  TIPOS_ACEITOS_UPLOAD,
  validarArquivoUpload,
} from "@/lib/storage-policy";
import { supabase } from "../../lib/supabase";
import { corrigirTextoExibicao, formatarTituloHumano } from "@/lib/display-text";

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

export default function NovaDemanda() {
  const router = useRouter();
  const { usuario } = useAuth();
  const inputArquivosRef = useRef<HTMLInputElement | null>(null);
  const descricaoEditorRef = useRef<RichTextEditorHandle | null>(null);
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
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [arrastandoArquivos, setArrastandoArquivos] = useState(false);
  const salvandoRef = useRef(false);

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
    const listaPrioridades = (prioridadesData as Opcao[] | null) || [];
    const setoresCarregados =
      listaSetores.length > 0 ? listaSetores : await sincronizarSetores();
    const prioridadesCarregadas =
      listaPrioridades.length > 0
        ? listaPrioridades
        : await sincronizarPrioridades();

    setSetores(setoresCarregados);
    setPrioridades(prioridadesCarregadas);
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

  function adicionarArquivos(lista: File[]) {
    setArquivos((atual) => {
      const mapa = new Map<string, File>();

      for (const arquivo of atual) {
        mapa.set(
          `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`,
          arquivo
        );
      }

      for (const arquivo of lista) {
        mapa.set(
          `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`,
          arquivo
        );
      }

      return Array.from(mapa.values());
    });
  }

  function removerArquivo(alvo: File) {
    setArquivos((atual) =>
      atual.filter(
        (arquivo) =>
          !(
            arquivo.name === alvo.name &&
            arquivo.size === alvo.size &&
            arquivo.lastModified === alvo.lastModified
          )
      )
    );
  }

  async function salvarDemanda() {
    if (salvandoRef.current) {
      return;
    }

    salvandoRef.current = true;
    setSalvando(true);
    setMensagem("");

    try {
      if (!titulo.trim() || !setorId || !prioridadeId || !usuarioId) {
        setMensagem("Preencha os campos obrigatórios.");
        return;
      }

      if (!usuario) {
        setMensagem("Faça login para salvar uma demanda.");
        return;
      }

      if (incluirGoogleAgenda && !dataEntrega) {
        setMensagem(
          "Informe a data de entrega para incluir como tarefa no Google Agenda."
        );
        return;
      }

      for (const arquivo of arquivos) {
        const erroArquivo = validarArquivoUpload(arquivo);

        if (erroArquivo) {
          setMensagem(erroArquivo);
          return;
        }
      }

      const descricaoAtual = descricaoEditorRef.current?.getHtml() || descricao;
      const descricaoSanitizada = sanitizeRichText(descricaoAtual);
      let googleAccessToken: string | undefined;

      if (incluirGoogleAgenda) {
        try {
          googleAccessToken = await autorizarGoogleTasks();
        } catch (error) {
          setMensagem(
            error instanceof Error
              ? "Nao foi possivel autorizar o Google Agenda."
              : "Não foi possível autorizar o Google Agenda."
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
          titulo: titulo.trim(),
          descricao: descricaoSanitizada || null,
          setor_id: Number(setorId),
          prioridade_id: Number(prioridadeId),
          usuario_comunicacao_id: Number(usuarioId),
          status_id: statusRecebido.id,
          data_entrega: dataEntrega || null,
        })
        .select()
        .single();

      if (erroDemanda) {
        setMensagem("Nao foi possivel salvar a demanda agora.");
        return;
      }

      await supabase.from("historico_demanda").insert({
        demanda_id: demandaCriada.id,
        usuario_id: usuario.id,
        acao: `${usuario.nome} criou a demanda`,
      });

      for (const arquivo of arquivos) {
        const caminhoArquivo = criarCaminhoAnexoDemanda(
          demandaCriada.id,
          arquivo
        );

        const { error: erroUpload } = await supabase.storage
          .from("demandas")
          .upload(caminhoArquivo, arquivo);

        if (erroUpload) {
          setMensagem(
            "Demanda salva, mas nao foi possivel enviar um dos anexos."
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
            "Arquivo enviado, mas nao foi possivel registrar o anexo."
          );
          return;
        }
      }

      if (incluirGoogleAgenda) {
        const demandaGoogle = {
          id: demandaCriada.id,
          titulo: titulo.trim(),
          descricao: stripRichText(descricaoSanitizada),
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
        } catch {
          setMensagem(
            "Demanda salva, mas nao foi possivel criar a tarefa no Google Agenda."
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
      setArquivos([]);

      const inputArquivo = document.getElementById(
        "arquivos"
      ) as HTMLInputElement | null;

      if (inputArquivo) {
        inputArquivo.value = "";
      }

      router.push("/demandas");
      router.refresh();
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  }

  return (
    <div style={page}>
      <div style={shell}>
        <form
          style={formCard}
          onSubmit={(event) => {
            event.preventDefault();
            void salvarDemanda();
          }}
        >
          <div style={cabecalhoForm}>
            <div>
              <p style={secaoMini}>Briefing inicial</p>
              <h2 style={secaoTitulo}>Informações da demanda</h2>
            </div>
            <div style={statusBox}>
              <span style={statusLabel}>Status inicial</span>
              <strong style={statusValor}>Recebido</strong>
            </div>
          </div>

          <div style={gridCampos}>
            <CampoBloco label="Título da Demanda">
              <input
                type="text"
                placeholder="Ex.: Campanha institucional de julho"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                style={campo}
              />
            </CampoBloco>

            <CampoBloco label="Solicitante">
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                style={campo}
              >
                <option value="">Selecione o solicitante</option>

                {usuarios.map((usuarioItem) => (
                  <option key={usuarioItem.id} value={usuarioItem.id}>
                    {corrigirTextoExibicao(usuarioItem.nome)} - {corrigirTextoExibicao(usuarioItem.funcao)}
                  </option>
                ))}
              </select>
            </CampoBloco>

            <CampoBloco label="Setor Solicitante">
              <select
                value={setorId}
                onChange={(e) => setSetorId(e.target.value)}
                style={campo}
              >
                <option value="">Selecione o setor</option>

                {setores.map((setor) => (
                  <option key={setor.id} value={setor.id}>
                    {corrigirTextoExibicao(setor.nome)}
                  </option>
                ))}
              </select>
            </CampoBloco>

            <CampoBloco label="Prioridade">
              <select
                value={prioridadeId}
                onChange={(e) => setPrioridadeId(e.target.value)}
                style={campo}
              >
                <option value="">Selecione a prioridade</option>

                {prioridades.map((prioridade) => (
                  <option key={prioridade.id} value={prioridade.id}>
                    {formatarTituloHumano(prioridade.nome)}
                  </option>
                ))}
              </select>
            </CampoBloco>

            <CampoBloco label="Data de Entrega">
              <input
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
                style={campo}
              />
            </CampoBloco>

            <CampoBloco label="Anexos">
              <input
                ref={inputArquivosRef}
                id="arquivos"
                type="file"
                multiple
                accept={TIPOS_ACEITOS_UPLOAD.join(",")}
                onChange={(e) => adicionarArquivos(Array.from(e.target.files || []))}
                style={inputArquivoOculto}
              />

              <button
                type="button"
                onClick={() => inputArquivosRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setArrastandoArquivos(true);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setArrastandoArquivos(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();

                  if (event.currentTarget === event.target) {
                    setArrastandoArquivos(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setArrastandoArquivos(false);
                  adicionarArquivos(Array.from(event.dataTransfer.files || []));
                }}
                style={dropzone(arrastandoArquivos)}
              >
                <span style={dropzoneIcon}>+</span>
                <span style={dropzoneTitle}>
                  Arraste arquivos aqui ou clique para selecionar
                </span>
                <span style={dropzoneText}>
                  Você pode anexar vários arquivos de uma vez.
                </span>
              </button>
            </CampoBloco>
          </div>

          <CampoBloco label="Descrição" fullWidth>
            <RichTextEditor
              ref={descricaoEditorRef}
              value={descricao}
              onChange={setDescricao}
              placeholder="Descreva a necessidade, contexto, objetivo, público e observações importantes"
            />
          </CampoBloco>

          <label style={checkboxBox}>
            <input
              type="checkbox"
              checked={incluirGoogleAgenda}
              onChange={(e) => setIncluirGoogleAgenda(e.target.checked)}
              style={checkbox}
            />
            <span>Também criar tarefa no Google Agenda</span>
          </label>

          {arquivos.length > 0 && (
            <div style={arquivosBox}>
              <strong style={arquivosTitulo}>
                Arquivos selecionados ({arquivos.length})
              </strong>

              <ul style={listaArquivos}>
                {arquivos.map((arquivo) => (
                  <li
                    key={`${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`}
                    style={arquivoItem}
                  >
                    <div style={arquivoInfo}>
                      <span style={arquivoNome}>{arquivo.name}</span>
                      <span style={arquivoMeta}>
                        {(arquivo.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removerArquivo(arquivo)}
                      style={arquivoRemover}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={rodapeForm}>
            <div style={aviso}>
              Eixos, destinos e produtos produzidos serão definidos após a criação da
              demanda.
            </div>

            <div style={acoes}>
              <button type="submit" style={botao} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar Demanda"}
              </button>
            </div>
          </div>

          {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
        </form>
      </div>
    </div>
  );
}

function CampoBloco({
  label,
  children,
  fullWidth,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <label style={fullWidth ? campoBlocoFull : campoBloco}>
      <span style={labelCampo}>{label}</span>
      {children}
    </label>
  );
}

const page = {
  display: "grid",
  gap: "0",
};

const shell = {
  display: "flex",
  justifyContent: "center",
  width: "100%",
};

const formCard = {
  width: "100%",
  maxWidth: "980px",
  background: "linear-gradient(180deg, rgba(28, 17, 32, 0.92), rgba(40, 16, 28, 0.92))",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "16px",
  padding: "clamp(18px, 3vw, 28px)",
  boxShadow: "0 24px 50px rgba(0,0,0,0.26)",
  display: "grid",
  gap: "18px",
};

const cabecalhoForm = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap" as const,
  paddingBottom: "18px",
  borderBottom: "1px solid rgba(252, 165, 165, 0.12)",
};

const secaoMini = {
  margin: 0,
  color: "#fca5a5",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const secaoTitulo = {
  margin: "6px 0 0",
  fontSize: "24px",
};

const statusBox = {
  minWidth: "150px",
  background: "rgba(15, 23, 42, 0.7)",
  border: "1px solid rgba(252, 165, 165, 0.14)",
  borderRadius: "12px",
  padding: "12px 14px",
  display: "grid",
  gap: "4px",
};

const statusLabel = {
  color: "#94a3b8",
  fontSize: "12px",
};

const statusValor = {
  color: "#fff",
  fontSize: "15px",
};

const gridCampos = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px",
};

const campoBloco = {
  display: "grid",
  gap: "8px",
};

const campoBlocoFull = {
  display: "grid",
  gap: "8px",
  gridColumn: "1 / -1",
};

const labelCampo = {
  color: "#fee2e2",
  fontSize: "13px",
  fontWeight: 700,
};

const campo = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  background: "#111827",
  color: "white",
};

const inputArquivoOculto = {
  display: "none",
};

const checkboxBox = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#e2e8f0",
  padding: "14px",
  borderRadius: "10px",
  fontSize: "14px",
  cursor: "pointer",
};

const checkbox = {
  width: "16px",
  height: "16px",
  accentColor: "#dc2626",
};

const botao = {
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "white",
  border: "none",
  padding: "14px 22px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const aviso = {
  background: "#0f172a",
  border: "1px solid #334155",
  color: "#cbd5e1",
  padding: "12px",
  borderRadius: "10px",
  fontSize: "14px",
};

const arquivosBox = {
  fontSize: "14px",
  color: "#cbd5e1",
  background: "rgba(15, 23, 42, 0.58)",
  border: "1px solid rgba(252, 165, 165, 0.12)",
  borderRadius: "10px",
  padding: "14px",
};

const arquivosTitulo = {
  display: "block",
  marginBottom: "10px",
};

const listaArquivos = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "10px",
};

const arquivoItem = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap" as const,
  background: "rgba(2, 6, 23, 0.45)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  borderRadius: "10px",
  padding: "10px 12px",
};

const arquivoInfo = {
  display: "grid",
  gap: "2px",
  minWidth: 0,
  flex: 1,
};

const arquivoNome = {
  color: "#f8fafc",
  overflowWrap: "anywhere" as const,
};

const arquivoMeta = {
  color: "#94a3b8",
  fontSize: "12px",
};

const arquivoRemover = {
  background: "rgba(127, 29, 29, 0.65)",
  color: "#fee2e2",
  border: "1px solid rgba(252,165,165,.25)",
  borderRadius: "8px",
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};

const rodapeForm = {
  display: "grid",
  gap: "14px",
};

const acoes = {
  display: "flex",
  justifyContent: "flex-end",
};

const mensagemStyle = {
  margin: 0,
  color: "#fecaca",
};

function dropzone(ativo: boolean) {
  return {
    width: "100%",
    minHeight: "132px",
    borderRadius: "12px",
    border: ativo
      ? "1px dashed rgba(248, 113, 113, 0.85)"
      : "1px dashed rgba(252, 165, 165, 0.26)",
    background: ativo
      ? "rgba(127, 29, 29, 0.28)"
      : "linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.82))",
    color: "white",
    padding: "18px",
    display: "grid",
    placeItems: "center",
    textAlign: "center" as const,
    gap: "8px",
    cursor: "pointer",
    transition: "border-color .18s ease, background .18s ease, transform .18s ease",
    transform: ativo ? "scale(1.01)" : "scale(1)",
  };
}

const dropzoneIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  background: "rgba(220, 38, 38, 0.2)",
  color: "#fecaca",
  fontSize: "24px",
  lineHeight: "24px",
};

const dropzoneTitle = {
  fontWeight: 700,
};

const dropzoneText = {
  color: "#cbd5e1",
  fontSize: "13px",
  lineHeight: "20px",
};
