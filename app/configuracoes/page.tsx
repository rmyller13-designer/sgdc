"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { temPermissao } from "@/lib/auth";

type ConfiguracaoBackup = {
  id: string;
  ativo: boolean;
  pasta_pai_id: string | null;
  ultimo_backup_em: string | null;
  ultimo_backup_status: string | null;
  ultimo_backup_arquivo: string | null;
};

type ConfiguracaoInstagram = {
  id: string;
  ativo: boolean;
  facebook_page_name: string | null;
  instagram_username: string | null;
  instagram_nome_exibicao: string | null;
  token_expira_em: string | null;
  ultimo_sync_em: string | null;
  ultimo_sync_status: string | null;
  ultimo_sync_resumo: string | null;
};

type StatusInstagram = {
  configuracao: ConfiguracaoInstagram;
  ambiente: {
    appConfigurado: boolean;
  };
  conexao: {
    conectado: boolean;
    paginaFacebook: string | null;
    contaInstagram: string | null;
    usuarioInstagram: string | null;
    expiraEm: string | null;
  };
};

export default function ConfiguracoesPage() {
  const { usuario } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [configuracao, setConfiguracao] = useState<ConfiguracaoBackup | null>(null);
  const [ativo, setAtivo] = useState(false);
  const [pastaPaiId, setPastaPaiId] = useState("");

  const [carregandoInstagram, setCarregandoInstagram] = useState(true);
  const [salvandoInstagram, setSalvandoInstagram] = useState(false);
  const [sincronizandoInstagram, setSincronizandoInstagram] = useState(false);
  const [desconectandoInstagram, setDesconectandoInstagram] = useState(false);
  const [mensagemInstagram, setMensagemInstagram] = useState(
    obterMensagemInstagramDaUrl
  );
  const [statusInstagram, setStatusInstagram] = useState<StatusInstagram | null>(null);
  const [instagramAtivo, setInstagramAtivo] = useState(false);

  const podeGerenciar = useMemo(
    () => temPermissao(usuario, ["admin", "coordenacao"]),
    [usuario]
  );

  async function carregarConfiguracao() {
    setCarregando(true);
    setMensagem("");

    try {
      const response = await fetch("/api/configuracoes/backup-google-drive", {
        cache: "no-store",
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Nao foi possivel carregar as configuracoes.");
      }

      setConfiguracao(json.configuracao);
      setAtivo(Boolean(json.configuracao?.ativo));
      setPastaPaiId(json.configuracao?.pasta_pai_id || "");
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar os dados agora."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function carregarInstagram(preservarMensagem = false) {
    setCarregandoInstagram(true);

    if (!preservarMensagem) {
      setMensagemInstagram("");
    }

    try {
      const response = await fetch("/api/configuracoes/instagram", {
        cache: "no-store",
      });
      const json = (await response.json()) as StatusInstagram & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          json.error || "Nao foi possivel carregar a integracao da Meta."
        );
      }

      setStatusInstagram(json);
      setInstagramAtivo(Boolean(json.configuracao?.ativo));
    } catch (error) {
      setMensagemInstagram(
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar a integracao da Meta agora."
      );
    } finally {
      setCarregandoInstagram(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void carregarConfiguracao();
      void carregarInstagram();
    });
  }, []);

  useEffect(() => {
    const status = obterStatusInstagramDaUrl();
    if (!status) return;

    window.history.replaceState({}, "", "/configuracoes");

    queueMicrotask(() => {
      void carregarInstagram(true);
    });
  }, []);

  async function salvarConfiguracao() {
    setSalvando(true);
    setMensagem("");

    try {
      const response = await fetch("/api/configuracoes/backup-google-drive", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ativo,
          pastaPaiId,
        }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Nao foi possivel salvar as configuracoes.");
      }

      setConfiguracao(json.configuracao);
      setMensagem("Configuracoes salvas com sucesso.");
    } catch (error) {
      setMensagem(
        error instanceof Error ? error.message : "Nao foi possivel salvar agora."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function executarBackupAgora() {
    setExecutando(true);
    setMensagem("");

    try {
      const response = await fetch("/api/configuracoes/backup-google-drive", {
        method: "POST",
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Nao foi possivel gerar o acervo agora.");
      }

      setConfiguracao(json.configuracao);
      setMensagem(
        `Acervo concluido. Pasta: ${json.resultado.pastaMensal}. Foram gerados ${json.resultado.pdfsGerados} PDF(s).`
      );
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar o acervo agora."
      );
    } finally {
      setExecutando(false);
    }
  }

  async function salvarInstagram() {
    setSalvandoInstagram(true);
    setMensagemInstagram("");

    try {
      const response = await fetch("/api/configuracoes/instagram", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ativo: instagramAtivo,
        }),
      });
      const json = (await response.json()) as StatusInstagram & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          json.error || "Nao foi possivel salvar a integracao da Meta."
        );
      }

      setStatusInstagram(json);
      setMensagemInstagram("Configuracoes da Meta salvas com sucesso.");
    } catch (error) {
      setMensagemInstagram(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar a integracao da Meta agora."
      );
    } finally {
      setSalvandoInstagram(false);
    }
  }

  function conectarInstagram() {
    setMensagemInstagram("");
    window.location.assign("/api/configuracoes/instagram/conectar");
  }

  async function sincronizarInstagramAgora() {
    setSincronizandoInstagram(true);
    setMensagemInstagram("");

    try {
      const response = await fetch("/api/configuracoes/instagram/sincronizar", {
        method: "POST",
      });
      const json = (await response.json()) as
        | (StatusInstagram & {
            error?: string;
            resultado?: {
              registrosAnalisados: number;
              registrosAtualizados: number;
              registrosSemCorrespondencia: number;
              linksInvalidos: number;
              erros: number;
            };
          })
        | { error?: string };

      if (!response.ok || !("resultado" in json)) {
        throw new Error(
          "error" in json && json.error
            ? json.error
            : "Nao foi possivel sincronizar Instagram e Facebook."
        );
      }

      setStatusInstagram(json);
      setMensagemInstagram(
        `Sincronizacao concluida. ${json.resultado?.registrosAtualizados || 0} registro(s) de Instagram e Facebook foram atualizados.`
      );
    } catch (error) {
      setMensagemInstagram(
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar Instagram e Facebook agora."
      );
    } finally {
      setSincronizandoInstagram(false);
    }
  }

  async function desconectarInstagram() {
    setDesconectandoInstagram(true);
    setMensagemInstagram("");

    try {
      const response = await fetch("/api/configuracoes/instagram", {
        method: "DELETE",
      });
      const json = (await response.json()) as StatusInstagram & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error || "Nao foi possivel desconectar a Meta.");
      }

      setStatusInstagram(json);
      setInstagramAtivo(false);
      setMensagemInstagram("Conexao Meta desconectada com sucesso.");
    } catch (error) {
      setMensagemInstagram(
        error instanceof Error
          ? error.message
          : "Nao foi possivel desconectar a Meta agora."
      );
    } finally {
      setDesconectandoInstagram(false);
    }
  }

  function abrirPastaDoMes() {
    window.open(
      "/api/configuracoes/backup-google-drive/pasta-mes",
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (!podeGerenciar) {
    return (
      <section style={pagina}>
        <div style={painel}>
          <h1 style={titulo}>Configuracoes</h1>
          <p style={textoSuporte}>
            Esta area esta disponivel apenas para quem gerencia o sistema.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={pagina}>
      <div style={painel}>
        <div style={cabecalho}>
          <div>
            <h1 style={titulo}>Configuracoes</h1>
            <p style={textoSuporte}>
              Gerencie o acervo mensal do SGDC no Google Drive e a sincronizacao
              de metricas do Instagram e do Facebook com o modulo de clipping.
            </p>
          </div>
        </div>

        <div style={grid}>
          <div style={bloco}>
            <h2 style={subtitulo}>Acervo mensal no Google Drive</h2>

            <label style={toggleLinha}>
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
              />
              <span>Ativar criacao automatica no fim de cada mes</span>
            </label>

            <label style={label}>ID da pasta principal no Google Drive</label>
            <input
              value={pastaPaiId}
              onChange={(e) => setPastaPaiId(e.target.value)}
              placeholder="Cole aqui o ID da pasta principal do Drive"
              style={input}
            />

            <div style={acoes}>
              <button
                type="button"
                onClick={salvarConfiguracao}
                disabled={salvando || carregando}
                style={botaoPrimario}
              >
                {salvando ? "Salvando..." : "Salvar configuracoes"}
              </button>

              <button
                type="button"
                onClick={executarBackupAgora}
                disabled={executando || carregando}
                style={botaoSecundario}
              >
                {executando ? "Executando..." : "Gerar acervo agora"}
              </button>

              <button
                type="button"
                onClick={abrirPastaDoMes}
                disabled={carregando}
                style={botaoTerciario}
              >
                Abrir pasta do mes
              </button>
            </div>

            {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
          </div>

          <div style={bloco}>
            <h2 style={subtitulo}>Resumo do acervo</h2>

            <div style={resumoBox}>
              <p style={resumoItem}>
                <strong>Ultima execucao:</strong>{" "}
                {configuracao?.ultimo_backup_em
                  ? new Date(configuracao.ultimo_backup_em).toLocaleString("pt-BR")
                  : "Ainda nao executado"}
              </p>
              <p style={resumoItem}>
                <strong>Situacao:</strong>{" "}
                {formatarStatus(configuracao?.ultimo_backup_status)}
              </p>
              <p style={resumoItem}>
                <strong>Arquivo principal:</strong>{" "}
                {configuracao?.ultimo_backup_arquivo || "Nenhum indice gerado ainda"}
              </p>
            </div>
          </div>
        </div>

        <div style={grid}>
          <div style={bloco}>
            <h2 style={subtitulo}>Meta da ASCOM</h2>

            <label style={toggleLinha}>
              <input
                type="checkbox"
                checked={instagramAtivo}
                onChange={(e) => setInstagramAtivo(e.target.checked)}
              />
              <span>Permitir sincronizacao das metricas do Instagram e do Facebook no clipping</span>
            </label>

            <div style={resumoBox}>
              <p style={resumoItem}>
                <strong>Conta conectada:</strong>{" "}
                {statusInstagram?.conexao.conectado
                  ? statusInstagram.conexao.contaInstagram ||
                    statusInstagram.conexao.usuarioInstagram ||
                    "Conta Meta conectada"
                  : "Nenhuma conta conectada"}
              </p>
              <p style={resumoItem}>
                <strong>Usuario:</strong>{" "}
                {statusInstagram?.conexao.usuarioInstagram
                  ? `@${statusInstagram.conexao.usuarioInstagram}`
                  : "Nao identificado"}
              </p>
              <p style={resumoItem}>
                <strong>Pagina vinculada:</strong>{" "}
                {statusInstagram?.conexao.paginaFacebook || "Nao identificada"}
              </p>
              <p style={resumoItem}>
                <strong>Token expira em:</strong>{" "}
                {statusInstagram?.conexao.expiraEm
                  ? new Date(statusInstagram.conexao.expiraEm).toLocaleString("pt-BR")
                  : "Nao informado"}
              </p>
            </div>

            <div style={acoes}>
              <button
                type="button"
                onClick={salvarInstagram}
                disabled={salvandoInstagram || carregandoInstagram}
                style={botaoPrimario}
              >
                {salvandoInstagram ? "Salvando..." : "Salvar integracao"}
              </button>

              <button
                type="button"
                onClick={conectarInstagram}
                disabled={carregandoInstagram || !statusInstagram?.ambiente.appConfigurado}
                style={botaoSecundario}
              >
                {statusInstagram?.conexao.conectado
                  ? "Reconectar conta"
                  : "Conectar Meta"}
              </button>

              <button
                type="button"
                onClick={sincronizarInstagramAgora}
                disabled={
                  sincronizandoInstagram ||
                  carregandoInstagram ||
                  !statusInstagram?.conexao.conectado
                }
                style={botaoTerciario}
              >
                {sincronizandoInstagram ? "Sincronizando..." : "Sincronizar metricas agora"}
              </button>

              <button
                type="button"
                onClick={desconectarInstagram}
                disabled={
                  desconectandoInstagram ||
                  carregandoInstagram ||
                  !statusInstagram?.conexao.conectado
                }
                style={botaoSecundario}
              >
                {desconectandoInstagram ? "Desconectando..." : "Desconectar"}
              </button>
            </div>

            {!statusInstagram?.ambiente.appConfigurado && (
              <p style={mensagemStyle}>
                Faltam as variaveis META_APP_ID e META_APP_SECRET na Vercel para ativar esta integracao.
              </p>
            )}

            {mensagemInstagram && <p style={mensagemStyle}>{mensagemInstagram}</p>}
          </div>

          <div style={bloco}>
            <h2 style={subtitulo}>Resumo da sincronizacao</h2>

            <div style={resumoBox}>
              <p style={resumoItem}>
                <strong>Ultima sincronizacao:</strong>{" "}
                {statusInstagram?.configuracao.ultimo_sync_em
                  ? new Date(statusInstagram.configuracao.ultimo_sync_em).toLocaleString("pt-BR")
                  : "Ainda nao executada"}
              </p>
              <p style={resumoItem}>
                <strong>Situacao:</strong>{" "}
                {formatarStatus(statusInstagram?.configuracao.ultimo_sync_status)}
              </p>
              <p style={resumoItem}>
                <strong>Resumo:</strong>{" "}
                {statusInstagram?.configuracao.ultimo_sync_resumo ||
                  "Nenhuma sincronizacao realizada ainda"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatarStatus(status?: string | null) {
  if (!status) return "Nao executado";
  if (status === "sucesso") return "Sucesso";
  if (status === "parcial") return "Parcial";
  if (status === "erro") return "Falha";
  if (status === "desconectado") return "Desconectado";
  return status;
}

function obterStatusInstagramDaUrl() {
  if (typeof window === "undefined") return "";

  return new URL(window.location.href).searchParams.get("instagram") || "";
}

function obterMensagemInstagramDaUrl() {
  const status = obterStatusInstagramDaUrl();

  const mensagens: Record<string, string> = {
    conectado:
      "Meta conectada com sucesso. Ja podemos sincronizar as metricas do Instagram e do Facebook no clipping.",
    acesso_negado: "A conexao com a Meta foi cancelada.",
    estado_invalido:
      "A validacao da conexao com a Meta falhou. Tente novamente.",
    falha_callback: "Nao foi possivel concluir a conexao com a Meta.",
    erro_config: "Faltam variaveis da Meta na Vercel para concluir a conexao.",
    erro_desconhecido: "Nao foi possivel iniciar a conexao com a Meta.",
  };

  return status
    ? mensagens[status] || "Ocorreu uma atualizacao na conexao com a Meta."
    : "";
}

const pagina = {
  width: "100%",
};

const painel = {
  maxWidth: "1120px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column" as const,
  gap: "18px",
};

const cabecalho = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
};

const titulo = {
  margin: 0,
  fontSize: "34px",
};

const textoSuporte = {
  margin: "8px 0 0",
  color: "var(--sg-text-secondary)",
  lineHeight: 1.6,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
  gap: "18px",
};

const bloco = {
  background: "var(--sg-panel-bg)",
  border: "1px solid var(--sg-border-strong)",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "var(--sg-shadow-card)",
};

const subtitulo = {
  marginTop: 0,
  marginBottom: "16px",
  fontSize: "20px",
};

const toggleLinha = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "16px",
};

const label = {
  display: "block",
  marginBottom: "8px",
  color: "var(--sg-text-secondary)",
  fontSize: "14px",
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid var(--sg-input-border)",
  background: "var(--sg-input-bg)",
  color: "var(--sg-text-primary)",
  marginBottom: "16px",
};

const acoes = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "10px",
};

const botaoPrimario = {
  border: "none",
  borderRadius: "10px",
  padding: "12px 16px",
  background: "var(--sg-button-primary-bg)",
  color: "var(--sg-button-primary-text)",
  fontWeight: 700,
  cursor: "pointer",
};

const botaoSecundario = {
  ...botaoPrimario,
  background: "var(--sg-button-neutral-bg)",
  border: "1px solid var(--sg-nav-chip-border)",
  color: "var(--sg-nav-chip-text)",
};

const botaoTerciario = {
  ...botaoPrimario,
  background: "rgba(34,197,94,.16)",
  border: "1px solid rgba(74,222,128,.22)",
  color: "#dcfce7",
};

const mensagemStyle = {
  marginTop: "14px",
  marginBottom: 0,
  color: "var(--sg-text-muted)",
  lineHeight: 1.55,
};

const resumoBox = {
  padding: "16px",
  borderRadius: "12px",
  background: "var(--sg-panel-bg-soft)",
  border: "1px solid var(--sg-border-soft)",
};

const resumoItem = {
  margin: "0 0 10px",
  lineHeight: 1.5,
};
