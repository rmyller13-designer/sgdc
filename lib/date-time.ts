const FUSO_HORARIO = "America/Sao_Paulo";

const opcoesDataHora: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSO_HORARIO,
};

export function formatarDataHoraLocal(valor?: string | null) {
  if (!valor) return "";

  const data = new Date(normalizarInstanteUtc(valor));
  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleString("pt-BR", opcoesDataHora);
}

/**
 * O PostgREST pode devolver campos `timestamp without time zone` sem `Z`.
 * O banco os grava no relógio UTC, mas o JavaScript entende uma data sem fuso
 * como horário local do navegador. Acrescentamos UTC apenas quando há data e
 * hora, mas não há deslocamento informado.
 */
function normalizarInstanteUtc(valor: string) {
  const texto = valor.trim();
  const temDataHora = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(texto);
  const temFuso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(texto);

  if (temDataHora && !temFuso) {
    return `${texto.replace(" ", "T")}Z`;
  }

  return texto;
}

export function formatarDataLocal(valor?: string | null) {
  if (!valor) return "";

  const partes = valor.slice(0, 10).split("-");
  if (partes.length !== 3 || partes.some((parte) => !/^\d+$/.test(parte))) {
    return valor;
  }

  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

export function hojeLocal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
