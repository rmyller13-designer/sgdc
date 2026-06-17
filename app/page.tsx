import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { supabase } from "../lib/supabase";

type DemandaDashboard = {
  status: string | null;
  responsavel: string | null;
  setor: string | null;
  data_entrega: string | null;
};

export default async function Dashboard() {
  await connection();

  const { data: demandas } = await supabase
    .from("demandas_completas")
    .select("*");

  const { data: produtos } = await supabase
    .from("relatorio_quantitativo_produtos")
    .select("*")
    .gt("quantidade", 0)
    .order("quantidade", { ascending: false })
    .limit(6);

  const { data: canais } = await supabase
    .from("relatorio_quantitativo_canais")
    .select("*")
    .gt("quantidade", 0)
    .order("quantidade", { ascending: false })
    .limit(6);

  const { data: eixos } = await supabase
    .from("relatorio_quantitativo_eixos")
    .select("*")
    .gt("quantidade", 0)
    .order("quantidade", { ascending: false })
    .limit(6);

  const total = demandas?.length || 0;

  const recebidas = demandas?.filter((d) => d.status === "RECEBIDO").length || 0;
  const emProducao =
    demandas?.filter((d) => d.status === "EM_PRODUCAO").length || 0;
  const emAprovacao =
    demandas?.filter((d) => d.status === "EM_APROVACAO").length || 0;
  const apParaPublicar =
    demandas?.filter((d) => d.status === "AP_PARA_PUBLICAR").length || 0;
  const concluidas =
    demandas?.filter((d) => d.status === "CONCLUIDO").length || 0;
  const canceladas =
    demandas?.filter((d) => d.status === "CANCELADO").length || 0;

  const prazos = calcularResumoPrazos(demandas || []);

  const porResponsavel =
    (demandas as DemandaDashboard[] | null)?.reduce<Record<string, number>>(
      (acc, demanda) => {
        const nome = demanda.responsavel || "Não atribuído";
        acc[nome] = (acc[nome] || 0) + 1;
        return acc;
      },
      {}
    ) || {};

  const porSetor =
    (demandas as DemandaDashboard[] | null)?.reduce<Record<string, number>>(
      (acc, demanda) => {
        const setor = demanda.setor || "Sem setor";
        acc[setor] = (acc[setor] || 0) + 1;
        return acc;
      },
      {}
    ) || {};

  return (
    <div>
      <div style={logoWrap}>
        <Image
          src="/logo-sc.png"
          alt="Logomarca da instituição"
          width={220}
          height={220}
          priority
          style={logoInicio}
        />
      </div>

      <div style={hero}>
        <div>
          <p style={eyebrow}>Painel Executivo</p>
          <h1 style={title}>Dashboard ASCOM STACASA</h1>
          <p style={subtitle}>
            Visão geral das demandas, produção, prazos, canais e eixos da
            Comunicação.
          </p>
        </div>

        <Link href="/demandas" style={botaoKanban}>
          Abrir Kanban →
        </Link>
      </div>

      <div style={gridResumo}>
        <Card titulo="Total de Demandas" valor={total} destaque />
        <Card titulo="Recebidas" valor={recebidas} />
        <Card titulo="Em Produção" valor={emProducao} />
        <Card titulo="Em Aprovação" valor={emAprovacao} />
        <Card titulo="AP. para Publicar" valor={apParaPublicar} />
        <Card titulo="Concluídas" valor={concluidas} />
        <Card titulo="Canceladas" valor={canceladas} />
      </div>

      <h2 style={sectionTitle}>Controle de Prazos</h2>

      <div style={gridResumo}>
        <Card titulo="Atrasadas" valor={prazos.atrasadas} alerta />
        <Card titulo="Vencem Hoje" valor={prazos.hoje} />
        <Card titulo="Até 3 dias" valor={prazos.ateTresDias} />
        <Card titulo="No Prazo" valor={prazos.noPrazo} />
        <Card titulo="Sem Prazo" valor={prazos.semPrazo} />
      </div>

      <div style={layout}>
        <section style={painel}>
          <h2 style={sectionTitle}>Produtos mais produzidos</h2>

          {produtos && produtos.length > 0 ? (
            produtos.map((item) => (
              <LinhaRanking
                key={item.produto_id}
                titulo={item.produto}
                valor={item.quantidade}
              />
            ))
          ) : (
            <p style={vazio}>Nenhum produto quantitativo registrado.</p>
          )}
        </section>

        <section style={painel}>
          <h2 style={sectionTitle}>Canais mais utilizados</h2>

          {canais && canais.length > 0 ? (
            canais.map((item) => (
              <LinhaRanking
                key={item.canal_id}
                titulo={item.canal}
                valor={item.quantidade}
              />
            ))
          ) : (
            <p style={vazio}>Nenhum canal registrado.</p>
          )}
        </section>

        <section style={painel}>
          <h2 style={sectionTitle}>Eixos mais utilizados</h2>

          {eixos && eixos.length > 0 ? (
            eixos.map((item) => (
              <LinhaRanking
                key={item.eixo_id}
                titulo={item.eixo}
                valor={item.quantidade}
              />
            ))
          ) : (
            <p style={vazio}>Nenhum eixo registrado.</p>
          )}
        </section>
      </div>

      <div style={layoutDois}>
        <section style={painel}>
          <h2 style={sectionTitle}>Demandas por responsável</h2>

          {Object.entries(porResponsavel).map(([nome, quantidade]) => (
            <LinhaRanking key={nome} titulo={nome} valor={quantidade as number} />
          ))}
        </section>

        <section style={painel}>
          <h2 style={sectionTitle}>Demandas por setor</h2>

          {Object.entries(porSetor).map(([setor, quantidade]) => (
            <LinhaRanking key={setor} titulo={setor} valor={quantidade as number} />
          ))}
        </section>
      </div>
    </div>
  );
}

function calcularResumoPrazos(demandas: DemandaDashboard[]) {
  const resumo = {
    atrasadas: 0,
    hoje: 0,
    ateTresDias: 0,
    noPrazo: 0,
    semPrazo: 0,
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  demandas.forEach((demanda) => {
    if (!demanda.data_entrega) {
      resumo.semPrazo += 1;
      return;
    }

    const [ano, mes, dia] = demanda.data_entrega.split("-").map(Number);
    const entrega = new Date(ano, mes - 1, dia);
    entrega.setHours(0, 0, 0, 0);

    const diff = Math.floor(
      (entrega.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff < 0) {
      resumo.atrasadas += 1;
    } else if (diff === 0) {
      resumo.hoje += 1;
    } else if (diff <= 3) {
      resumo.ateTresDias += 1;
    } else {
      resumo.noPrazo += 1;
    }
  });

  return resumo;
}

function Card({
  titulo,
  valor,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: number;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div style={alerta ? cardAlerta : destaque ? cardDestaque : card}>
      <p style={cardTitulo}>{titulo}</p>
      <strong style={cardValor}>{valor}</strong>
    </div>
  );
}

function LinhaRanking({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div style={linhaRanking}>
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "26px",
};

const logoWrap = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: "22px",
};

const logoInicio = {
  width: "auto",
  height: "auto",
  objectFit: "contain" as const,
};

const eyebrow = {
  color: "#fecaca",
  fontSize: "13px",
  margin: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const title = {
  fontSize: "36px",
  margin: "6px 0",
};

const subtitle = {
  color: "#fecaca",
  margin: 0,
};

const botaoKanban = {
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "white",
  textDecoration: "none",
  padding: "12px 18px",
  borderRadius: "12px",
  border: "1px solid rgba(254, 202, 202, 0.35)",
  fontWeight: "bold",
  whiteSpace: "nowrap" as const,
};

const gridResumo = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginBottom: "24px",
};

const card = {
  background: "rgba(15, 23, 42, 0.75)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
};

const cardDestaque = {
  ...card,
  background:
    "linear-gradient(135deg, rgba(220,38,38,0.95), rgba(127,29,29,0.95))",
};

const cardAlerta = {
  ...card,
  background:
    "linear-gradient(135deg, rgba(127,29,29,0.98), rgba(239,68,68,0.75))",
};

const cardTitulo = {
  color: "#fecaca",
  margin: 0,
  marginBottom: "8px",
  fontSize: "13px",
};

const cardValor = {
  fontSize: "34px",
};

const layout = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(240px, 1fr))",
  gap: "18px",
  marginTop: "22px",
};

const layoutDois = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
  gap: "18px",
  marginTop: "18px",
};

const painel = {
  background: "rgba(15, 23, 42, 0.75)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
};

const sectionTitle = {
  marginTop: 0,
  marginBottom: "16px",
  fontSize: "18px",
};

const linhaRanking = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  padding: "11px 0",
  borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
  color: "#e5e7eb",
};

const vazio = {
  color: "#fecaca",
};
