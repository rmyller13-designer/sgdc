"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ClippingAnexosManager, {
  type ClippingAnexoItem,
} from "@/components/ClippingAnexosManager";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { corrigirTextoExibicao } from "@/lib/display-text";

type CanalClipping = "INSTAGRAM" | "FACEBOOK" | "SITE";
type SentimentoClipping = "POSITIVA" | "NEGATIVA" | "NEUTRA";
type StatusClipping = "EM_MONITORAMENTO" | "FECHADO" | "CRISE";

type ClippingRegistro = {
  id: number;
  titulo: string;
  canal: CanalClipping;
  sentimento: SentimentoClipping;
  status: StatusClipping;
  url: string | null;
  data_publicacao: string;
  autoria: string | null;
  views: number;
  comentarios: number;
  likes: number;
  compartilhamentos: number;
  salvos: number;
  engajamento: number;
  observacoes: string | null;
  criado_por_usuario_id: number | null;
  criado_por_nome: string | null;
  criado_em: string;
  atualizado_em: string;
};

type ResumoClipping = {
  total: number;
  positivas: number;
  neutras: number;
  negativas: number;
  emMonitoramento: number;
  fechados: number;
  crise: number;
  instagram: number;
  facebook: number;
  site: number;
  views: number;
  comentarios: number;
  likes: number;
  compartilhamentos: number;
  salvos: number;
  engajamento: number;
};

type ItemGrafico = {
  nome: string;
  valor: number;
  cor: string;
};

type CanalResumo = {
  nome: string;
  canal: CanalClipping;
  postagens: number;
  views: number;
  comentarios: number;
  likes: number;
  engajamento: number;
  cor: string;
};

type RankingItem = {
  titulo: string;
  valor: number;
};

type AlertaClipping = {
  id: number;
  titulo: string;
  canal: CanalClipping;
  sentimento: SentimentoClipping;
  status: StatusClipping;
  data_publicacao: string;
  engajamento: number;
};

type EvolucaoSentimento = {
  mes: string;
  positivas: number;
  neutras: number;
  negativas: number;
};

const CORES_SENTIMENTO: Record<SentimentoClipping, string> = {
  POSITIVA: "#22c55e",
  NEUTRA: "#f59e0b",
  NEGATIVA: "#ef4444",
};

const CORES_CANAIS: Record<CanalClipping, string> = {
  INSTAGRAM: "#8b5cf6",
  FACEBOOK: "#2563eb",
  SITE: "#3b82f6",
};

const FORMULARIO_INICIAL = {
  titulo: "",
  canal: "INSTAGRAM" as CanalClipping,
  sentimento: "POSITIVA" as SentimentoClipping,
  status: "EM_MONITORAMENTO" as StatusClipping,
  url: "",
  dataPublicacao: new Date().toISOString().slice(0, 10),
  autoria: "",
  views: "0",
  comentarios: "0",
  likes: "0",
  compartilhamentos: "0",
  salvos: "0",
  engajamento: "0",
  observacoes: "",
};

export default function ClippingClient() {
  const { usuario } = useAuth();
  const [registros, setRegistros] = useState<ClippingRegistro[]>([]);
  const [anexosPorRegistro, setAnexosPorRegistro] = useState<
    Record<number, ClippingAnexoItem[]>
  >({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [clippingSelecionadoId, setClippingSelecionadoId] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroCanal, setFiltroCanal] = useState<"TODOS" | CanalClipping>("TODOS");
  const [filtroSentimento, setFiltroSentimento] = useState<
    "TODOS" | SentimentoClipping
  >("TODOS");
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | StatusClipping>("TODOS");
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);

  useEffect(() => {
    void carregarRegistros();
  }, []);

  async function carregarRegistros(preservarMensagem = false) {
    setCarregando(true);
    if (!preservarMensagem) {
      setMensagem("");
    }

    const { data, error } = await supabase
      .from("clipping_registros")
      .select("*")
      .order("data_publicacao", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      setMensagem("Não foi possível carregar o clipping agora.");
      setRegistros([]);
      setAnexosPorRegistro({});
      setCarregando(false);
      return [];
    }

    const registrosNormalizados = ((data || []) as ClippingRegistro[]).map(
      normalizarRegistro
    );
    setRegistros(registrosNormalizados);

    if (registrosNormalizados.length === 0) {
      setAnexosPorRegistro({});
      setCarregando(false);
      return [];
    }

    const { data: anexosData, error: anexosError } = await supabase
      .from("clipping_anexos")
      .select("*")
      .in(
        "clipping_id",
        registrosNormalizados.map((item) => item.id)
      );

    if (anexosError) {
      setMensagem("Os registros foram carregados, mas os anexos falharam.");
      setAnexosPorRegistro({});
      setCarregando(false);
      return registrosNormalizados;
    }

    const mapaAnexos = ((anexosData || []) as ClippingAnexoItem[]).reduce<
      Record<number, ClippingAnexoItem[]>
    >((acc, item) => {
      if (!acc[item.clipping_id]) {
        acc[item.clipping_id] = [];
      }
      acc[item.clipping_id].push(item);
      return acc;
    }, {});

    setAnexosPorRegistro(mapaAnexos);
    setCarregando(false);
    return registrosNormalizados;
  }

  async function salvarRegistro() {
    setMensagem("");

    if (!formulario.titulo.trim()) {
      setMensagem("Informe o título da matéria.");
      return;
    }

    setSalvando(true);

    const payload = {
      id: editandoId,
      titulo: formulario.titulo.trim(),
      canal: formulario.canal,
      sentimento: formulario.sentimento,
      status: formulario.status,
      url: formulario.url.trim() || null,
      data_publicacao:
        formulario.dataPublicacao || new Date().toISOString().slice(0, 10),
      autoria: formulario.autoria.trim() || null,
      views: numeroSeguro(formulario.views),
      comentarios: numeroSeguro(formulario.comentarios),
      likes: numeroSeguro(formulario.likes),
      compartilhamentos: numeroSeguro(formulario.compartilhamentos),
      salvos: numeroSeguro(formulario.salvos),
      engajamento: numeroSeguro(formulario.engajamento),
      observacoes: formulario.observacoes.trim() || null,
      criado_por_usuario_id: usuario?.id ?? null,
      criado_por_nome: usuario?.nome ?? null,
    };

    const response = await fetch("/api/clipping", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        usuario: usuario
          ? {
              id: usuario.id,
              nome: usuario.nome,
              funcao: usuario.funcao,
              email: usuario.email,
            }
          : null,
      }),
    });

    const resultado = (await response.json()) as {
      ok?: boolean;
      id?: number;
      error?: string;
    };

    if (!response.ok || !resultado.ok) {
      setMensagem(
        traduzirErroClipping(
          editandoId
            ? "Não foi possível atualizar o registro de clipping."
            : "Não foi possível salvar o registro de clipping.",
          resultado.error
        )
      );
      setSalvando(false);
      return;
    }

    const registrosAtualizados = await carregarRegistros(true);
    const registroSalvo = editandoId
      ? registrosAtualizados.find((registro) => registro.id === editandoId) || null
      : registrosAtualizados.find((registro) => registro.id === resultado.id) ||
        registrosAtualizados.find(
            (registro) =>
              registro.titulo === payload.titulo &&
              registro.canal === payload.canal &&
              registro.data_publicacao === payload.data_publicacao &&
              (registro.criado_por_nome || null) === payload.criado_por_nome
          ) || registrosAtualizados[0] || null;

    setFormulario(FORMULARIO_INICIAL);
    setEditandoId(null);
    setClippingSelecionadoId(registroSalvo?.id ?? editandoId ?? null);
    setMensagem(
      editandoId
        ? "Registro de clipping atualizado com sucesso."
        : "Registro de clipping salvo com sucesso."
    );
    setSalvando(false);
  }

  function iniciarEdicao(registro: ClippingRegistro) {
    setEditandoId(registro.id);
    setMensagem("");
    setFormulario({
      titulo: registro.titulo,
      canal: registro.canal,
      sentimento: registro.sentimento,
      status: registro.status,
      url: registro.url || "",
      dataPublicacao: registro.data_publicacao || new Date().toISOString().slice(0, 10),
      autoria: registro.autoria || "",
      views: String(registro.views || 0),
      comentarios: String(registro.comentarios || 0),
      likes: String(registro.likes || 0),
      compartilhamentos: String(registro.compartilhamentos || 0),
      salvos: String(registro.salvos || 0),
      engajamento: String(registro.engajamento || 0),
      observacoes: registro.observacoes || "",
    });
    setClippingSelecionadoId(registro.id);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setFormulario(FORMULARIO_INICIAL);
    setMensagem("");
  }

  async function excluirRegistro(id: number, titulo: string) {
    const confirmou = window.confirm(
      `Deseja excluir o registro "${corrigirTextoExibicao(titulo)}"?`
    );

    if (!confirmou) return;

    setMensagem("");

    const response = await fetch(`/api/clipping/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usuario: usuario
          ? {
              nome: usuario.nome,
            }
          : null,
      }),
    });

    const resultado = (await response.json()) as {
      ok?: boolean;
      error?: string;
    };

    if (!response.ok || !resultado.ok) {
      setMensagem(resultado.error || "Não foi possível excluir este registro.");
      return;
    }

    if (clippingSelecionadoId === id) {
      setClippingSelecionadoId(null);
    }

    setMensagem("Registro removido com sucesso.");
    await carregarRegistros();
  }

  const periodo = useMemo(
    () => formatarPeriodo(filtroInicio, filtroFim),
    [filtroFim, filtroInicio]
  );

  const registrosFiltrados = useMemo(() => {
    return registros.filter((registro) => {
      const textoOk =
        !filtroTexto ||
        `${registro.titulo} ${registro.observacoes || ""} ${registro.autoria || ""}`
          .toLowerCase()
          .includes(filtroTexto.toLowerCase());
      const canalOk = filtroCanal === "TODOS" || registro.canal === filtroCanal;
      const sentimentoOk =
        filtroSentimento === "TODOS" || registro.sentimento === filtroSentimento;
      const statusOk = filtroStatus === "TODOS" || registro.status === filtroStatus;
      const inicioOk = !filtroInicio || registro.data_publicacao >= filtroInicio;
      const fimOk = !filtroFim || registro.data_publicacao <= filtroFim;

      return textoOk && canalOk && sentimentoOk && statusOk && inicioOk && fimOk;
    });
  }, [
    filtroCanal,
    filtroFim,
    filtroInicio,
    filtroSentimento,
    filtroStatus,
    filtroTexto,
    registros,
  ]);

  const resumo = useMemo<ResumoClipping>(() => {
    const base: ResumoClipping = {
      total: registrosFiltrados.length,
      positivas: 0,
      neutras: 0,
      negativas: 0,
      emMonitoramento: 0,
      fechados: 0,
      crise: 0,
      instagram: 0,
      facebook: 0,
      site: 0,
      views: 0,
      comentarios: 0,
      likes: 0,
      compartilhamentos: 0,
      salvos: 0,
      engajamento: 0,
    };

    for (const registro of registrosFiltrados) {
      if (registro.sentimento === "POSITIVA") base.positivas += 1;
      if (registro.sentimento === "NEUTRA") base.neutras += 1;
      if (registro.sentimento === "NEGATIVA") base.negativas += 1;
      if (registro.status === "EM_MONITORAMENTO") base.emMonitoramento += 1;
      if (registro.status === "FECHADO") base.fechados += 1;
      if (registro.status === "CRISE") base.crise += 1;
      if (registro.canal === "INSTAGRAM") base.instagram += 1;
      if (registro.canal === "FACEBOOK") base.facebook += 1;
      if (registro.canal === "SITE") base.site += 1;
      base.views += registro.views;
      base.comentarios += registro.comentarios;
      base.likes += registro.likes;
      base.compartilhamentos += registro.compartilhamentos;
      base.salvos += registro.salvos;
      base.engajamento += registro.engajamento;
    }

    return base;
  }, [registrosFiltrados]);

  const listasPorSentimento = useMemo(
    () => ({
      positivas: registrosFiltrados.filter((item) => item.sentimento === "POSITIVA"),
      neutras: registrosFiltrados.filter((item) => item.sentimento === "NEUTRA"),
      negativas: registrosFiltrados.filter((item) => item.sentimento === "NEGATIVA"),
    }),
    [registrosFiltrados]
  );

  const graficoSentimento = useMemo<ItemGrafico[]>(
    () => [
      { nome: "Positivas", valor: resumo.positivas, cor: CORES_SENTIMENTO.POSITIVA },
      { nome: "Neutras", valor: resumo.neutras, cor: CORES_SENTIMENTO.NEUTRA },
      { nome: "Negativas", valor: resumo.negativas, cor: CORES_SENTIMENTO.NEGATIVA },
    ],
    [resumo]
  );

  const graficoCanais = useMemo<CanalResumo[]>(
    () => [
      {
        nome: "Instagram",
        canal: "INSTAGRAM",
        postagens: resumo.instagram,
        views: somarPorCanal(registrosFiltrados, "INSTAGRAM", "views"),
        comentarios: somarPorCanal(registrosFiltrados, "INSTAGRAM", "comentarios"),
        likes: somarPorCanal(registrosFiltrados, "INSTAGRAM", "likes"),
        engajamento: somarPorCanal(registrosFiltrados, "INSTAGRAM", "engajamento"),
        cor: CORES_CANAIS.INSTAGRAM,
      },
      {
        nome: "Facebook",
        canal: "FACEBOOK",
        postagens: resumo.facebook,
        views: somarPorCanal(registrosFiltrados, "FACEBOOK", "views"),
        comentarios: somarPorCanal(registrosFiltrados, "FACEBOOK", "comentarios"),
        likes: somarPorCanal(registrosFiltrados, "FACEBOOK", "likes"),
        engajamento: somarPorCanal(registrosFiltrados, "FACEBOOK", "engajamento"),
        cor: CORES_CANAIS.FACEBOOK,
      },
      {
        nome: "Site",
        canal: "SITE",
        postagens: resumo.site,
        views: somarPorCanal(registrosFiltrados, "SITE", "views"),
        comentarios: somarPorCanal(registrosFiltrados, "SITE", "comentarios"),
        likes: somarPorCanal(registrosFiltrados, "SITE", "likes"),
        engajamento: somarPorCanal(registrosFiltrados, "SITE", "engajamento"),
        cor: CORES_CANAIS.SITE,
      },
    ],
    [registrosFiltrados, resumo.facebook, resumo.instagram, resumo.site]
  );

  const topMateriasEngajamento = useMemo(
    () =>
      [...registrosFiltrados]
        .sort(
          (a, b) =>
            b.engajamento - a.engajamento ||
            b.views - a.views ||
            a.titulo.localeCompare(b.titulo, "pt-BR")
        )
        .slice(0, 8),
    [registrosFiltrados]
  );

  const topMateriasViews = useMemo(
    () =>
      [...registrosFiltrados]
        .sort(
          (a, b) =>
            b.views - a.views ||
            b.engajamento - a.engajamento ||
            a.titulo.localeCompare(b.titulo, "pt-BR")
        )
        .slice(0, 8),
    [registrosFiltrados]
  );

  const rankingAutores = useMemo(
    () => agruparRanking(registrosFiltrados, (item) => item.autoria || "Não informado"),
    [registrosFiltrados]
  );

  const evolucaoMensalSentimento = useMemo(
    () => agruparEvolucaoSentimento(registrosFiltrados),
    [registrosFiltrados]
  );

  const taxaPositiva = useMemo(
    () => calcularPercentual(resumo.positivas, resumo.total),
    [resumo.positivas, resumo.total]
  );

  const taxaNegativa = useMemo(
    () => calcularPercentual(resumo.negativas, resumo.total),
    [resumo.negativas, resumo.total]
  );

  const taxaNeutra = useMemo(
    () => calcularPercentual(resumo.neutras, resumo.total),
    [resumo.neutras, resumo.total]
  );

  const taxaCrise = useMemo(
    () => calcularPercentual(resumo.crise, resumo.total),
    [resumo.crise, resumo.total]
  );

  const melhorCanal = useMemo(() => {
    return [...graficoCanais].sort(
      (a, b) =>
        b.engajamento - a.engajamento ||
        b.views - a.views ||
        b.postagens - a.postagens
    )[0];
  }, [graficoCanais]);

  const alertasSupervisor = useMemo<AlertaClipping[]>(
    () =>
      [...registrosFiltrados]
        .filter((item) => item.status === "CRISE" || item.sentimento === "NEGATIVA")
        .sort(
          (a, b) =>
            Number(b.status === "CRISE") - Number(a.status === "CRISE") ||
            b.engajamento - a.engajamento ||
            b.views - a.views
        )
        .slice(0, 6),
    [registrosFiltrados]
  );

  const registroSelecionado = useMemo(
    () => registros.find((item) => item.id === clippingSelecionadoId) || null,
    [clippingSelecionadoId, registros]
  );

  function exportarExcel() {
    const html = criarHtmlExcelClipping({
      periodo,
      resumo,
      taxaPositiva,
      taxaNeutra,
      taxaNegativa,
      melhorCanal: melhorCanal?.nome || "Não definido",
      canais: graficoCanais,
      topEngajamento: topMateriasEngajamento,
      topViews: topMateriasViews,
      rankingAutores,
      positivas: listasPorSentimento.positivas,
      neutras: listasPorSentimento.neutras,
      negativas: listasPorSentimento.negativas,
      registros: registrosFiltrados,
      evolucaoMensalSentimento,
    });

    baixarArquivo(
      new Blob(["\uFEFF" + html], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      }),
      `clipping-sgdc-${criarSufixoArquivo(filtroInicio, filtroFim)}.xls`
    );
  }

  function exportarPDF() {
    const popup = window.open("", "_blank", "width=1280,height=920");
    if (!popup) return;

    popup.document.write(
      criarHtmlPdfClipping({
        periodo,
        resumo,
        taxaPositiva,
        taxaNeutra,
        taxaNegativa,
        melhorCanal: melhorCanal?.nome || "Não definido",
        canais: graficoCanais,
        topEngajamento: topMateriasEngajamento,
        topViews: topMateriasViews,
        rankingAutores,
        positivas: listasPorSentimento.positivas,
        neutras: listasPorSentimento.neutras,
        negativas: listasPorSentimento.negativas,
        registros: registrosFiltrados,
        evolucaoMensalSentimento,
      })
    );
    popup.document.close();
    popup.focus();
    popup.onload = () => popup.print();
  }

  return (
    <section style={pagina}>
      <div style={cabecalho}>
        <div>
          <p style={eyebrow}>Monitoramento editorial</p>
          <h1 style={titulo}>Clipping</h1>
          <p style={descricao}>
            Acompanhe o tom das matérias e consolide os resultados de Instagram e
            Site sem misturar com os indicadores das demandas.
          </p>
        </div>

        <div style={botoesCabecalho}>
          <button type="button" onClick={exportarExcel} style={botaoPrimario}>
            Exportar Excel
          </button>
          <button type="button" onClick={exportarPDF} style={botaoSecundario}>
            Exportar PDF
          </button>
        </div>
      </div>

      <div style={filtros}>
        <input
          value={filtroTexto}
          onChange={(event) => setFiltroTexto(event.target.value)}
          placeholder="Buscar por título, veículo ou observação..."
          style={campoPesquisa}
        />

        <select
          value={filtroCanal}
          onChange={(event) =>
            setFiltroCanal(event.target.value as "TODOS" | CanalClipping)
          }
          style={campoCompacto}
        >
          <option value="TODOS">Todos os canais</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="FACEBOOK">Facebook</option>
          <option value="SITE">Site</option>
        </select>

        <select
          value={filtroSentimento}
          onChange={(event) =>
            setFiltroSentimento(event.target.value as "TODOS" | SentimentoClipping)
          }
          style={campoCompacto}
        >
          <option value="TODOS">Todos os tons</option>
          <option value="POSITIVA">Positivas</option>
          <option value="NEUTRA">Neutras</option>
          <option value="NEGATIVA">Negativas</option>
        </select>

        <select
          value={filtroStatus}
          onChange={(event) =>
            setFiltroStatus(event.target.value as "TODOS" | StatusClipping)
          }
          style={campoCompacto}
        >
          <option value="TODOS">Todos os status</option>
          <option value="EM_MONITORAMENTO">Em monitoramento</option>
          <option value="FECHADO">Fechado</option>
          <option value="CRISE">Crise</option>
        </select>

        <input
          type="date"
          value={filtroInicio}
          onChange={(event) => setFiltroInicio(event.target.value)}
          style={campoData}
        />

        <input
          type="date"
          value={filtroFim}
          onChange={(event) => setFiltroFim(event.target.value)}
          style={campoData}
        />

        <button
          type="button"
          onClick={() => {
            setFiltroTexto("");
            setFiltroCanal("TODOS");
            setFiltroSentimento("TODOS");
            setFiltroStatus("TODOS");
            setFiltroInicio("");
            setFiltroFim("");
          }}
          style={botaoSecundario}
        >
          Limpar
        </button>
      </div>

      <p style={periodoTexto}>Período analisado: {periodo}</p>

      <div style={cardsResumo}>
        <ResumoCard título="Matérias monitoradas" valor={resumo.total} />
        <ResumoCard título="Positivas" valor={resumo.positivas} cor="#22c55e" />
        <ResumoCard título="Neutras" valor={resumo.neutras} cor="#f59e0b" />
        <ResumoCard título="Negativas" valor={resumo.negativas} cor="#ef4444" />
        <ResumoCard
          título="Em monitoramento"
          valor={resumo.emMonitoramento}
          cor="#38bdf8"
        />
        <ResumoCard título="Fechados" valor={resumo.fechados} cor="#22c55e" />
        <ResumoCard título="Crise" valor={resumo.crise} cor="#ef4444" />
        <ResumoCard título="Instagram" valor={resumo.instagram} cor="#8b5cf6" />
        <ResumoCard título="Facebook" valor={resumo.facebook} cor="#2563eb" />
        <ResumoCard título="Site" valor={resumo.site} cor="#3b82f6" />
        <ResumoCard título="Views" valor={formatarNumero(resumo.views)} />
        <ResumoCard
          título="Engajamento"
          valor={formatarNumero(resumo.engajamento)}
        />
      </div>

      <div style={cardsExecutivos}>
        <ResumoCard
          título="Taxa positiva"
          valor={`${formatarPercentual(taxaPositiva)}%`}
          cor="#22c55e"
          destaque
        />
        <ResumoCard
          título="Taxa neutra"
          valor={`${formatarPercentual(taxaNeutra)}%`}
          cor="#f59e0b"
          destaque
        />
        <ResumoCard
          título="Taxa negativa"
          valor={`${formatarPercentual(taxaNegativa)}%`}
          cor="#ef4444"
          destaque
        />
        <ResumoCard
          título="Canal com melhor retorno"
          valor={melhorCanal?.nome || "Não definido"}
          cor={melhorCanal?.cor}
          destaque
        />
        <ResumoCard
          título="Taxa de crise"
          valor={`${formatarPercentual(taxaCrise)}%`}
          cor="#ef4444"
          destaque
        />
      </div>

      <div style={painelPrincipal}>
        <div style={painelFormulario}>
          <h2 style={subtitulo}>
            {editandoId ? "Editar registro de clipping" : "Novo registro de clipping"}
          </h2>

          <div style={gridFormulario}>
            <div style={campoBlocoGrande}>
              <label style={label}>Título da matéria</label>
              <input
                value={formulario.titulo}
                onChange={(event) =>
                  setFormulario((atual) => ({ ...atual, titulo: event.target.value }))
                }
                style={campo}
                placeholder="Ex.: Matéria sobre nova campanha institucional"
              />
            </div>

            <div style={campoBloco}>
              <label style={label}>Canal</label>
              <select
                value={formulario.canal}
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    canal: event.target.value as CanalClipping,
                  }))
                }
                style={campo}
              >
                <option value="INSTAGRAM">Instagram</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="SITE">Site</option>
              </select>
            </div>

            <div style={campoBloco}>
              <label style={label}>Tom da matéria</label>
              <select
                value={formulario.sentimento}
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    sentimento: event.target.value as SentimentoClipping,
                  }))
                }
                style={campo}
              >
                <option value="POSITIVA">Positiva</option>
                <option value="NEUTRA">Neutra</option>
                <option value="NEGATIVA">Negativa</option>
              </select>
            </div>

            <div style={campoBloco}>
              <label style={label}>Status do clipping</label>
              <select
                value={formulario.status}
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    status: event.target.value as StatusClipping,
                  }))
                }
                style={campo}
              >
                <option value="EM_MONITORAMENTO">Em monitoramento</option>
                <option value="FECHADO">Fechado</option>
                <option value="CRISE">Crise</option>
              </select>
            </div>

            <div style={campoBloco}>
              <label style={label}>Data da publicação</label>
              <input
                type="date"
                value={formulario.dataPublicacao}
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    dataPublicacao: event.target.value,
                  }))
                }
                style={campo}
              />
            </div>

            <div style={campoBlocoGrande}>
              <label style={label}>Link da publicação</label>
              <input
                value={formulario.url}
                onChange={(event) =>
                  setFormulario((atual) => ({ ...atual, url: event.target.value }))
                }
                style={campo}
                placeholder="https://..."
              />
            </div>

            <div style={campoBloco}>
              <label style={label}>Veículo</label>
              <input
                value={formulario.autoria}
                onChange={(event) =>
                  setFormulario((atual) => ({ ...atual, autoria: event.target.value }))
                }
                style={campo}
                placeholder="Ex.: Portal A Crítica"
              />
            </div>

            <MetricInput
              título="Views"
              valor={formulario.views}
              onChange={(valor) =>
                setFormulario((atual) => ({
                  ...atual,
                  views: valor,
                }))
              }
            />
            <MetricInput
              título="Comentários"
              valor={formulario.comentarios}
              onChange={(valor) =>
                setFormulario((atual) => ({
                  ...atual,
                  comentarios: valor,
                }))
              }
            />
            <MetricInput
              título="Likes"
              valor={formulario.likes}
              onChange={(valor) =>
                setFormulario((atual) => ({
                  ...atual,
                  likes: valor,
                }))
              }
            />
            <MetricInput
              título="Compartilhamentos"
              valor={formulario.compartilhamentos}
              onChange={(valor) =>
                setFormulario((atual) => ({
                  ...atual,
                  compartilhamentos: valor,
                }))
              }
            />
            <MetricInput
              título="Salvos"
              valor={formulario.salvos}
              onChange={(valor) =>
                setFormulario((atual) => ({
                  ...atual,
                  salvos: valor,
                }))
              }
            />
            <MetricInput
              título="Engajamento"
              valor={formulario.engajamento}
              onChange={(valor) =>
                setFormulario((atual) => ({
                  ...atual,
                  engajamento: valor,
                }))
              }
            />

            <div style={campoBlocoGrande}>
              <label style={label}>Observações</label>
              <textarea
                value={formulario.observacoes}
                onChange={(event) =>
                  setFormulario((atual) => ({
                    ...atual,
                    observacoes: event.target.value,
                  }))
                }
                style={textarea}
                placeholder="Resumo, leitura editorial, percepção do tom, contexto..."
              />
            </div>
          </div>

          <div style={acoesFormulario}>
            <button
              type="button"
              onClick={salvarRegistro}
              disabled={salvando}
              style={botaoPrimario}
            >
              {salvando
                ? "Salvando..."
                : editandoId
                  ? "Atualizar registro"
                  : "Salvar registro"}
            </button>

            <button
              type="button"
              onClick={editandoId ? cancelarEdicao : () => setFormulario(FORMULARIO_INICIAL)}
              style={botaoSecundario}
            >
              {editandoId ? "Cancelar edição" : "Limpar formulário"}
            </button>
          </div>
        </div>

        <div style={painelLateral}>
          <Painel título="Gestão 100% dentro do sistema">
            <div style={listaMetricas}>
              <p style={textoAuxiliar}>
                Todo o controle do clipping agora pode ser feito direto aqui na
                aplicação, sem depender de planilhas.
              </p>
              <div style={blocoOrientacao}>
                <strong style={orientacaoTitulo}>Como vamos usar:</strong>
                <span style={canalTexto}>1. Cadastrar nova matéria</span>
                <span style={canalTexto}>2. Editar qualquer registro já lançado</span>
                <span style={canalTexto}>3. Ajustar veículo, tom e métricas no próprio painel</span>
                <span style={canalTexto}>4. Excluir somente quando realmente precisar</span>
              </div>
              <div style={blocoOrientacao}>
                <strong style={orientacaoTitulo}>Registros ativos</strong>
                <span style={canalTexto}>
                  {formatarNumero(registrosFiltrados.length)} item(ns) no recorte atual
                </span>
                <span style={canalTexto}>
                  {formatarNumero(registros.length)} item(ns) no total
                </span>
              </div>
            </div>
          </Painel>

          <Painel título="Resumo por canal">
            <div style={listaMetricas}>
              {graficoCanais.map((item) => (
                <div key={item.nome} style={canalCard(item.cor)}>
                  <strong style={canalNome}>{item.nome}</strong>
                  <span style={canalTexto}>Postagens: {item.postagens}</span>
                  <span style={canalTexto}>Views: {formatarNumero(item.views)}</span>
                  <span style={canalTexto}>
                    Engajamento: {formatarNumero(item.engajamento)}
                  </span>
                </div>
              ))}
            </div>
          </Painel>

          <Painel título="Radar executivo do supervisor">
            <div style={listaMetricas}>
              <div style={blocoOrientacao}>
                <strong style={orientacaoTitulo}>Leitura rápida</strong>
                <span style={canalTexto}>Em monitoramento: {resumo.emMonitoramento}</span>
                <span style={canalTexto}>Fechados: {resumo.fechados}</span>
                <span style={canalTexto}>Crise: {resumo.crise}</span>
                <span style={canalTexto}>
                  Taxa de crise: {formatarPercentual(taxaCrise)}%
                </span>
              </div>

              <div style={blocoOrientacao}>
                <strong style={orientacaoTitulo}>Itens que pedem atenção</strong>
                {alertasSupervisor.length > 0 ? (
                  alertasSupervisor.map((item) => (
                    <div key={item.id} style={alertaItem(item.status)}>
                      <span style={alertaTitulo}>
                        {corrigirTextoExibicao(item.titulo)}
                      </span>
                      <span style={alertaMeta}>
                        {formatarStatusClipping(item.status)} |{" "}
                        {formatarSentimento(item.sentimento)} |{" "}
                        {formatarCanal(item.canal)}
                      </span>
                      <span style={alertaMeta}>
                        {formatarData(item.data_publicacao)} | Engajamento:{" "}
                        {formatarNumero(item.engajamento)}
                      </span>
                    </div>
                  ))
                ) : (
                  <span style={canalTexto}>Nenhum alerta crítico no recorte atual.</span>
                )}
              </div>
            </div>
          </Painel>
        </div>
      </div>

      {mensagem && <p style={mensagemStyle}>{corrigirTextoExibicao(mensagem)}</p>}

      {registroSelecionado ? (
        <ClippingAnexosManager
          clippingId={registroSelecionado.id}
          titulo={registroSelecionado.titulo}
          anexos={anexosPorRegistro[registroSelecionado.id] || []}
          onAtualizar={async () => {
            await carregarRegistros(true);
          }}
        />
      ) : null}

      <div style={gradeGraficos}>
        <Painel título="Tonalidade das matérias">
          <div style={graficoAltura}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={graficoSentimento}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius={48}
                  outerRadius={84}
                  paddingAngle={2}
                >
                  {graficoSentimento.map((item) => (
                    <Cell key={item.nome} fill={item.cor} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Painel>

        <Painel título="Evolução mensal do sentimento">
          <div style={graficoAlturaBaixa}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolucaoMensalSentimento}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                <XAxis dataKey="mes" stroke="var(--sg-text-secondary)" />
                <YAxis allowDecimals={false} stroke="var(--sg-text-secondary)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="positivas" name="Positivas" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="neutras" name="Neutras" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="negativas" name="Negativas" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Painel>
      </div>

      <div style={gradeGraficos}>
        <Painel título="Quantitativo por tom">
          <div style={graficoAlturaBaixa}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graficoSentimento} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                <XAxis dataKey="nome" stroke="var(--sg-text-secondary)" />
                <YAxis allowDecimals={false} stroke="var(--sg-text-secondary)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                  {graficoSentimento.map((item) => (
                    <Cell key={item.nome} fill={item.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Painel>

        <Painel título="Instagram e Site">
          <div style={graficoAlturaBaixa}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graficoCanais} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                <XAxis dataKey="nome" stroke="var(--sg-text-secondary)" />
                <YAxis allowDecimals={false} stroke="var(--sg-text-secondary)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="postagens"
                  name="Postagens"
                  fill="#ef4444"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="engajamento"
                  name="Engajamento"
                  fill="#22c55e"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Painel>
      </div>

      <div style={gradeGraficos}>
        <Painel título="Top matérias por engajamento">
          <RankingMaterias
            registros={topMateriasEngajamento}
            métrica="engajamento"
            vazio="Nenhuma matéria com engajamento registrado."
          />
        </Painel>

        <Painel título="Top matérias por views">
          <RankingMaterias
            registros={topMateriasViews}
            métrica="views"
            vazio="Nenhuma matéria com views registradas."
          />
        </Painel>
      </div>

      <div style={gradeGraficos}>
        <Painel título="Ranking por veículo">
          <RankingLista
            itens={rankingAutores}
            vazio="Nenhum veículo informado até agora."
          />
        </Painel>
      </div>

      <div style={gradeSentimentos}>
        <ListaMaterias
          título={`Matérias positivas (${listasPorSentimento.positivas.length})`}
          registros={listasPorSentimento.positivas}
          cor="#22c55e"
        />
        <ListaMaterias
          título={`Matérias neutras (${listasPorSentimento.neutras.length})`}
          registros={listasPorSentimento.neutras}
          cor="#f59e0b"
        />
        <ListaMaterias
          título={`Matérias negativas (${listasPorSentimento.negativas.length})`}
          registros={listasPorSentimento.negativas}
          cor="#ef4444"
        />
      </div>

      <Painel título="Registros do clipping">
        {carregando ? (
          <p style={textoAuxiliar}>Carregando registros...</p>
        ) : registrosFiltrados.length === 0 ? (
          <p style={textoAuxiliar}>Nenhum registro encontrado com os filtros atuais.</p>
        ) : (
          <div style={tabelaWrapper}>
            <table style={tabela}>
              <thead>
                <tr>
                  <th style={th}>Matéria</th>
                  <th style={th}>Canal</th>
                  <th style={th}>Tom</th>
                  <th style={th}>Status</th>
                  <th style={th}>Veículo</th>
                  <th style={th}>Data</th>
                  <th style={th}>Views</th>
                  <th style={th}>Likes</th>
                  <th style={th}>Comentários</th>
                  <th style={th}>Engajamento</th>
                  <th style={th}>Anexos</th>
                  <th style={th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((registro) => (
                  <tr key={registro.id}>
                    <td style={tdTitulo}>
                      <strong>{corrigirTextoExibicao(registro.titulo)}</strong>
                      <span style={tdMeta}>
                        {registro.url ? (
                          <a
                            href={registro.url}
                            target="_blank"
                            rel="noreferrer"
                            style={linkTabela}
                          >
                            Abrir publicação
                          </a>
                        ) : (
                          "Sem link informado"
                        )}
                      </span>
                    </td>
                    <td style={td}>{formatarCanal(registro.canal)}</td>
                    <td style={td}>
                      <span style={pillSentimento(registro.sentimento)}>
                        {formatarSentimento(registro.sentimento)}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={pillStatusClipping(registro.status)}>
                        {formatarStatusClipping(registro.status)}
                      </span>
                    </td>
                    <td style={td}>{registro.autoria || "Não informado"}</td>
                    <td style={td}>{formatarData(registro.data_publicacao)}</td>
                    <td style={td}>{formatarNumero(registro.views)}</td>
                    <td style={td}>{formatarNumero(registro.likes)}</td>
                    <td style={td}>{formatarNumero(registro.comentarios)}</td>
                    <td style={td}>{formatarNumero(registro.engajamento)}</td>
                    <td style={td}>{anexosPorRegistro[registro.id]?.length || 0}</td>
                    <td style={tdAcoes}>
                      <button
                        type="button"
                        onClick={() => setClippingSelecionadoId(registro.id)}
                        style={botaoEditar}
                      >
                        Anexos
                      </button>
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(registro)}
                        style={botaoEditar}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirRegistro(registro.id, registro.titulo)}
                        style={botaoExcluir}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Painel>
    </section>
  );
}

function MetricInput({
  título,
  valor,
  onChange,
}: {
  título: string;
  valor: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div style={campoBloco}>
      <label style={label}>{título}</label>
      <input
        type="number"
        min="0"
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        style={campo}
      />
    </div>
  );
}

function Painel({
  título,
  children,
}: {
  título: string;
  children: React.ReactNode;
}) {
  return (
    <section style={painel}>
      <h2 style={subtitulo}>{título}</h2>
      {children}
    </section>
  );
}

function ResumoCard({
  título,
  valor,
  cor,
  destaque,
}: {
  título: string;
  valor: number | string;
  cor?: string;
  destaque?: boolean;
}) {
  return (
    <article style={resumoCard(cor, destaque)}>
      <span style={resumoTitulo}>{título}</span>
      <strong style={resumoValor}>{valor}</strong>
    </article>
  );
}

function ListaMaterias({
  título,
  registros,
  cor,
}: {
  título: string;
  registros: ClippingRegistro[];
  cor: string;
}) {
  return (
    <section style={listaSentimento(cor)}>
      <h2 style={subtitulo}>{título}</h2>
      {registros.length === 0 ? (
        <p style={textoAuxiliar}>Nenhuma matéria nesta classificação.</p>
      ) : (
        <div style={listaItens}>
          {registros.map((registro) => (
            <article key={registro.id} style={itemLista}>
              <strong style={itemListaTitulo}>
                {corrigirTextoExibicao(registro.titulo)}
              </strong>
              <span style={itemListaMeta}>
                {formatarCanal(registro.canal)} • {formatarData(registro.data_publicacao)}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RankingMaterias({
  registros,
  métrica,
  vazio,
}: {
  registros: ClippingRegistro[];
  métrica: "engajamento" | "views";
  vazio: string;
}) {
  if (registros.length === 0) {
    return <p style={textoAuxiliar}>{vazio}</p>;
  }

  return (
    <div style={rankingLista}>
      {registros.map((registro, index) => (
        <div key={registro.id} style={rankingLinha}>
          <span style={rankingPosicao}>{index + 1}</span>
          <div style={rankingTexto}>
            <strong>{corrigirTextoExibicao(registro.titulo)}</strong>
            <span style={rankingMeta}>
              {formatarCanal(registro.canal)} • {formatarData(registro.data_publicacao)}
            </span>
          </div>
          <strong style={rankingValor}>
            {formatarNumero(registro[métrica])}
          </strong>
        </div>
      ))}
    </div>
  );
}

function RankingLista({
  itens,
  vazio,
}: {
  itens: RankingItem[];
  vazio: string;
}) {
  if (itens.length === 0) {
    return <p style={textoAuxiliar}>{vazio}</p>;
  }

  return (
    <div style={rankingLista}>
      {itens.slice(0, 10).map((item, index) => (
        <div key={`${item.titulo}-${index}`} style={rankingLinha}>
          <span style={rankingPosicao}>{index + 1}</span>
          <div style={rankingTexto}>
            <strong>{corrigirTextoExibicao(item.titulo)}</strong>
          </div>
          <strong style={rankingValor}>{formatarNumero(item.valor)}</strong>
        </div>
      ))}
    </div>
  );
}

function normalizarRegistro(registro: ClippingRegistro): ClippingRegistro {
  return {
    ...registro,
    id: Number(registro.id),
    status: (registro.status || "EM_MONITORAMENTO") as StatusClipping,
    autoria: registro.autoria || null,
    views: Number(registro.views || 0),
    comentarios: Number(registro.comentarios || 0),
    likes: Number(registro.likes || 0),
    compartilhamentos: Number(registro.compartilhamentos || 0),
    salvos: Number(registro.salvos || 0),
    engajamento: Number(registro.engajamento || 0),
  };
}

function somarPorCanal(
  registros: ClippingRegistro[],
  canal: CanalClipping,
  campo: "views" | "comentarios" | "likes" | "engajamento"
) {
  return registros
    .filter((registro) => registro.canal === canal)
    .reduce((total, registro) => total + Number(registro[campo] || 0), 0);
}

function agruparRanking(
  registros: ClippingRegistro[],
  seletor: (registro: ClippingRegistro) => string
) {
  const mapa = new Map<string, number>();

  for (const registro of registros) {
    const chave = seletor(registro).trim() || "Não informado";
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  }

  return [...mapa.entries()]
    .map(([titulo, valor]) => ({ titulo, valor }))
    .sort((a, b) => b.valor - a.valor || a.titulo.localeCompare(b.titulo, "pt-BR"));
}

function agruparEvolucaoSentimento(registros: ClippingRegistro[]) {
  const mapa = new Map<
    string,
    { positivas: number; neutras: number; negativas: number }
  >();

  for (const registro of registros) {
    const chave = (registro.data_publicacao || "").slice(0, 7);
    if (!chave) continue;

    const atual = mapa.get(chave) || {
      positivas: 0,
      neutras: 0,
      negativas: 0,
    };

    if (registro.sentimento === "POSITIVA") atual.positivas += 1;
    if (registro.sentimento === "NEUTRA") atual.neutras += 1;
    if (registro.sentimento === "NEGATIVA") atual.negativas += 1;

    mapa.set(chave, atual);
  }

  return [...mapa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, valores]) => ({
      mes: formatarMes(mes),
      ...valores,
    }));
}

function numeroSeguro(valor: string) {
  const texto = String(valor || "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const numero = Number(texto);
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function formatarNumero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

function formatarPercentual(valor: number) {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatarCanal(valor: CanalClipping) {
  if (valor === "INSTAGRAM") return "Instagram";
  if (valor === "FACEBOOK") return "Facebook";
  return "Site";
}

function formatarSentimento(valor: SentimentoClipping) {
  if (valor === "POSITIVA") return "Positiva";
  if (valor === "NEGATIVA") return "Negativa";
  return "Neutra";
}

function formatarStatusClipping(valor: StatusClipping) {
  if (valor === "EM_MONITORAMENTO") return "Em monitoramento";
  if (valor === "FECHADO") return "Fechado";
  return "Crise";
}

function traduzirErroClipping(base: string, detalhe?: string | null) {
  const texto = (detalhe || "").toLowerCase();

  if (
    texto.includes("status") &&
    (texto.includes("column") || texto.includes("schema cache"))
  ) {
    return `${base} O banco ainda não recebeu a migration nova do clipping.`;
  }

  if (texto.includes("violates check constraint") && texto.includes("canal")) {
    return `${base} O banco ainda não foi atualizado para aceitar o canal Facebook.`;
  }

  if (!detalhe) {
    return base;
  }

  return `${base} Detalhe: ${detalhe}`;
}

function formatarData(valor?: string | null) {
  if (!valor) return "Sem data";
  return new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatarPeriodo(inicio: string, fim: string) {
  if (!inicio && !fim) return "todos os registros";
  return `${formatarDataPeriodo(inicio) || "início"} até ${
    formatarDataPeriodo(fim) || "hoje"
  }`;
}

function formatarDataPeriodo(valor: string) {
  if (!valor) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  return valor;
}

function formatarMes(mes: string) {
  const [ano, numeroMes] = mes.split("-");
  return `${numeroMes}/${ano}`;
}

function calcularPercentual(parte: number, total: number) {
  if (!total) return 0;
  return (parte / total) * 100;
}

function criarSufixoArquivo(inicio: string, fim: string) {
  return `${inicio || "todos"}-${fim || "registros"}`.replace(/[^\w-]+/g, "-");
}

function baixarArquivo(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

function escaparHtml(valor: string | number) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function criarHtmlExcelClipping(args: {
  periodo: string;
  resumo: ResumoClipping;
  taxaPositiva: number;
  taxaNeutra: number;
  taxaNegativa: number;
  melhorCanal: string;
  canais: CanalResumo[];
  topEngajamento: ClippingRegistro[];
  topViews: ClippingRegistro[];
  rankingAutores: RankingItem[];
  positivas: ClippingRegistro[];
  neutras: ClippingRegistro[];
  negativas: ClippingRegistro[];
  registros: ClippingRegistro[];
  evolucaoMensalSentimento: EvolucaoSentimento[];
}) {
  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #111827; }
      .sheet { padding: 20px; }
      .title { font-size: 22px; font-weight: 700; color: #991b1b; margin-bottom: 4px; }
      .meta { color: #6b7280; margin-bottom: 18px; }
      .cards { width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 18px; }
      .card { border: 1px solid #fecaca; background: #fff7f7; border-radius: 10px; padding: 12px; }
      .label-sm { font-size: 11px; text-transform: uppercase; color: #7f1d1d; }
      .value-lg { font-size: 24px; font-weight: 700; color: #991b1b; margin-top: 6px; }
      .grid { width: 100%; border-collapse: separate; border-spacing: 12px; margin-bottom: 12px; }
      .panel { vertical-align: top; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #ffffff; }
      .panel h3 { margin: 0 0 10px; font-size: 15px; }
      .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; padding: 8px 6px; border-bottom: 1px solid #e5e7eb; }
      .table td { font-size: 12px; padding: 8px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
      .ranking-row { display: flex; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
      .ranking-pos { width: 22px; height: 22px; border-radius: 6px; background: #fee2e2; color: #991b1b; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="title">Clipping ASCOM STACASA</div>
      <div class="meta">Período: ${escaparHtml(args.periodo)}</div>

      <table class="cards">
        <tr>
          <td class="card"><div class="label-sm">Matérias monitoradas</div><div class="value-lg">${args.resumo.total}</div></td>
          <td class="card"><div class="label-sm">Positivas</div><div class="value-lg">${args.resumo.positivas}</div></td>
          <td class="card"><div class="label-sm">Neutras</div><div class="value-lg">${args.resumo.neutras}</div></td>
          <td class="card"><div class="label-sm">Negativas</div><div class="value-lg">${args.resumo.negativas}</div></td>
          <td class="card"><div class="label-sm">Em monitoramento</div><div class="value-lg">${args.resumo.emMonitoramento}</div></td>
          <td class="card"><div class="label-sm">Crise</div><div class="value-lg">${args.resumo.crise}</div></td>
          <td class="card"><div class="label-sm">Taxa positiva</div><div class="value-lg">${formatarPercentual(args.taxaPositiva)}%</div></td>
          <td class="card"><div class="label-sm">Views</div><div class="value-lg">${formatarNumero(args.resumo.views)}</div></td>
          <td class="card"><div class="label-sm">Engajamento</div><div class="value-lg">${formatarNumero(args.resumo.engajamento)}</div></td>
          <td class="card"><div class="label-sm">Melhor canal</div><div class="value-lg">${escaparHtml(args.melhorCanal)}</div></td>
        </tr>
      </table>

      <table class="grid">
        <tr>
          <td class="panel">
            <h3>Comparativo por canal</h3>
            <table class="table">
              <thead><tr><th>Canal</th><th>Postagens</th><th>Views</th><th>Comentários</th><th>Likes</th><th>Engajamento</th></tr></thead>
              <tbody>
                ${args.canais
                  .map(
                    (item) =>
                      `<tr><td>${escaparHtml(item.nome)}</td><td>${item.postagens}</td><td>${formatarNumero(
                        item.views
                      )}</td><td>${formatarNumero(item.comentarios)}</td><td>${formatarNumero(
                        item.likes
                      )}</td><td>${formatarNumero(item.engajamento)}</td></tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </td>
          <td class="panel">
            <h3>Evolução mensal do sentimento</h3>
            <table class="table">
              <thead><tr><th>Mês</th><th>Positivas</th><th>Neutras</th><th>Negativas</th></tr></thead>
              <tbody>
                ${args.evolucaoMensalSentimento
                  .map(
                    (item) =>
                      `<tr><td>${escaparHtml(item.mes)}</td><td>${item.positivas}</td><td>${item.neutras}</td><td>${item.negativas}</td></tr>`
                  )
                  .join("") || '<tr><td colspan="4">Sem dados mensais.</td></tr>'}
              </tbody>
            </table>
          </td>
        </tr>
      </table>

      <table class="grid">
        <tr>
          <td class="panel">
            <h3>Top matérias por engajamento</h3>
            ${criarRankingHtml(args.topEngajamento, "engajamento")}
          </td>
          <td class="panel">
            <h3>Top matérias por views</h3>
            ${criarRankingHtml(args.topViews, "views")}
          </td>
        </tr>
      </table>

      <table class="grid">
        <tr>
          <td class="panel">
            <h3>Ranking por veículo</h3>
            ${criarRankingItensHtml(args.rankingAutores)}
          </td>
        </tr>
      </table>

      <table class="grid">
        <tr>
          <td class="panel">
            <h3>Matérias positivas</h3>
            <table class="table"><tbody>${criarLinhasSentimentoExcel(args.positivas)}</tbody></table>
          </td>
          <td class="panel">
            <h3>Matérias neutras</h3>
            <table class="table"><tbody>${criarLinhasSentimentoExcel(args.neutras)}</tbody></table>
          </td>
          <td class="panel">
            <h3>Matérias negativas</h3>
            <table class="table"><tbody>${criarLinhasSentimentoExcel(args.negativas)}</tbody></table>
          </td>
        </tr>
      </table>

      <div class="panel">
        <h3>Base completa do clipping</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Matéria</th>
              <th>Canal</th>
              <th>Tom</th>
              <th>Veículo</th>
              <th>Data</th>
              <th>Views</th>
              <th>Likes</th>
              <th>Comentários</th>
              <th>Engajamento</th>
            </tr>
          </thead>
          <tbody>
            ${args.registros
              .map(
                (registro) =>
                  `<tr>
                    <td>${escaparHtml(corrigirTextoExibicao(registro.titulo))}</td>
                    <td>${escaparHtml(formatarCanal(registro.canal))}</td>
                    <td>${escaparHtml(formatarSentimento(registro.sentimento))}</td>
                    <td>${escaparHtml(registro.autoria || "Não informado")}</td>
                    <td>${escaparHtml(formatarData(registro.data_publicacao))}</td>
                    <td>${formatarNumero(registro.views)}</td>
                    <td>${formatarNumero(registro.likes)}</td>
                    <td>${formatarNumero(registro.comentarios)}</td>
                    <td>${formatarNumero(registro.engajamento)}</td>
                  </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;
}

function criarHtmlPdfClipping(args: {
  periodo: string;
  resumo: ResumoClipping;
  taxaPositiva: number;
  taxaNeutra: number;
  taxaNegativa: number;
  melhorCanal: string;
  canais: CanalResumo[];
  topEngajamento: ClippingRegistro[];
  topViews: ClippingRegistro[];
  rankingAutores: RankingItem[];
  positivas: ClippingRegistro[];
  neutras: ClippingRegistro[];
  negativas: ClippingRegistro[];
  registros: ClippingRegistro[];
  evolucaoMensalSentimento: EvolucaoSentimento[];
}) {
  const emitidoEm = new Date().toLocaleString("pt-BR");

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Clipping ASCOM STACASA - ${escaparHtml(args.periodo)}</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #111827; margin: 0; background: #fff; }
      .report { width: 100%; }
      .header { border-bottom: 3px solid #b91c1c; padding-bottom: 12px; margin-bottom: 16px; }
      .header h1 { margin: 0 0 6px; font-size: 22px; }
      .meta { color: #4b5563; font-size: 12px; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0 20px; }
      .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background: #f9fafb; }
      .card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
      .card .value { font-size: 24px; font-weight: 700; margin-top: 8px; color: #991b1b; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
      .viz { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #fff; break-inside: avoid; }
      .viz h2 { margin: 0 0 8px; font-size: 15px; color: #111827; }
      .table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      .table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; padding: 8px 6px; border-bottom: 1px solid #e5e7eb; }
      .table td { font-size: 12px; padding: 8px 6px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
      .ranking-row { display: flex; gap: 10px; align-items: center; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
      .ranking-pos { width: 22px; height: 22px; border-radius: 6px; background: #fee2e2; color: #991b1b; display: flex; align-items: center; justify-content: center; font-weight: 700; }
      .footer { margin-top: 10px; color: #6b7280; font-size: 11px; text-align: right; }
    </style>
  </head>
  <body>
    <main class="report">
      <header class="header">
        <h1>Clipping ASCOM STACASA</h1>
        <div class="meta">Período: ${escaparHtml(args.periodo)}</div>
        <div class="meta">Emitido em: ${escaparHtml(emitidoEm)}</div>
      </header>

      <section class="summary">
        <div class="card"><div class="label">Matérias monitoradas</div><div class="value">${args.resumo.total}</div></div>
        <div class="card"><div class="label">Positivas</div><div class="value">${args.resumo.positivas}</div></div>
        <div class="card"><div class="label">Neutras</div><div class="value">${args.resumo.neutras}</div></div>
        <div class="card"><div class="label">Negativas</div><div class="value">${args.resumo.negativas}</div></div>
        <div class="card"><div class="label">Em monitoramento</div><div class="value">${args.resumo.emMonitoramento}</div></div>
        <div class="card"><div class="label">Crise</div><div class="value">${args.resumo.crise}</div></div>
        <div class="card"><div class="label">Taxa positiva</div><div class="value">${formatarPercentual(args.taxaPositiva)}%</div></div>
        <div class="card"><div class="label">Taxa neutra</div><div class="value">${formatarPercentual(args.taxaNeutra)}%</div></div>
        <div class="card"><div class="label">Taxa negativa</div><div class="value">${formatarPercentual(args.taxaNegativa)}%</div></div>
        <div class="card"><div class="label">Melhor canal</div><div class="value">${escaparHtml(args.melhorCanal)}</div></div>
      </section>

      <section class="grid-2">
        <section class="viz">
          <h2>Comparativo por canal</h2>
          <table class="table">
            <thead><tr><th>Canal</th><th>Postagens</th><th>Views</th><th>Comentários</th><th>Likes</th><th>Engajamento</th></tr></thead>
            <tbody>
              ${args.canais
                .map(
                  (item) =>
                    `<tr><td>${escaparHtml(item.nome)}</td><td>${item.postagens}</td><td>${formatarNumero(
                      item.views
                    )}</td><td>${formatarNumero(item.comentarios)}</td><td>${formatarNumero(
                      item.likes
                    )}</td><td>${formatarNumero(item.engajamento)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </section>
        <section class="viz">
          <h2>Evolução mensal do sentimento</h2>
          <table class="table">
            <thead><tr><th>Mês</th><th>Positivas</th><th>Neutras</th><th>Negativas</th></tr></thead>
            <tbody>
              ${args.evolucaoMensalSentimento
                .map(
                  (item) =>
                    `<tr><td>${escaparHtml(item.mes)}</td><td>${item.positivas}</td><td>${item.neutras}</td><td>${item.negativas}</td></tr>`
                )
                .join("") || '<tr><td colspan="4">Sem dados mensais.</td></tr>'}
            </tbody>
          </table>
        </section>
      </section>

      <section class="grid-2" style="margin-top:14px;">
        <section class="viz">
          <h2>Top matérias por engajamento</h2>
          ${criarRankingHtml(args.topEngajamento, "engajamento")}
        </section>
        <section class="viz">
          <h2>Top matérias por views</h2>
          ${criarRankingHtml(args.topViews, "views")}
        </section>
      </section>

      <section class="grid-2" style="margin-top:14px;">
        <section class="viz">
          <h2>Ranking por veículo</h2>
          ${criarRankingItensHtml(args.rankingAutores)}
        </section>
      </section>

      <section class="grid-3" style="margin-top:14px;">
        <section class="viz"><h2>Matérias positivas</h2><table class="table"><tbody>${criarLinhasSentimentoExcel(args.positivas)}</tbody></table></section>
        <section class="viz"><h2>Matérias neutras</h2><table class="table"><tbody>${criarLinhasSentimentoExcel(args.neutras)}</tbody></table></section>
        <section class="viz"><h2>Matérias negativas</h2><table class="table"><tbody>${criarLinhasSentimentoExcel(args.negativas)}</tbody></table></section>
      </section>

      <section class="viz" style="margin-top:14px;">
        <h2>Base completa do clipping</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Matéria</th>
              <th>Canal</th>
              <th>Tom</th>
              <th>Veículo</th>
              <th>Data</th>
              <th>Views</th>
              <th>Likes</th>
              <th>Comentários</th>
              <th>Engajamento</th>
            </tr>
          </thead>
          <tbody>
            ${args.registros
              .map(
                (registro) =>
                  `<tr>
                    <td>${escaparHtml(corrigirTextoExibicao(registro.titulo))}</td>
                    <td>${escaparHtml(formatarCanal(registro.canal))}</td>
                    <td>${escaparHtml(formatarSentimento(registro.sentimento))}</td>
                    <td>${escaparHtml(registro.autoria || "Não informado")}</td>
                    <td>${escaparHtml(formatarData(registro.data_publicacao))}</td>
                    <td>${formatarNumero(registro.views)}</td>
                    <td>${formatarNumero(registro.likes)}</td>
                    <td>${formatarNumero(registro.comentarios)}</td>
                    <td>${formatarNumero(registro.engajamento)}</td>
                  </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </section>

      <div class="footer">Relatório gerado automaticamente pelo módulo de clipping do SGDC</div>
    </main>
  </body>
</html>`;
}

function criarRankingHtml(
  registros: ClippingRegistro[],
  métrica: "engajamento" | "views"
) {
  if (registros.length === 0) {
    return "<div>Nenhuma matéria encontrada.</div>";
  }

  return registros
    .map(
      (item, index) =>
        `<div class="ranking-row"><span class="ranking-pos">${index + 1}</span><span style="flex:1">${escaparHtml(
          corrigirTextoExibicao(item.titulo)
        )}</span><strong>${formatarNumero(item[métrica])}</strong></div>`
    )
    .join("");
}

function criarRankingItensHtml(itens: RankingItem[]) {
  if (itens.length === 0) {
    return "<div>Nenhum dado encontrado.</div>";
  }

  return itens
    .slice(0, 10)
    .map(
      (item, index) =>
        `<div class="ranking-row"><span class="ranking-pos">${index + 1}</span><span style="flex:1">${escaparHtml(
          corrigirTextoExibicao(item.titulo)
        )}</span><strong>${formatarNumero(item.valor)}</strong></div>`
    )
    .join("");
}

function criarLinhasSentimentoExcel(registros: ClippingRegistro[]) {
  if (registros.length === 0) {
    return `<tr><td>Nenhuma matéria nesta classificação.</td></tr>`;
  }

  return registros
    .map(
      (registro) =>
        `<tr><td>${escaparHtml(corrigirTextoExibicao(registro.titulo))}</td><td>${escaparHtml(
          formatarCanal(registro.canal)
        )}</td><td>${escaparHtml(formatarData(registro.data_publicacao))}</td></tr>`
    )
    .join("");
}

const tooltipStyle = {
  background: "#111827",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: "10px",
  color: "#f8fafc",
};

const pagina = {
  maxWidth: "1320px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column" as const,
  gap: "18px",
};

const cabecalho = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  flexWrap: "wrap" as const,
};

const botoesCabecalho = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const eyebrow = {
  margin: 0,
  color: "var(--sg-text-secondary)",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const titulo = {
  margin: "6px 0 10px",
  fontSize: "34px",
};

const descricao = {
  margin: 0,
  maxWidth: "820px",
  color: "var(--sg-text-secondary)",
  lineHeight: 1.6,
};

const filtros = {
  display: "grid",
  gridTemplateColumns:
    "minmax(260px, 1.4fr) repeat(2, minmax(160px, .75fr)) repeat(2, minmax(150px, .7fr)) auto",
  gap: "10px",
  alignItems: "center",
  background: "var(--sg-panel-bg)",
  border: "1px solid var(--sg-border-strong)",
  borderRadius: "14px",
  padding: "14px",
  boxShadow: "var(--sg-shadow-card)",
};

const periodoTexto = {
  margin: 0,
  color: "var(--sg-text-secondary)",
};

const campoPesquisa = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid var(--sg-input-border)",
  background: "var(--sg-input-bg)",
  color: "var(--sg-text-primary)",
};

const campoCompacto = {
  ...campoPesquisa,
  padding: "11px 12px",
};

const campoData = {
  ...campoPesquisa,
  padding: "10px 12px",
};

const cardsResumo = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
};

const cardsExecutivos = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
};

const painelPrincipal = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, .9fr)",
  gap: "18px",
  alignItems: "start",
};

const painelFormulario = {
  background: "var(--sg-panel-bg)",
  border: "1px solid var(--sg-border-strong)",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "var(--sg-shadow-card)",
};

const painelLateral = {
  display: "grid",
  gap: "18px",
};

const gridFormulario = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
};

const campoBloco = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const campoBlocoGrande = {
  ...campoBloco,
  gridColumn: "span 3",
};

const label = {
  color: "var(--sg-text-secondary)",
  fontSize: "13px",
  fontWeight: 700,
};

const campo = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid var(--sg-input-border)",
  background: "var(--sg-input-bg)",
  color: "var(--sg-text-primary)",
};

const textarea = {
  ...campo,
  minHeight: "110px",
  resize: "vertical" as const,
};

const acoesFormulario = {
  marginTop: "16px",
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const mensagemStyle = {
  margin: 0,
  color: "var(--sg-text-secondary)",
};

const painel = {
  background: "var(--sg-panel-bg)",
  border: "1px solid var(--sg-border-strong)",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "var(--sg-shadow-card)",
};

const subtitulo = {
  marginTop: 0,
  marginBottom: "14px",
  fontSize: "20px",
};

const graficoAltura = {
  height: "230px",
};

const graficoAlturaBaixa = {
  height: "250px",
};

const listaMetricas = {
  display: "grid",
  gap: "12px",
};

const canalCard = (cor: string) => ({
  display: "grid",
  gap: "6px",
  padding: "14px",
  borderRadius: "12px",
  background: "var(--sg-panel-bg-soft)",
  border: `1px solid ${cor}55`,
});

const canalNome = {
  fontSize: "16px",
};

const canalTexto = {
  color: "var(--sg-text-secondary)",
  fontSize: "14px",
};

const blocoOrientacao = {
  display: "grid",
  gap: "6px",
  padding: "14px",
  borderRadius: "12px",
  background: "var(--sg-panel-bg-soft)",
  border: "1px solid var(--sg-border-soft)",
};

const orientacaoTitulo = {
  fontSize: "14px",
};

const gradeGraficos = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
};

const gradeSentimentos = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",
};

const listaSentimento = (cor: string) => ({
  background: "var(--sg-panel-bg)",
  border: `1px solid ${cor}55`,
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "var(--sg-shadow-card)",
});

const listaItens = {
  display: "grid",
  gap: "10px",
};

const itemLista = {
  display: "grid",
  gap: "4px",
  padding: "12px 14px",
  borderRadius: "10px",
  background: "var(--sg-panel-bg-soft)",
  border: "1px solid var(--sg-border-soft)",
};

const itemListaTitulo = {
  fontSize: "15px",
};

const itemListaMeta = {
  color: "var(--sg-text-secondary)",
  fontSize: "13px",
};

const rankingLista = {
  display: "grid",
  gap: "10px",
};

const rankingLinha = {
  display: "grid",
  gridTemplateColumns: "32px minmax(0, 1fr) auto",
  gap: "12px",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid var(--sg-border-soft)",
};

const rankingPosicao = {
  width: "28px",
  height: "28px",
  borderRadius: "8px",
  background: "rgba(220,38,38,.22)",
  color: "#fecaca",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const rankingTexto = {
  display: "grid",
  gap: "4px",
  minWidth: 0,
};

const rankingMeta = {
  color: "var(--sg-text-secondary)",
  fontSize: "13px",
};

const rankingValor = {
  fontSize: "15px",
};

const textoAuxiliar = {
  margin: 0,
  color: "var(--sg-text-secondary)",
};

const tabelaWrapper = {
  overflowX: "auto" as const,
};

const tabela = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: "1180px",
};

const th = {
  textAlign: "left" as const,
  color: "var(--sg-text-secondary)",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  padding: "12px 10px",
  borderBottom: "1px solid var(--sg-border-soft)",
};

const td = {
  padding: "14px 10px",
  borderBottom: "1px solid var(--sg-border-soft)",
  verticalAlign: "top" as const,
};

const tdTitulo = {
  ...td,
  minWidth: "280px",
};

const tdMeta = {
  display: "block",
  marginTop: "6px",
  color: "var(--sg-text-secondary)",
  fontSize: "13px",
};

const linkTabela = {
  color: "#93c5fd",
  textDecoration: "none",
};

const pillSentimento = (sentimento: SentimentoClipping) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: "999px",
  background: `${CORES_SENTIMENTO[sentimento]}22`,
  border: `1px solid ${CORES_SENTIMENTO[sentimento]}66`,
  color: CORES_SENTIMENTO[sentimento],
  fontSize: "12px",
  fontWeight: 700,
});

const pillStatusClipping = (status: StatusClipping) => {
  const tema =
    status === "CRISE"
      ? { bg: "rgba(239,68,68,.16)", border: "rgba(248,113,113,.34)", color: "#fecaca" }
      : status === "FECHADO"
        ? { bg: "rgba(34,197,94,.16)", border: "rgba(74,222,128,.34)", color: "#bbf7d0" }
        : { bg: "rgba(56,189,248,.16)", border: "rgba(125,211,252,.34)", color: "#bae6fd" };

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "999px",
    background: tema.bg,
    border: `1px solid ${tema.border}`,
    color: tema.color,
    fontSize: "12px",
    fontWeight: 700,
  };
};

const alertaItem = (status: StatusClipping) => ({
  display: "grid",
  gap: "4px",
  padding: "12px 14px",
  borderRadius: "10px",
  background:
    status === "CRISE"
      ? "rgba(127,29,29,.22)"
      : status === "FECHADO"
        ? "rgba(20,83,45,.18)"
        : "rgba(15,23,42,.22)",
  border:
    status === "CRISE"
      ? "1px solid rgba(248,113,113,.28)"
      : status === "FECHADO"
        ? "1px solid rgba(74,222,128,.24)"
        : "1px solid var(--sg-border-soft)",
});

const alertaTitulo = {
  fontSize: "14px",
  fontWeight: 700,
};

const alertaMeta = {
  color: "var(--sg-text-secondary)",
  fontSize: "12px",
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
  color: "var(--sg-nav-chip-text)",
  border: "1px solid var(--sg-nav-chip-border)",
};

const botaoExcluir = {
  border: "1px solid rgba(248,113,113,.32)",
  borderRadius: "10px",
  padding: "9px 12px",
  background: "rgba(127,29,29,.26)",
  color: "#fecaca",
  cursor: "pointer",
};

const botaoEditar = {
  border: "1px solid rgba(96,165,250,.34)",
  borderRadius: "10px",
  padding: "9px 12px",
  background: "rgba(30,64,175,.24)",
  color: "#dbeafe",
  cursor: "pointer",
};

const tdAcoes = {
  ...td,
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const resumoCard = (cor?: string, destaque?: boolean) => ({
  background: destaque
    ? "linear-gradient(135deg, rgba(30,41,59,.92), rgba(127,29,29,.22))"
    : "var(--sg-panel-bg)",
  border: `1px solid ${cor || "var(--sg-border-strong)"}`,
  borderRadius: "14px",
  padding: "18px",
  boxShadow: "var(--sg-shadow-card)",
  display: "grid",
  gap: "6px",
});

const resumoTitulo = {
  color: "var(--sg-text-secondary)",
  fontSize: "13px",
};

const resumoValor = {
  fontSize: "30px",
  lineHeight: 1.1,
};
