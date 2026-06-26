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
  ultimo_backup_erro: string | null;
};

type InfraBackup = {
  credenciaisGoogleOk: boolean;
  cronSecretOk: boolean;
};

export default function ConfiguracoesPage() {
  const { usuario } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [configuracao, setConfiguracao] = useState<ConfiguracaoBackup | null>(null);
  const [infra, setInfra] = useState<InfraBackup | null>(null);
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
        throw new Error(json.error || "Nao foi possivel carregar as configuracoes.");
      }

      setConfiguracao(json.configuracao);
      setInfra(json.infra);
      setAtivo(Boolean(json.configuracao?.ativo));
      setPastaPaiId(json.configuracao?.pasta_pai_id || "");
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Erro ao carregar dados.");
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
        throw new Error(json.error || "Nao foi possivel salvar as configuracoes.");
      }

      setConfiguracao(json.configuracao);
      setInfra(json.infra);
      setMensagem("Configuracoes salvas com sucesso.");
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Erro ao salvar.");
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
      setInfra(json.infra);
      setMensagem(
        `Acervo concluido. Pasta: ${json.resultado.pastaMensal}. Indice: ${json.resultado.arquivoIndice}.`
      );
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Erro ao gerar o acervo.");
    } finally {
      setExecutando(false);
    }
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
              Acervo mensal automatico do SGDC para uma pasta do Google Drive,
              com cada demanda organizada em sua propria pasta para a equipe consultar.
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
              placeholder="Cole aqui o ID da pasta mae do Drive"
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
            </div>

            {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
          </div>

          <div style={bloco}>
            <h2 style={subtitulo}>Status tecnico</h2>

            <div style={listaStatus}>
              <StatusLinha
                label="Credenciais do Google Drive"
                ok={infra?.credenciaisGoogleOk ?? false}
              />
              <StatusLinha
                label="Segredo do agendador (CRON_SECRET)"
                ok={infra?.cronSecretOk ?? false}
              />
              <StatusLinha
                label="Acervo automatico"
                ok={configuracao?.ativo ?? false}
              />
            </div>

            <div style={resumoBox}>
              <p style={resumoItem}>
                <strong>Ultima execucao:</strong>{" "}
                {configuracao?.ultimo_backup_em
                  ? new Date(configuracao.ultimo_backup_em).toLocaleString("pt-BR")
                  : "Ainda nao executado"}
              </p>
              <p style={resumoItem}>
                <strong>Status:</strong>{" "}
                {formatarStatus(configuracao?.ultimo_backup_status)}
              </p>
              <p style={resumoItem}>
                <strong>Arquivo principal:</strong>{" "}
                {configuracao?.ultimo_backup_arquivo || "Nenhum indice gerado ainda"}
              </p>
              {configuracao?.ultimo_backup_erro && (
                <p style={{ ...resumoItem, color: "#fecaca" }}>
                  <strong>Ultimo erro:</strong> {configuracao.ultimo_backup_erro}
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={instrucoes}>
          <h2 style={subtitulo}>O que precisa estar pronto na Vercel</h2>
          <ul style={lista}>
            <li>Variavel `GOOGLE_DRIVE_CLIENT_EMAIL`</li>
            <li>Variavel `GOOGLE_DRIVE_PRIVATE_KEY`</li>
            <li>Variavel `CRON_SECRET`</li>
            <li>Compartilhar a pasta do Drive com o email da service account</li>
          </ul>
          <p style={textoSuporte}>
            O sistema vai criar uma pasta mensal no formato `Backup_MES_ANO`,
            gerar um indice geral da producao e montar uma subpasta para cada
            demanda com resumo, informacoes editoriais e anexos.
          </p>
        </div>
      </div>
    </section>
  );
}

function StatusLinha({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div style={statusLinha}>
      <span>{label}</span>
      <strong style={{ color: ok ? "#86efac" : "#fca5a5" }}>
        {ok ? "OK" : "Pendente"}
      </strong>
    </div>
  );
}

function formatarStatus(status?: string | null) {
  if (!status) return "Nao executado";
  if (status === "sucesso") return "Sucesso";
  if (status === "erro") return "Erro";
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
  color: "#fecaca",
  lineHeight: 1.6,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
  gap: "18px",
};

const bloco = {
  background: "rgba(24, 24, 35, 0.78)",
  border: "1px solid rgba(252, 165, 165, 0.16)",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
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
  color: "#fee2e2",
  fontSize: "14px",
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid rgba(252,165,165,.18)",
  background: "rgba(15,23,42,.92)",
  color: "white",
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
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const botaoSecundario = {
  ...botaoPrimario,
  background: "rgba(15,23,42,.92)",
  border: "1px solid rgba(252,165,165,.22)",
  color: "#fee2e2",
};

const mensagemStyle = {
  marginTop: "14px",
  marginBottom: 0,
  color: "#bfdbfe",
};

const listaStatus = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "10px",
};

const statusLinha = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "12px 14px",
  borderRadius: "10px",
  background: "rgba(15,23,42,.68)",
  border: "1px solid rgba(148,163,184,.14)",
};

const resumoBox = {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "12px",
  background: "rgba(15,23,42,.52)",
  border: "1px solid rgba(148,163,184,.14)",
};

const resumoItem = {
  margin: "0 0 10px",
  lineHeight: 1.5,
};

const instrucoes = {
  ...bloco,
};

const lista = {
  marginTop: 0,
  marginBottom: "14px",
  paddingLeft: "18px",
  lineHeight: 1.8,
};
