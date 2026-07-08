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

export default function ConfiguracoesPage() {
  const { usuario } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [configuracao, setConfiguracao] = useState<ConfiguracaoBackup | null>(null);
  const [ativo, setAtivo] = useState(false);
  const [pastaPaiId, setPastaPaiId] = useState("");

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
        throw new Error(json.error || "Não foi possível carregar as configurações.");
      }

      setConfiguracao(json.configuracao);
      setAtivo(Boolean(json.configuracao?.ativo));
      setPastaPaiId(json.configuracao?.pasta_pai_id || "");
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados agora."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void carregarConfiguracao();
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
        throw new Error(json.error || "Não foi possível salvar as configurações.");
      }

      setConfiguracao(json.configuracao);
      setMensagem("Configurações salvas com sucesso.");
    } catch (error) {
      setMensagem(
        error instanceof Error ? error.message : "Não foi possível salvar agora."
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
        throw new Error(json.error || "Não foi possível gerar o acervo agora.");
      }

      setConfiguracao(json.configuracao);
      setMensagem(
        `Acervo concluído. Pasta: ${json.resultado.pastaMensal}. Foram gerados ${json.resultado.pdfsGerados} PDF(s).`
      );
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o acervo agora."
      );
    } finally {
      setExecutando(false);
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
          <h1 style={titulo}>Configurações</h1>
          <p style={textoSuporte}>
            Esta área está disponível apenas para quem gerencia o sistema.
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
            <h1 style={titulo}>Configurações</h1>
            <p style={textoSuporte}>
              Gerencie o acervo mensal do SGDC no Google Drive. O backup considera
              apenas demandas concluídas e, quando a função existir no fluxo, também
              as arquivadas.
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
              <span>Ativar criação automática no fim de cada mês</span>
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
                {salvando ? "Salvando..." : "Salvar configurações"}
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
                Abrir pasta do mês
              </button>
            </div>

            {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
          </div>

          <div style={bloco}>
            <h2 style={subtitulo}>Resumo do acervo</h2>

            <div style={resumoBox}>
              <p style={resumoItem}>
                <strong>Última execução:</strong>{" "}
                {configuracao?.ultimo_backup_em
                  ? new Date(configuracao.ultimo_backup_em).toLocaleString("pt-BR")
                  : "Ainda não executado"}
              </p>
              <p style={resumoItem}>
                <strong>Situação:</strong>{" "}
                {formatarStatus(configuracao?.ultimo_backup_status)}
              </p>
              <p style={resumoItem}>
                <strong>Arquivo principal:</strong>{" "}
                {configuracao?.ultimo_backup_arquivo || "Nenhum índice gerado ainda"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatarStatus(status?: string | null) {
  if (!status) return "Não executado";
  if (status === "sucesso") return "Sucesso";
  if (status === "erro") return "Falha";
  return status;
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
