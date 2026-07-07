import { stripRichText } from "@/lib/rich-text";
import {
  corrigirTextoExibicao,
  formatarSetorExibicao,
  formatarStatusExibicao,
  formatarTituloHumano,
} from "@/lib/display-text";
import { supabase } from "@/lib/supabase";

type DemandaMemoriaRow = {
  id: number;
  titulo: string | null;
  descricao: string | null;
  setor: string | null;
  status: string | null;
  responsavel: string | null;
  prioridade: string | null;
  criado_em: string | null;
  data_entrega: string | null;
};

export type SugestaoMemoriaEditorial = {
  id: number;
  titulo: string;
  descricaoResumo: string;
  descricaoHtml: string;
  setor: string;
  status: string;
  responsavel: string;
  prioridade: string;
  criadoEm: string | null;
  dataEntrega: string | null;
  pontuacao: number;
  classificacao: "Muito semelhante" | "Semelhante" | "Pode inspirar";
  motivos: string[];
};

type BuscaMemoriaInput = {
  titulo?: string | null;
  descricao?: string | null;
  setor?: string | null;
  excluirDemandaId?: number | null;
  limite?: number;
};

export async function buscarMemoriaEditorial({
  titulo,
  descricao,
  setor,
  excluirDemandaId,
  limite = 5,
}: BuscaMemoriaInput): Promise<SugestaoMemoriaEditorial[]> {
  const consultaTitulo = corrigirTextoExibicao(titulo).trim();
  const consultaDescricao = stripRichText(descricao).trim();
  const consultaSetor = formatarSetorExibicao(setor).trim();

  if (!consultaTitulo && !consultaDescricao && !consultaSetor) {
    return [];
  }

  const { data, error } = await supabase
    .from("demandas_completas")
    .select(
      "id, titulo, descricao, setor, status, responsavel, prioridade, criado_em, data_entrega"
    )
    .order("criado_em", { ascending: false })
    .limit(140);

  if (error) {
    return [];
  }

  const rows = ((data as DemandaMemoriaRow[] | null) || []).filter((item) => {
    if (excluirDemandaId && Number(item.id) === excluirDemandaId) return false;
    return true;
  });

  const consultaTituloNorm = normalizarTextoLivre(consultaTitulo);
  const consultaDescricaoNorm = normalizarTextoLivre(consultaDescricao);
  const consultaSetorNorm = normalizarTextoLivre(consultaSetor);
  const termosTitulo = extrairTermos(consultaTituloNorm);
  const termosDescricao = extrairTermos(consultaDescricaoNorm);

  const pontuadas = rows
    .map((item) => pontuarDemanda(item, {
      consultaTitulo,
      consultaDescricao,
      consultaTituloNorm,
      consultaDescricaoNorm,
      consultaSetorNorm,
      termosTitulo,
      termosDescricao,
    }))
    .filter((item) => item.pontuacao > 0)
    .sort((a, b) => {
      if (b.pontuacao !== a.pontuacao) return b.pontuacao - a.pontuacao;
      return (b.criadoEm || "").localeCompare(a.criadoEm || "");
    })
    .slice(0, limite);

  return pontuadas.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    descricaoResumo: item.descricaoResumo,
    descricaoHtml: item.descricaoHtml,
    setor: item.setor,
    status: item.status,
    responsavel: item.responsavel,
    prioridade: item.prioridade,
    criadoEm: item.criadoEm,
    dataEntrega: item.dataEntrega,
    pontuacao: item.pontuacao,
    classificacao:
      item.pontuacao >= 70
        ? "Muito semelhante"
        : item.pontuacao >= 45
          ? "Semelhante"
          : "Pode inspirar",
    motivos: item.motivos.slice(0, 3),
  }));
}

function pontuarDemanda(
  item: DemandaMemoriaRow,
  contexto: {
    consultaTitulo: string;
    consultaDescricao: string;
    consultaTituloNorm: string;
    consultaDescricaoNorm: string;
    consultaSetorNorm: string;
    termosTitulo: string[];
    termosDescricao: string[];
  }
) {
  const titulo = corrigirTextoExibicao(item.titulo) || "Sem título";
  const descricaoHtml = item.descricao || "";
  const descricaoTexto = stripRichText(item.descricao) || "";
  const setor = formatarSetorExibicao(item.setor);
  const status = formatarStatusExibicao(item.status);
  const responsavel = corrigirTextoExibicao(item.responsavel) || "Não definido";
  const prioridade = formatarTituloHumano(item.prioridade || "Normal");

  const tituloNorm = normalizarTextoLivre(titulo);
  const descricaoNorm = normalizarTextoLivre(descricaoTexto);
  const setorNorm = normalizarTextoLivre(setor);

  let pontuacao = 0;
  const motivos: string[] = [];

  if (contexto.consultaSetorNorm && setorNorm === contexto.consultaSetorNorm) {
    pontuacao += 24;
    motivos.push("Mesmo setor solicitante");
  }

  const compartilhadosTitulo = contarTermosCompartilhados(contexto.termosTitulo, tituloNorm);
  if (compartilhadosTitulo > 0) {
    pontuacao += Math.min(38, compartilhadosTitulo * 11);
    motivos.push("Título com tema semelhante");
  }

  const compartilhadosDescricao = contarTermosCompartilhados(
    contexto.termosDescricao,
    descricaoNorm
  );
  if (compartilhadosDescricao > 0) {
    pontuacao += Math.min(28, compartilhadosDescricao * 6);
    motivos.push("Descrição com contexto parecido");
  }

  if (
    contexto.consultaTituloNorm &&
    (tituloNorm.includes(contexto.consultaTituloNorm) ||
      contexto.consultaTituloNorm.includes(tituloNorm))
  ) {
    pontuacao += 18;
    motivos.push("Título quase igual");
  }

  if (item.status === "CONCLUIDO" || item.status === "AP_PARA_PUBLICAR") {
    pontuacao += 6;
    motivos.push("Já possui entrega aproveitável");
  }

  if (!contexto.consultaTitulo && contexto.consultaDescricao && compartilhadosDescricao >= 2) {
    pontuacao += 8;
  }

  return {
    id: Number(item.id),
    titulo,
    descricaoResumo: resumirTexto(descricaoTexto),
    descricaoHtml,
    setor,
    status,
    responsavel,
    prioridade,
    criadoEm: item.criado_em,
    dataEntrega: item.data_entrega,
    pontuacao,
    motivos,
  };
}

function resumirTexto(valor: string) {
  const texto = corrigirTextoExibicao(valor).replace(/\s+/g, " ").trim();
  if (!texto) return "Sem descrição aproveitável.";
  return texto.length > 180 ? `${texto.slice(0, 177).trim()}...` : texto;
}

function contarTermosCompartilhados(termosConsulta: string[], textoBase: string) {
  if (termosConsulta.length === 0 || !textoBase) return 0;

  return termosConsulta.filter((termo) => textoBase.includes(termo)).length;
}

function extrairTermos(texto: string) {
  return Array.from(
    new Set(
      texto
        .split(" ")
        .map((parte) => parte.trim())
        .filter((parte) => parte.length >= 4)
    )
  );
}

function normalizarTextoLivre(valor?: string | null) {
  return (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
