export type GoogleCalendarDemanda = {
  id: number;
  titulo: string | null;
  descricao: string | null;
  produto?: string | null;
  setor?: string | null;
  status?: string | null;
  prioridade?: string | null;
  responsavel?: string | null;
  data_entrega: string | null;
};

export function criarGoogleCalendarUrl(demanda: GoogleCalendarDemanda) {
  if (!demanda.data_entrega) return null;

  const inicio = formatarDataGoogle(demanda.data_entrega);
  const fim = adicionarDiasGoogle(demanda.data_entrega, 1);
  const detalhes = [
    demanda.descricao,
    demanda.produto ? `Produto: ${demanda.produto}` : null,
    demanda.setor ? `Setor: ${demanda.setor}` : null,
    demanda.status ? `Status: ${demanda.status}` : null,
    demanda.prioridade ? `Prioridade: ${demanda.prioridade}` : null,
    demanda.responsavel ? `Responsável: ${demanda.responsavel}` : null,
    `SGDC demanda #${demanda.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `SGDC #${demanda.id} - ${demanda.titulo || "Demanda"}`,
    dates: `${inicio}/${fim}`,
    details: detalhes,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatarDataGoogle(data: string) {
  return data.slice(0, 10).replace(/-/g, "");
}

function adicionarDiasGoogle(data: string, dias: number) {
  const [ano, mes, dia] = data.slice(0, 10).split("-").map(Number);
  const dataLocal = new Date(ano, mes - 1, dia);
  dataLocal.setDate(dataLocal.getDate() + dias);

  return `${dataLocal.getFullYear()}${String(
    dataLocal.getMonth() + 1
  ).padStart(2, "0")}${String(dataLocal.getDate()).padStart(2, "0")}`;
}
