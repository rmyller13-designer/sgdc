"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

type Item = {
  titulo: string;
  valor: number;
};

const cores = ["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#a855f7", "#eab308"];

export default function RelatoriosQuantitativosClient({
  inicio,
  fim,
  totalDemandas,
  produtos,
  canais,
  eixos,
  status,
  setores,
  responsaveis,
}: {
  inicio: string;
  fim: string;
  totalDemandas: number;
  produtos: Item[];
  canais: Item[];
  eixos: Item[];
  status: Item[];
  setores: Item[];
  responsaveis: Item[];
}) {
  const totalProdutos = produtos.reduce((soma, item) => soma + item.valor, 0);
  const totalCanais = canais.reduce((soma, item) => soma + item.valor, 0);
  const totalEixos = eixos.reduce((soma, item) => soma + item.valor, 0);

  const evolucaoMensal = gerarEvolucaoFake(totalDemandas, totalProdutos);

  function exportarCSV() {
    const linhas = [
      ["RELATÓRIO QUANTITATIVO SGDC"],
      [`Período: ${inicio || "início"} até ${fim || "hoje"}`],
      [],
      ["Resumo"],
      ["Total de demandas", totalDemandas],
      ["Produtos produzidos", totalProdutos],
      ["Canais utilizados", totalCanais],
      ["Eixos acionados", totalEixos],
      [],
      ["Produtos"],
      ["Item", "Quantidade"],
      ...produtos.map((i) => [i.titulo, i.valor]),
      [],
      ["Canais"],
      ["Item", "Quantidade"],
      ...canais.map((i) => [i.titulo, i.valor]),
      [],
      ["Eixos"],
      ["Item", "Quantidade"],
      ...eixos.map((i) => [i.titulo, i.valor]),
      [],
      ["Status"],
      ["Item", "Quantidade"],
      ...status.map((i) => [i.titulo, i.valor]),
      [],
      ["Setores"],
      ["Item", "Quantidade"],
      ...setores.map((i) => [i.titulo, i.valor]),
    ];

    const csv = linhas.map((linha) => linha.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "relatorio-quantitativo-sgdc.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function imprimirPDF() {
    window.print();
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <p style={eyebrow}>Relatórios Executivos</p>
          <h1 style={titulo}>Indicadores Quantitativos</h1>
          <p style={subtitulo}>
            Produção, canais, eixos, setores e status com visual gerencial.
          </p>
        </div>

        <div style={botoes}>
          <button onClick={exportarCSV} style={botao}>
            Exportar Excel/CSV
          </button>

          <button onClick={imprimirPDF} style={botaoSecundario}>
            Imprimir / PDF
          </button>
        </div>
      </div>

      <form style={filtros}>
        <div>
          <label style={label}>Data inicial</label>
          <input type="date" name="inicio" defaultValue={inicio} style={campo} />
        </div>

        <div>
          <label style={label}>Data final</label>
          <input type="date" name="fim" defaultValue={fim} style={campo} />
        </div>

        <button type="submit" style={botao}>
          Filtrar
        </button>

        <a href="/relatorios-quantitativos" style={botaoSecundario}>
          Limpar
        </a>
      </form>

      <div style={cardsResumo}>
        <Card titulo="Demandas no período" valor={totalDemandas} />
        <Card titulo="Produtos produzidos" valor={totalProdutos} />
        <Card titulo="Canais utilizados" valor={totalCanais} />
        <Card titulo="Eixos acionados" valor={totalEixos} />
      </div>

      <div style={layoutDois}>
        <Painel titulo="📈 Evolução do período">
          <div style={graficoAltura}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.12)" />
                <XAxis dataKey="mes" stroke="#fecaca" />
                <YAxis stroke="#fecaca" />
                <Tooltip />
                <Line type="monotone" dataKey="demandas" stroke="#ef4444" strokeWidth={3} />
                <Line type="monotone" dataKey="produtos" stroke="#f97316" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Painel>

        <Painel titulo="📊 Demandas por Status">
          <div style={graficoAltura}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={status}
                  dataKey="valor"
                  nameKey="titulo"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {status.map((_, index) => (
                    <Cell key={index} fill={cores[index % cores.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <Legenda dados={status} />
        </Painel>
      </div>

      <div style={layoutPrincipal}>
        <Painel titulo="📦 Produtos Produzidos">
          <GraficoBarras dados={produtos} />
        </Painel>

        <Painel titulo="📍 Canais Mais Utilizados">
          <GraficoBarras dados={canais} />
        </Painel>

        <Painel titulo="📢 Eixos de Comunicação">
          <GraficoBarras dados={eixos} />
        </Painel>
      </div>

      <div style={layoutDois}>
        <Painel titulo="🏢 Setores Solicitantes">
          <GraficoBarras dados={setores} />
        </Painel>

        <Painel titulo="🏆 Top Produção">
          <Ranking dados={produtos.slice(0, 10)} />
        </Painel>
      </div>
    </div>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div style={card}>
      <p style={cardTitulo}>{titulo}</p>
      <strong style={cardValor}>{valor}</strong>
    </div>
  );
}

function Painel({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section style={painel}>
      <h2 style={sectionTitle}>{titulo}</h2>
      {children}
    </section>
  );
}

function GraficoBarras({ dados }: { dados: Item[] }) {
  const dadosLimitados = dados.slice(0, 10);

  if (dadosLimitados.length === 0) {
    return <p style={textoFraco}>Nenhum dado encontrado.</p>;
  }

  return (
    <div style={graficoAltura}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dadosLimitados} layout="vertical">
          <XAxis type="number" stroke="#fecaca" />
          <YAxis
            type="category"
            dataKey="titulo"
            stroke="#fecaca"
            width={110}
          />
          <Tooltip />
          <Bar dataKey="valor" fill="#ef4444" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Ranking({ dados }: { dados: Item[] }) {
  if (dados.length === 0) {
    return <p style={textoFraco}>Nenhum dado encontrado.</p>;
  }

  return (
    <div>
      {dados.map((item, index) => (
        <div key={item.titulo} style={rankingLinha}>
          <span style={rankingPosicao}>{index + 1}</span>
          <span style={{ flex: 1 }}>{item.titulo}</span>
          <strong>{item.valor}</strong>
        </div>
      ))}
    </div>
  );
}

function Legenda({ dados }: { dados: Item[] }) {
  return (
    <div style={legenda}>
      {dados.map((item, index) => (
        <div key={item.titulo} style={legendaItem}>
          <span
            style={{
              ...legendaCor,
              background: cores[index % cores.length],
            }}
          />
          <span>{item.titulo}</span>
          <strong>{item.valor}</strong>
        </div>
      ))}
    </div>
  );
}

function gerarEvolucaoFake(totalDemandas: number, totalProdutos: number) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];

  return meses.map((mes, index) => ({
    mes,
    demandas: Math.max(0, Math.round((totalDemandas / 6) * (index + 1) * 0.5)),
    produtos: Math.max(0, Math.round((totalProdutos / 6) * (index + 1) * 0.6)),
  }));
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
  textTransform: "uppercase" as const,
  fontSize: "13px",
  letterSpacing: "0.08em",
  margin: 0,
};

const titulo = {
  fontSize: "36px",
  margin: "6px 0",
};

const subtitulo = {
  color: "#fecaca",
  margin: 0,
};

const botoes = {
  display: "flex",
  gap: "10px",
};

const filtros = {
  display: "flex",
  gap: "12px",
  alignItems: "end",
  flexWrap: "wrap" as const,
  marginBottom: "22px",
};

const label = {
  display: "block",
  color: "#fecaca",
  fontSize: "13px",
  marginBottom: "6px",
};

const campo = {
  background: "rgba(15,23,42,.85)",
  border: "1px solid rgba(252,165,165,.25)",
  color: "white",
  borderRadius: "10px",
  padding: "11px 12px",
};

const botao = {
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "white",
  border: "none",
  padding: "11px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
  textDecoration: "none",
};

const botaoSecundario = {
  background: "rgba(15,23,42,.85)",
  color: "#fee2e2",
  border: "1px solid rgba(252,165,165,.25)",
  padding: "11px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  textDecoration: "none",
};

const cardsResumo = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginBottom: "22px",
};

const card = {
  background: "rgba(15,23,42,.75)",
  border: "1px solid rgba(252,165,165,.18)",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 12px 30px rgba(0,0,0,.22)",
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

const layoutPrincipal = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(260px, 1fr))",
  gap: "18px",
  marginTop: "18px",
};

const layoutDois = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(280px, 1fr))",
  gap: "18px",
  marginTop: "18px",
};

const painel = {
  background: "rgba(15,23,42,.75)",
  border: "1px solid rgba(252,165,165,.18)",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 12px 30px rgba(0,0,0,.22)",
};

const sectionTitle = {
  marginTop: 0,
  marginBottom: "18px",
  fontSize: "18px",
};

const graficoAltura = {
  width: "100%",
  height: "320px",
};

const rankingLinha = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 0",
  borderBottom: "1px solid rgba(148,163,184,.16)",
};

const rankingPosicao = {
  width: "26px",
  height: "26px",
  borderRadius: "8px",
  background: "rgba(220,38,38,.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fecaca",
  fontWeight: "bold",
};

const legenda = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const legendaItem = {
  display: "grid",
  gridTemplateColumns: "14px 1fr auto",
  gap: "8px",
  alignItems: "center",
  fontSize: "13px",
};

const legendaCor = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
};

const textoFraco = {
  color: "#fecaca",
};