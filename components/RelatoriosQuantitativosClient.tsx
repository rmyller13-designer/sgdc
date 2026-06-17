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
import type { ReactNode } from "react";

type Item = {
  titulo: string;
  valor: number;
};

type EvolucaoItem = {
  mes: string;
  demandas: number;
};

const cores = ["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#a855f7", "#eab308"];

export default function RelatoriosQuantitativosClient({
  inicio,
  fim,
  mes,
  totalDemandas,
  produtos,
  canais,
  eixos,
  status,
  setores,
  responsaveis,
  evolucaoMensal,
}: {
  inicio: string;
  fim: string;
  mes: string;
  totalDemandas: number;
  produtos: Item[];
  canais: Item[];
  eixos: Item[];
  status: Item[];
  setores: Item[];
  responsaveis: Item[];
  evolucaoMensal: EvolucaoItem[];
}) {
  const totalProdutos = produtos.reduce((soma, item) => soma + item.valor, 0);
  const totalCanais = canais.reduce((soma, item) => soma + item.valor, 0);
  const totalEixos = eixos.reduce((soma, item) => soma + item.valor, 0);

  function exportarCSV() {
    const workbookXml = criarPlanilhaExcel({
      periodo: formatarPeriodo(inicio, fim),
      totalDemandas,
      totalProdutos,
      totalCanais,
      totalEixos,
      produtos,
      eixos,
      canais,
      setores,
      status,
      responsaveis,
      evolucaoMensal,
    });

    baixarArquivo(
      new Blob([workbookXml], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      }),
      `relatorio-ascom-stacasa-${criarSufixoArquivo(inicio, fim)}.xls`
    );
  }

  function exportarPDF() {
    const popup = window.open("", "_blank", "width=1200,height=900");

    if (!popup) return;

    popup.document.write(
      criarHtmlRelatorioPdf({
        periodo: formatarPeriodo(inicio, fim),
        totalDemandas,
        totalProdutos,
        totalCanais,
        totalEixos,
        produtos,
        eixos,
        canais,
        setores,
        status,
        responsaveis,
        evolucaoMensal,
      })
    );
    popup.document.close();
    popup.focus();
    popup.onload = () => popup.print();
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <p style={eyebrow}>Relatorios finais</p>
          <h1 style={titulo}>Indicadores por periodo</h1>
          <p style={subtitulo}>
            Numeros fechados por produto, eixo, canal, setor e status.
          </p>
        </div>

        <div style={botoes}>
          <button onClick={exportarCSV} style={botao}>
            Exportar Excel
          </button>

          <button onClick={exportarPDF} style={botaoSecundario}>
            Exportar PDF
          </button>
        </div>
      </div>

      <form style={filtros}>
        <div>
          <label style={label}>Filtro mensal</label>
          <input type="month" name="mes" defaultValue={mes} style={campo} />
        </div>

        <div>
          <label style={label}>Data inicial</label>
          <input type="date" name="inicio" defaultValue={mes ? "" : inicio} style={campo} />
        </div>

        <div>
          <label style={label}>Data final</label>
          <input type="date" name="fim" defaultValue={mes ? "" : fim} style={campo} />
        </div>

        <button type="submit" style={botao}>
          Filtrar
        </button>

        <a href="/relatorios-quantitativos" style={botaoSecundario}>
          Limpar
        </a>
      </form>

      <p style={periodoTexto}>Periodo analisado: {formatarPeriodo(inicio, fim)}</p>

      <div style={cardsResumo}>
        <Card titulo="Demandas no periodo" valor={totalDemandas} />
        <Card titulo="Produtos produzidos" valor={totalProdutos} />
        <Card titulo="Canais utilizados" valor={totalCanais} />
        <Card titulo="Eixos acionados" valor={totalEixos} />
      </div>

      <div style={layoutDois}>
        <Painel titulo="Evolucao mensal">
          <div style={graficoAltura}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.12)" />
                <XAxis dataKey="mes" stroke="#fecaca" />
                <YAxis stroke="#fecaca" allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="demandas" stroke="#ef4444" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Painel>

        <Painel titulo="Demandas por status">
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
        <Painel titulo="Produtos produzidos">
          <GraficoBarras dados={produtos} />
        </Painel>

        <Painel titulo="Eixos de comunicacao">
          <GraficoBarras dados={eixos} />
        </Painel>

        <Painel titulo="Canais utilizados">
          <GraficoBarras dados={canais} />
        </Painel>
      </div>

      <div style={layoutDois}>
        <Painel titulo="Setores solicitantes">
          <GraficoBarras dados={setores} />
        </Painel>

        <Painel titulo="Ranking final">
          <Ranking titulo="Produtos" dados={produtos.slice(0, 10)} />
          <Ranking titulo="Status" dados={status} />
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
  children: ReactNode;
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
          <XAxis type="number" stroke="#fecaca" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="titulo"
            stroke="#fecaca"
            width={120}
          />
          <Tooltip />
          <Bar dataKey="valor" fill="#ef4444" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Ranking({ titulo, dados }: { titulo: string; dados: Item[] }) {
  if (dados.length === 0) {
    return <p style={textoFraco}>Nenhum dado encontrado.</p>;
  }

  return (
    <div style={rankingBloco}>
      <h3 style={rankingTitulo}>{titulo}</h3>
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

function formatarPeriodo(inicio: string, fim: string) {
  if (!inicio && !fim) return "todos os registros";
  return `${formatarDataPeriodo(inicio) || "inicio"} ate ${
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

function escaparXml(valor: string | number) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function criarLinhasExcel(titulo: string, dados: Item[]) {
  const linhas = [
    `<Row><Cell ss:MergeAcross="1" ss:StyleID="section"><Data ss:Type="String">${escaparXml(
      titulo
    )}</Data></Cell></Row>`,
    `<Row><Cell ss:StyleID="header"><Data ss:Type="String">Item</Data></Cell><Cell ss:StyleID="header"><Data ss:Type="String">Quantidade</Data></Cell></Row>`,
    ...dados.map(
      (item) =>
        `<Row><Cell ss:StyleID="cell"><Data ss:Type="String">${escaparXml(
          item.titulo
        )}</Data></Cell><Cell ss:StyleID="number"><Data ss:Type="Number">${
          item.valor
        }</Data></Cell></Row>`
    ),
    `<Row />`,
  ];

  return linhas.join("");
}

function criarPlanilhaExcel({
  periodo,
  totalDemandas,
  totalProdutos,
  totalCanais,
  totalEixos,
  produtos,
  eixos,
  canais,
  setores,
  status,
  responsaveis,
  evolucaoMensal,
}: {
  periodo: string;
  totalDemandas: number;
  totalProdutos: number;
  totalCanais: number;
  totalEixos: number;
  produtos: Item[];
  eixos: Item[];
  canais: Item[];
  setores: Item[];
  status: Item[];
  responsaveis: Item[];
  evolucaoMensal: EvolucaoItem[];
}) {
  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="title"><Font ss:Bold="1" ss:Size="14"/><Interior ss:Color="#FDE2E2" ss:Pattern="Solid"/></Style>
  <Style ss:ID="section"><Font ss:Bold="1" ss:Size="12"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/></Style>
  <Style ss:ID="header"><Font ss:Bold="1"/><Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/></Style>
  <Style ss:ID="cell"><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
  <Style ss:ID="number"><Alignment ss:Horizontal="Right"/><NumberFormat ss:Format="0"/></Style>
 </Styles>
 <Worksheet ss:Name="Relatorio">
  <Table>
   <Column ss:Width="260"/>
   <Column ss:Width="90"/>
   <Row><Cell ss:MergeAcross="1" ss:StyleID="title"><Data ss:Type="String">Relatorio ASCOM STACASA</Data></Cell></Row>
   <Row><Cell ss:MergeAcross="1"><Data ss:Type="String">Periodo: ${escaparXml(
     periodo
   )}</Data></Cell></Row>
   <Row />
   <Row><Cell ss:StyleID="section"><Data ss:Type="String">Resumo</Data></Cell><Cell ss:StyleID="section"><Data ss:Type="String">Quantidade</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Demandas no periodo</Data></Cell><Cell ss:StyleID="number"><Data ss:Type="Number">${totalDemandas}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Produtos produzidos</Data></Cell><Cell ss:StyleID="number"><Data ss:Type="Number">${totalProdutos}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Canais utilizados</Data></Cell><Cell ss:StyleID="number"><Data ss:Type="Number">${totalCanais}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Eixos acionados</Data></Cell><Cell ss:StyleID="number"><Data ss:Type="Number">${totalEixos}</Data></Cell></Row>
   <Row />
   ${criarLinhasExcel("Produtos produzidos", produtos)}
   ${criarLinhasExcel("Eixos de comunicacao", eixos)}
   ${criarLinhasExcel("Canais utilizados", canais)}
   ${criarLinhasExcel("Setores solicitantes", setores)}
   ${criarLinhasExcel("Demandas por status", status)}
   ${criarLinhasExcel("Demandas por responsavel", responsaveis)}
   <Row><Cell ss:MergeAcross="1" ss:StyleID="section"><Data ss:Type="String">Evolucao mensal</Data></Cell></Row>
   <Row><Cell ss:StyleID="header"><Data ss:Type="String">Mes</Data></Cell><Cell ss:StyleID="header"><Data ss:Type="String">Demandas</Data></Cell></Row>
   ${evolucaoMensal
     .map(
       (item) =>
         `<Row><Cell><Data ss:Type="String">${escaparXml(
           item.mes
         )}</Data></Cell><Cell ss:StyleID="number"><Data ss:Type="Number">${
           item.demandas
         }</Data></Cell></Row>`
     )
     .join("")}
  </Table>
 </Worksheet>
</Workbook>`;
}

function criarTabelaHtml(titulo: string, dados: Item[]) {
  return `
    <section class="section">
      <h2>${escaparHtml(titulo)}</h2>
      <table>
        <thead>
          <tr><th>Item</th><th>Quantidade</th></tr>
        </thead>
        <tbody>
          ${dados
            .map(
              (item) =>
                `<tr><td>${escaparHtml(item.titulo)}</td><td class="num">${item.valor}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function escaparHtml(valor: string | number) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function criarHtmlRelatorioPdf({
  periodo,
  totalDemandas,
  totalProdutos,
  totalCanais,
  totalEixos,
  produtos,
  eixos,
  canais,
  setores,
  status,
  responsaveis,
  evolucaoMensal,
}: {
  periodo: string;
  totalDemandas: number;
  totalProdutos: number;
  totalCanais: number;
  totalEixos: number;
  produtos: Item[];
  eixos: Item[];
  canais: Item[];
  setores: Item[];
  status: Item[];
  responsaveis: Item[];
  evolucaoMensal: EvolucaoItem[];
}) {
  const emitidoEm = new Date().toLocaleString("pt-BR");

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Relatorio ASCOM STACASA - ${escaparHtml(periodo)}</title>
    <style>
      @page { size: A4 portrait; margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #111827; margin: 0; background: #fff; }
      .report { width: 100%; }
      .header { border-bottom: 3px solid #b91c1c; padding-bottom: 12px; margin-bottom: 16px; }
      .header h1 { margin: 0 0 6px; font-size: 22px; }
      .meta { color: #4b5563; font-size: 12px; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0 20px; }
      .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background: #f9fafb; }
      .card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
      .card .value { font-size: 26px; font-weight: 700; margin-top: 8px; color: #991b1b; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
      .section { margin-bottom: 14px; break-inside: avoid; }
      .section h2 { margin: 0 0 8px; font-size: 15px; color: #111827; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #e5e7eb; padding: 7px 8px; font-size: 11px; vertical-align: top; word-break: break-word; }
      th { background: #f3f4f6; text-align: left; }
      td.num { text-align: right; width: 72px; }
      .footer { margin-top: 8px; color: #6b7280; font-size: 11px; text-align: right; }
    </style>
  </head>
  <body>
    <main class="report">
      <header class="header">
        <h1>Relatório ASCOM STACASA</h1>
        <div class="meta">Período: ${escaparHtml(periodo)}</div>
        <div class="meta">Emitido em: ${escaparHtml(emitidoEm)}</div>
      </header>

      <section class="summary">
        <div class="card"><div class="label">Demandas no período</div><div class="value">${totalDemandas}</div></div>
        <div class="card"><div class="label">Produtos produzidos</div><div class="value">${totalProdutos}</div></div>
        <div class="card"><div class="label">Canais utilizados</div><div class="value">${totalCanais}</div></div>
        <div class="card"><div class="label">Eixos acionados</div><div class="value">${totalEixos}</div></div>
      </section>

      <section class="grid-2">
        ${criarTabelaHtml("Evolução mensal", evolucaoMensal.map((item) => ({ titulo: item.mes, valor: item.demandas })))}
        ${criarTabelaHtml("Demandas por status", status)}
      </section>

      <section class="grid-3">
        ${criarTabelaHtml("Produtos produzidos", produtos.slice(0, 10))}
        ${criarTabelaHtml("Eixos de comunicação", eixos.slice(0, 10))}
        ${criarTabelaHtml("Canais utilizados", canais.slice(0, 10))}
      </section>

      <section class="grid-2">
        ${criarTabelaHtml("Setores solicitantes", setores.slice(0, 10))}
        ${criarTabelaHtml("Demandas por responsável", responsaveis.slice(0, 10))}
      </section>

      <div class="footer">Relatório gerado automaticamente pelo SGDC</div>
    </main>
  </body>
</html>`;
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
  flexWrap: "wrap" as const,
};

const filtros = {
  display: "flex",
  gap: "12px",
  alignItems: "end",
  flexWrap: "wrap" as const,
  marginBottom: "12px",
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

const periodoTexto = {
  color: "#fecaca",
  marginTop: 0,
  marginBottom: "22px",
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
  borderRadius: "8px",
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
  borderRadius: "8px",
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

const rankingBloco = {
  marginBottom: "18px",
};

const rankingTitulo = {
  color: "#fecaca",
  fontSize: "14px",
  marginTop: 0,
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
