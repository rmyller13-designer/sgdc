"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  const periodo = formatarPeriodo(inicio, fim);

  function exportarExcel() {
    const html = criarHtmlExcel({
      periodo,
      totalDemandas,
      totalProdutos,
      totalCanais,
      totalEixos,
      produtos,
      canais,
      eixos,
      setores,
      status,
      responsaveis,
      evolucaoMensal,
    });

    baixarArquivo(
      new Blob(["\uFEFF" + html], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      }),
      `relatorio-ascom-stacasa-${criarSufixoArquivo(inicio, fim)}.xls`
    );
  }

  function exportarPDF() {
    const popup = window.open("", "_blank", "width=1200,height=900");
    if (!popup) return;

    popup.document.write(
      criarHtmlPdf({
        periodo,
        totalDemandas,
        totalProdutos,
        totalCanais,
        totalEixos,
        produtos,
        canais,
        eixos,
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
          <p style={eyebrow}>Relatórios finais</p>
          <h1 style={titulo}>Indicadores por período</h1>
          <p style={subtitulo}>
            Números fechados por produto, eixo, canal, setor e status.
          </p>
        </div>

        <div style={botoes}>
          <button onClick={exportarExcel} style={botao}>
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

      <p style={periodoTexto}>Período analisado: {periodo}</p>

      <div style={cardsResumo}>
        <Card titulo="Demandas no período" valor={totalDemandas} />
        <Card titulo="Produtos produzidos" valor={totalProdutos} />
        <Card titulo="Canais utilizados" valor={totalCanais} />
        <Card titulo="Eixos acionados" valor={totalEixos} />
      </div>

      <div style={layoutDois}>
        <Painel titulo="Evolução mensal">
          <div style={graficoAltura}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={evolucaoMensal}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="evolucaoMensalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.12)" />
                <XAxis dataKey="mes" stroke="#fecaca" />
                <YAxis stroke="#fecaca" allowDecimals={false} width={34} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="demandas"
                  stroke="#ef4444"
                  strokeWidth={3}
                  fill="url(#evolucaoMensalFill)"
                />
                <Line
                  type="monotone"
                  dataKey="demandas"
                  stroke="#fca5a5"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "#ef4444",
                    stroke: "#fee2e2",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
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
                  {status.map((item, index) => (
                    <Cell key={item.titulo} fill={cores[index % cores.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <Legenda dados={status} />
        </Painel>
      </div>

      <div style={layoutPrincipal}>
        <Painel titulo="Produtos produzidos">
          <GraficoBarras dados={produtos} cor="#ef4444" />
        </Painel>

        <Painel titulo="Eixos de comunicação">
          <GraficoBarras dados={eixos} cor="#3b82f6" />
        </Painel>

        <Painel titulo="Canais utilizados">
          <GraficoBarras dados={canais} cor="#f97316" />
        </Painel>
      </div>

      <div style={layoutDois}>
        <Painel titulo="Setores solicitantes">
          <GraficoBarras dados={setores} cor="#22c55e" />
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

function Painel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section style={painel}>
      <h2 style={sectionTitle}>{titulo}</h2>
      {children}
    </section>
  );
}

function GraficoBarras({ dados, cor }: { dados: Item[]; cor: string }) {
  const lista = dados.slice(0, 10);

  if (lista.length === 0) return <p style={textoFraco}>Nenhum dado encontrado.</p>;

  return (
    <div style={graficoAltura}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={lista} layout="vertical" margin={{ left: 8, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.12)" />
          <XAxis type="number" stroke="#fecaca" allowDecimals={false} />
          <YAxis type="category" dataKey="titulo" stroke="#fecaca" width={132} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="valor" fill={cor} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Ranking({ titulo, dados }: { titulo: string; dados: Item[] }) {
  if (dados.length === 0) return <p style={textoFraco}>Nenhum dado encontrado.</p>;

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
          <span style={{ ...legendaCor, background: cores[index % cores.length] }} />
          <span>{item.titulo}</span>
          <strong>{item.valor}</strong>
        </div>
      ))}
    </div>
  );
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

function criarBarraHtml(dados: Item[], cor: string) {
  const lista = dados.slice(0, 8);
  const maximo = Math.max(...lista.map((item) => item.valor), 1);

  return `
    <table class="chart-table">
      ${lista
        .map((item) => {
          const largura = Math.max(8, Math.round((item.valor / maximo) * 100));
          return `<tr>
            <td class="label">${escaparHtml(item.titulo)}</td>
            <td class="bar-cell"><div class="bar-bg"><div class="bar-fill" style="width:${largura}%;background:${cor};"></div></div></td>
            <td class="value">${item.valor}</td>
          </tr>`;
        })
        .join("")}
    </table>
  `;
}

function criarPizzaHtml(dados: Item[]) {
  const total = dados.reduce((soma, item) => soma + item.valor, 0) || 1;
  return `
    <div class="pie-wrap">
      <div class="pie" style="background: conic-gradient(${dados
        .map((item, index) => {
          const inicio = dados
            .slice(0, index)
            .reduce((soma, atual) => soma + atual.valor, 0);
          const fim = inicio + item.valor;
          return `${cores[index % cores.length]} ${(inicio / total) * 100}% ${(fim / total) * 100}%`;
        })
        .join(", ")}"></div>
      <div class="legend">
        ${dados
          .map(
            (item, index) =>
              `<div class="legend-item"><span class="dot" style="background:${
                cores[index % cores.length]
              }"></span>${escaparHtml(item.titulo)} <strong>${item.valor}</strong></div>`
          )
          .join("")}
      </div>
    </div>
  `;
}

function criarHtmlExcel(args: {
  periodo: string;
  totalDemandas: number;
  totalProdutos: number;
  totalCanais: number;
  totalEixos: number;
  produtos: Item[];
  canais: Item[];
  eixos: Item[];
  setores: Item[];
  status: Item[];
  responsaveis: Item[];
  evolucaoMensal: EvolucaoItem[];
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
      .value-lg { font-size: 26px; font-weight: 700; color: #991b1b; margin-top: 6px; }
      .grid { width: 100%; border-collapse: separate; border-spacing: 12px; }
      .panel { vertical-align: top; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #ffffff; }
      .panel h3 { margin: 0 0 10px; font-size: 15px; }
      .chart-table { width: 100%; border-collapse: collapse; }
      .chart-table td { padding: 6px 0; font-size: 12px; }
      .chart-table .label { width: 38%; color: #374151; }
      .chart-table .bar-cell { width: 48%; padding: 6px 10px; }
      .chart-table .value { width: 14%; text-align: right; font-weight: 700; }
      .bar-bg { height: 14px; background: #fee2e2; border-radius: 999px; overflow: hidden; }
      .bar-fill { height: 14px; border-radius: 999px; }
      .pie-wrap { display: flex; align-items: center; gap: 18px; }
      .pie { width: 150px; height: 150px; border-radius: 50%; }
      .legend { display: grid; gap: 8px; font-size: 12px; }
      .legend-item { color: #374151; }
      .dot { display: inline-block; width: 10px; height: 10px; border-radius: 999px; margin-right: 8px; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="title">Relatório ASCOM STACASA</div>
      <div class="meta">Período: ${escaparHtml(args.periodo)}</div>

      <table class="cards">
        <tr>
          <td class="card"><div class="label-sm">Demandas no período</div><div class="value-lg">${args.totalDemandas}</div></td>
          <td class="card"><div class="label-sm">Produtos produzidos</div><div class="value-lg">${args.totalProdutos}</div></td>
          <td class="card"><div class="label-sm">Canais utilizados</div><div class="value-lg">${args.totalCanais}</div></td>
          <td class="card"><div class="label-sm">Eixos acionados</div><div class="value-lg">${args.totalEixos}</div></td>
        </tr>
      </table>

      <table class="grid">
        <tr>
          <td class="panel"><h3>Produtos produzidos</h3>${criarBarraHtml(args.produtos, "#ef4444")}</td>
          <td class="panel"><h3>Eixos de comunicação</h3>${criarBarraHtml(args.eixos, "#3b82f6")}</td>
        </tr>
        <tr>
          <td class="panel"><h3>Canais utilizados</h3>${criarBarraHtml(args.canais, "#f97316")}</td>
          <td class="panel"><h3>Setores solicitantes</h3>${criarBarraHtml(args.setores, "#22c55e")}</td>
        </tr>
        <tr>
          <td class="panel"><h3>Demandas por status</h3>${criarPizzaHtml(args.status)}</td>
          <td class="panel"><h3>Responsáveis</h3>${criarBarraHtml(args.responsaveis, "#a855f7")}</td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}

function criarLinhaSvg(dados: EvolucaoItem[]) {
  const lista = dados.slice(0, 12);
  const maximo = Math.max(...lista.map((item) => item.demandas), 1);
  const largura = 460;
  const altura = 220;
  const margem = { top: 20, right: 18, bottom: 28, left: 30 };
  const areaLargura = largura - margem.left - margem.right;
  const areaAltura = altura - margem.top - margem.bottom;
  const pontos = lista.map((item, index) => {
    const x = margem.left + (index / Math.max(lista.length - 1, 1)) * areaLargura;
    const y = margem.top + areaAltura - (item.demandas / maximo) * areaAltura;
    return { ...item, x, y };
  });
  const linha = pontos.map((ponto) => `${ponto.x},${ponto.y}`).join(" ");
  const area = `${margem.left},${margem.top + areaAltura} ${linha} ${
    margem.left + areaLargura
  },${margem.top + areaAltura}`;

  return `<svg width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${area}" fill="rgba(239,68,68,0.12)"/>
    <polyline points="${linha}" fill="none" stroke="#ef4444" stroke-width="3"/>
    ${pontos
      .map(
        (ponto) =>
          `<circle cx="${ponto.x}" cy="${ponto.y}" r="4" fill="#ef4444"/><text x="${
            ponto.x
          }" y="${altura - 8}" text-anchor="middle" font-size="11" fill="#6b7280">${escaparHtml(
            ponto.mes
          )}</text>`
      )
      .join("")}
  </svg>`;
}

function criarBarrasSvg(dados: Item[], cor: string) {
  const lista = dados.slice(0, 8);
  const largura = 460;
  const altura = 220;
  const margemEsquerda = 150;
  const margemDireita = 24;
  const areaLargura = largura - margemEsquerda - margemDireita;
  const barraAltura = 18;
  const espacamento = 8;
  const maximo = Math.max(...lista.map((item) => item.valor), 1);

  return `<svg width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" xmlns="http://www.w3.org/2000/svg">
    ${lista
      .map((item, index) => {
        const y = 18 + index * (barraAltura + espacamento);
        const barWidth = Math.max(10, Math.round((item.valor / maximo) * areaLargura));
        return `
          <text x="0" y="${y + 13}" font-size="12" fill="#4b5563">${escaparHtml(item.titulo)}</text>
          <rect x="${margemEsquerda}" y="${y}" rx="9" ry="9" width="${areaLargura}" height="${barraAltura}" fill="#fee2e2"/>
          <rect x="${margemEsquerda}" y="${y}" rx="9" ry="9" width="${barWidth}" height="${barraAltura}" fill="${cor}"/>
          <text x="${margemEsquerda + barWidth + 8}" y="${y + 13}" font-size="12" fill="#111827">${item.valor}</text>`;
      })
      .join("")}
  </svg>`;
}

function criarDonutSvg(dados: Item[]) {
  const total = dados.reduce((soma, item) => soma + item.valor, 0) || 1;
  const cx = 110;
  const cy = 110;
  const raio = 70;
  const raioInterno = 42;
  let anguloAtual = -Math.PI / 2;

  const segmentos = dados.map((item, index) => {
    const angulo = (item.valor / total) * Math.PI * 2;
    const x1 = cx + raio * Math.cos(anguloAtual);
    const y1 = cy + raio * Math.sin(anguloAtual);
    const x2 = cx + raio * Math.cos(anguloAtual + angulo);
    const y2 = cy + raio * Math.sin(anguloAtual + angulo);
    const x3 = cx + raioInterno * Math.cos(anguloAtual + angulo);
    const y3 = cy + raioInterno * Math.sin(anguloAtual + angulo);
    const x4 = cx + raioInterno * Math.cos(anguloAtual);
    const y4 = cy + raioInterno * Math.sin(anguloAtual);
    const largeArc = angulo > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${raio} ${raio} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${raioInterno} ${raioInterno} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    const legendaY = 26 + index * 22;
    anguloAtual += angulo;

    return {
      path,
      color: cores[index % cores.length],
      legenda: `<rect x="205" y="${legendaY - 10}" width="12" height="12" rx="6" fill="${
        cores[index % cores.length]
      }"/><text x="223" y="${legendaY}" font-size="12" fill="#4b5563">${escaparHtml(
        item.titulo
      )} (${item.valor})</text>`,
    };
  });

  return `<svg width="340" height="240" viewBox="0 0 340 240" xmlns="http://www.w3.org/2000/svg">
    ${segmentos.map((item) => `<path d="${item.path}" fill="${item.color}"/>`).join("")}
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="26" font-weight="700" fill="#111827">${total}</text>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="12" fill="#6b7280">Total</text>
    ${segmentos.map((item) => item.legenda).join("")}
  </svg>`;
}

function criarHtmlPdf(args: {
  periodo: string;
  totalDemandas: number;
  totalProdutos: number;
  totalCanais: number;
  totalEixos: number;
  produtos: Item[];
  canais: Item[];
  eixos: Item[];
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
    <title>Relatório ASCOM STACASA - ${escaparHtml(args.periodo)}</title>
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
      .grid-1-2 { display: grid; grid-template-columns: 1.25fr .75fr; gap: 14px; }
      .viz { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; background: #fff; break-inside: avoid; }
      .viz h2 { margin: 0 0 8px; font-size: 15px; color: #111827; }
      .ranking { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #fff; }
      .ranking h2 { margin: 0 0 8px; font-size: 15px; }
      .ranking-row { display: flex; gap: 10px; align-items: center; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
      .ranking-pos { width: 22px; height: 22px; border-radius: 6px; background: #fee2e2; color: #991b1b; display: flex; align-items: center; justify-content: center; font-weight: 700; }
      .footer { margin-top: 8px; color: #6b7280; font-size: 11px; text-align: right; }
    </style>
  </head>
  <body>
    <main class="report">
      <header class="header">
        <h1>Relatório ASCOM STACASA</h1>
        <div class="meta">Período: ${escaparHtml(args.periodo)}</div>
        <div class="meta">Emitido em: ${escaparHtml(emitidoEm)}</div>
      </header>

      <section class="summary">
        <div class="card"><div class="label">Demandas no período</div><div class="value">${args.totalDemandas}</div></div>
        <div class="card"><div class="label">Produtos produzidos</div><div class="value">${args.totalProdutos}</div></div>
        <div class="card"><div class="label">Canais utilizados</div><div class="value">${args.totalCanais}</div></div>
        <div class="card"><div class="label">Eixos acionados</div><div class="value">${args.totalEixos}</div></div>
      </section>

      <section class="grid-2">
        <section class="viz"><h2>Evolução mensal</h2>${criarLinhaSvg(args.evolucaoMensal)}</section>
        <section class="viz"><h2>Demandas por status</h2>${criarDonutSvg(args.status)}</section>
      </section>

      <section class="grid-3">
        <section class="viz"><h2>Produtos produzidos</h2>${criarBarrasSvg(args.produtos, "#ef4444")}</section>
        <section class="viz"><h2>Eixos de comunicação</h2>${criarBarrasSvg(args.eixos, "#3b82f6")}</section>
        <section class="viz"><h2>Canais utilizados</h2>${criarBarrasSvg(args.canais, "#f97316")}</section>
      </section>

      <section class="grid-1-2">
        <section class="viz"><h2>Setores solicitantes</h2>${criarBarrasSvg(args.setores, "#22c55e")}</section>
        <section class="ranking">
          <h2>Demandas por responsável</h2>
          ${args.responsaveis
            .slice(0, 10)
            .map(
              (item, index) =>
                `<div class="ranking-row"><span class="ranking-pos">${
                  index + 1
                }</span><span style="flex:1">${escaparHtml(item.titulo)}</span><strong>${
                  item.valor
                }</strong></div>`
            )
            .join("")}
        </section>
      </section>

      <div class="footer">Relatório gerado automaticamente pelo SGDC</div>
    </main>
  </body>
</html>`;
}

const tooltipStyle = {
  background: "rgba(15,23,42,.96)",
  border: "1px solid rgba(252,165,165,.22)",
  borderRadius: "10px",
  color: "#fff",
};

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
