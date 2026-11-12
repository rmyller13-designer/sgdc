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

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleString("pt-BR", opcoesDataHora);
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
