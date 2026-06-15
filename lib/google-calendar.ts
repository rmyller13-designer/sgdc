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

export function criarGoogleTasksUrl() {
  return "https://calendar.google.com/calendar/u/0/r/tasks";
}

export function criarGoogleTaskTexto(demanda: GoogleCalendarDemanda) {
  const detalhes = [
    `SGDC #${demanda.id} - ${demanda.titulo || "Demanda"}`,
    demanda.data_entrega ? `Entrega: ${formatarDataPtBr(demanda.data_entrega)}` : null,
    demanda.descricao,
    demanda.produto ? `Produto: ${demanda.produto}` : null,
    demanda.setor ? `Setor: ${demanda.setor}` : null,
    demanda.status ? `Status: ${demanda.status}` : null,
    demanda.prioridade ? `Prioridade: ${demanda.prioridade}` : null,
    demanda.responsavel ? `Responsável: ${demanda.responsavel}` : null,
  ];

  return detalhes.filter(Boolean).join("\n");
}

function formatarDataPtBr(data: string) {
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
