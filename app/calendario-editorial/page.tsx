import CalendarioEditorialClient from "@/components/CalendarioEditorialClient";
import { supabase } from "@/lib/supabase";

type SearchParams = {
  mes?: string;
};

type DemandaCalendarioRow = {
  id: number;
  titulo: string | null;
  descricao: string | null;
  produto: string | null;
  setor: string | null;
  status: string | null;
  prioridade: string | null;
  responsavel: string | null;
  cadastrado_por: string | null;
  data_solicitacao: string | null;
  data_entrega: string | null;
  criado_em: string | null;
};

export default async function CalendarioEditorialPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const mesAtual = normalizarMes(params.mes);
  const intervalo = intervaloCalendario(mesAtual);

  const { data, error } = await supabase
    .from("demandas_completas")
    .select(
      "id, titulo, descricao, produto, setor, status, prioridade, responsavel, cadastrado_por, data_solicitacao, data_entrega, criado_em"
    )
    .or(
      `data_entrega.gte.${intervalo.inicio},data_solicitacao.gte.${intervalo.inicio},criado_em.gte.${intervalo.inicio}`
    )
    .or(
      `data_entrega.lte.${intervalo.fim},data_solicitacao.lte.${intervalo.fim},criado_em.lte.${intervalo.fim}`
    )
    .order("data_entrega", { ascending: true });

  const demandas = ((data || []) as DemandaCalendarioRow[]).filter((demanda) => {
    const dataEditorial = pegarDataEditorial(demanda);
    return dataEditorial >= intervalo.inicio && dataEditorial <= intervalo.fim;
  });

  return (
    <div>
      <div style={hero}>
        <div>
          <p style={eyebrow}>Planejamento editorial</p>
          <h1 style={titulo}>Calendario editorial</h1>
          <p style={subtitulo}>
            Organize entregas, publicacoes e producao em uma visao mensal,
            semanal ou em lista.
          </p>
        </div>
      </div>

      {error && <pre style={erro}>{JSON.stringify(error, null, 2)}</pre>}

      <CalendarioEditorialClient mesAtual={mesAtual} demandas={demandas} />
    </div>
  );
}

function normalizarMes(mes?: string) {
  if (mes && /^\d{4}-\d{2}$/.test(mes)) return mes;

  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function intervaloCalendario(mes: string) {
  const [ano, mesNumero] = mes.split("-").map(Number);
  const primeiroDia = new Date(ano, mesNumero - 1, 1);
  const ultimoDia = new Date(ano, mesNumero, 0);
  const inicio = new Date(primeiroDia);
  const fim = new Date(ultimoDia);

  inicio.setDate(inicio.getDate() - inicio.getDay());
  fim.setDate(fim.getDate() + (6 - fim.getDay()));

  return {
    inicio: toDateKey(inicio),
    fim: toDateKey(fim),
  };
}

function pegarDataEditorial(demanda: DemandaCalendarioRow) {
  return (
    demanda.data_entrega ||
    demanda.data_solicitacao ||
    demanda.criado_em?.slice(0, 10) ||
    "9999-12-31"
  );
}

function toDateKey(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(data.getDate()).padStart(2, "0")}`;
}

const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "24px",
};

const eyebrow = {
  color: "#fecaca",
  fontSize: "13px",
  margin: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const titulo = {
  fontSize: "36px",
  margin: "6px 0",
};

const subtitulo = {
  color: "#fecaca",
  margin: 0,
  maxWidth: "720px",
  lineHeight: "22px",
};

const erro = {
  color: "#fecaca",
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(252, 165, 165, 0.25)",
  borderRadius: "8px",
  padding: "12px",
};
