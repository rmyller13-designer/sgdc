import { Readable } from "node:stream";
import { google } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarSupabaseAdmin } from "@/lib/supabase-admin";

const CONFIG_ID = "principal";
const BACKUP_BUCKET = "demandas";

export type ConfiguracaoBackupGoogleDrive = {
  id: string;
  ativo: boolean;
  pasta_pai_id: string | null;
  ultimo_backup_em: string | null;
  ultimo_backup_status: string | null;
  ultimo_backup_arquivo: string | null;
  ultimo_backup_erro: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

type ResultadoBackup = {
  pastaMensal: string;
  arquivoIndice: string;
  demandasProcessadas: number;
  anexosEnviados: number;
  anexosComFalha: number;
};

type DemandaResumo = {
  id: number;
  titulo: string | null;
  descricao: string | null;
  setor: string | null;
  cadastrado_por: string | null;
  responsavel: string | null;
  produto: string | null;
  prioridade: string | null;
  status: string | null;
  data_entrega: string | null;
  criado_em: string | null;
};

type DemandaAnexo = {
  id: number;
  demanda_id: number;
  nome_arquivo: string | null;
  tipo_arquivo: string | null;
  caminho_storage: string | null;
};

type ComentarioDemanda = {
  id: number;
  demanda_id: number;
  comentario: string | null;
  criado_em: string | null;
};

type ComentarioAnexo = {
  id: number;
  comentario_id: number;
  demanda_id: number;
  nome_arquivo: string | null;
  tipo_arquivo: string | null;
  caminho_storage: string | null;
};

type HistoricoDemanda = {
  id: number;
  demanda_id: number;
  acao: string | null;
  criado_em: string | null;
};

type DemandaEixo = {
  demanda_id: number;
  eixos_comunicacao?: { nome?: string | null } | null;
};

type DemandaCanal = {
  demanda_id: number;
  canais_comunicacao?: { nome?: string | null } | null;
};

type DemandaProduto = {
  demanda_id: number;
  quantidade: number | null;
  status_producao: string | null;
  produtos?: { nome?: string | null } | null;
};

type DemandaChecklist = {
  demanda_id: number;
  titulo: string | null;
  concluido: boolean | null;
};

type AcervoDemanda = {
  demanda: DemandaResumo;
  eixos: string[];
  canais: string[];
  produtos: Array<{
    nome: string;
    quantidade: number | null;
    status: string | null;
  }>;
  checklist: Array<{
    titulo: string;
    concluido: boolean;
  }>;
  anexosDemanda: DemandaAnexo[];
  comentarios: Array<{
    comentario: string;
    criado_em: string | null;
    anexos: ComentarioAnexo[];
  }>;
  historico: HistoricoDemanda[];
};

export async function obterConfiguracaoBackupGoogleDrive() {
  const admin = criarSupabaseAdmin();
  return garantirConfiguracaoBackup(admin);
}

export async function salvarConfiguracaoBackupGoogleDrive(input: {
  ativo: boolean;
  pastaPaiId: string | null;
}) {
  const admin = criarSupabaseAdmin();

  const { error } = await admin
    .from("configuracoes_backup_google_drive")
    .upsert(
      {
        id: CONFIG_ID,
        ativo: input.ativo,
        pasta_pai_id: normalizarTexto(input.pastaPaiId),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    throw new Error(`Erro ao salvar configuracao do acervo: ${error.message}`);
  }

  return garantirConfiguracaoBackup(admin);
}

export async function executarBackupGoogleDrive() {
  const admin = criarSupabaseAdmin();
  const configuracao = await garantirConfiguracaoBackup(admin);

  if (!configuracao.ativo) {
    throw new Error("Ative o acervo mensal antes de executar o processo.");
  }

  if (!configuracao.pasta_pai_id) {
    throw new Error("Informe o ID da pasta principal do Google Drive.");
  }

  try {
    const drive = await criarClienteGoogleDrive();
    const agora = new Date();
    const pastaMensal = criarNomePastaMensal(agora);
    const pastaMensalId = await garantirPastaDrive(
      drive,
      pastaMensal,
      configuracao.pasta_pai_id
    );

    const acervo = await montarAcervoDemandas(admin);

    await enviarArquivoTexto(drive, {
      pastaId: pastaMensalId,
      nomeArquivo: "Indice das Demandas.html",
      mimeType: "text/html",
      conteudo: criarIndiceHtml(acervo, pastaMensal),
    });

    await enviarArquivoTexto(drive, {
      pastaId: pastaMensalId,
      nomeArquivo: "Indice das Demandas.csv",
      mimeType: "text/csv",
      conteudo: criarIndiceCsv(acervo),
    });

    let anexosEnviados = 0;
    let anexosComFalha = 0;

    for (const item of acervo) {
      const pastaDemandaId = await garantirPastaDrive(
        drive,
        criarNomePastaDemanda(item.demanda),
        pastaMensalId
      );

      await enviarArquivoTexto(drive, {
        pastaId: pastaDemandaId,
        nomeArquivo: "Resumo da Demanda.html",
        mimeType: "text/html",
        conteudo: criarResumoHtml(item),
      });

      await enviarArquivoTexto(drive, {
        pastaId: pastaDemandaId,
        nomeArquivo: "Resumo da Demanda.txt",
        mimeType: "text/plain",
        conteudo: criarResumoTxt(item),
      });

      const pastaArquivosId = await garantirPastaDrive(
        drive,
        "Arquivos",
        pastaDemandaId
      );

      const resultadoArquivos = await enviarArquivosDemanda(
        admin,
        drive,
        pastaArquivosId,
        item
      );

      anexosEnviados += resultadoArquivos.enviados;
      anexosComFalha += resultadoArquivos.falhas;
    }

    await atualizarStatusBackup(admin, {
      ultimo_backup_em: agora.toISOString(),
      ultimo_backup_status: "sucesso",
      ultimo_backup_arquivo: "Indice das Demandas.html",
      ultimo_backup_erro: null,
    });

    return {
      pastaMensal,
      arquivoIndice: "Indice das Demandas.html",
      demandasProcessadas: acervo.length,
      anexosEnviados,
      anexosComFalha,
    } satisfies ResultadoBackup;
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Falha ao gerar o acervo no Google Drive.";

    await atualizarStatusBackup(admin, {
      ultimo_backup_em: new Date().toISOString(),
      ultimo_backup_status: "erro",
      ultimo_backup_erro: mensagem,
    });

    throw error;
  }
}

export async function testarPastaGoogleDrive(pastaPaiId?: string | null) {
  const pastaId = normalizarTexto(pastaPaiId);

  if (!pastaId) {
    throw new Error("Informe o ID da pasta principal do Google Drive.");
  }

  const drive = await criarClienteGoogleDrive();

  const pasta = await drive.files.get({
    fileId: pastaId,
    fields: "id, name, mimeType, driveId, parents",
    supportsAllDrives: true,
  });

  if (!pasta.data.id) {
    throw new Error("Nao foi possivel localizar a pasta informada no Google Drive.");
  }

  const nomeArquivo = `sgdc-teste-${Date.now()}.txt`;
  const conteudo = `Teste SGDC ${new Date().toISOString()}`;

  const criado = await drive.files.create({
    requestBody: {
      name: nomeArquivo,
      parents: [pastaId],
    },
    media: {
      mimeType: "text/plain",
      body: Readable.from(Buffer.from(conteudo, "utf-8")),
    },
    fields: "id, name, parents, driveId",
    supportsAllDrives: true,
  });

  if (!criado.data.id) {
    throw new Error("Nao foi possivel gravar o arquivo de teste no Google Drive.");
  }

  await drive.files.delete({
    fileId: criado.data.id,
    supportsAllDrives: true,
  });

  return {
    pastaId,
    pastaNome: pasta.data.name || "Pasta",
    driveId: pasta.data.driveId || null,
    escritaOk: true,
  };
}

export function obterStatusInfraBackup() {
  return {
    credenciaisGoogleOk: Boolean(
      process.env.GOOGLE_DRIVE_CLIENT_EMAIL && process.env.GOOGLE_DRIVE_PRIVATE_KEY
    ),
    cronSecretOk: Boolean(process.env.CRON_SECRET),
  };
}

export function validarAcessoCron(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new Error("Configure CRON_SECRET na Vercel para habilitar o acervo automatico.");
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    throw new Error("Acesso nao autorizado ao agendador do acervo.");
  }
}

export function hojeEhUltimoDiaDoMes(data = new Date()) {
  const amanha = new Date(data);
  amanha.setDate(data.getDate() + 1);
  return amanha.getMonth() !== data.getMonth();
}

async function criarClienteGoogleDrive() {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Configure GOOGLE_DRIVE_CLIENT_EMAIL e GOOGLE_DRIVE_PRIVATE_KEY na Vercel."
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  await auth.authorize();

  return google.drive({
    version: "v3",
    auth,
  });
}

async function garantirConfiguracaoBackup(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("configuracoes_backup_google_drive")
    .select("*")
    .eq("id", CONFIG_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao carregar configuracao do acervo: ${error.message}`);
  }

  if (data) {
    return data as ConfiguracaoBackupGoogleDrive;
  }

  const { error: insertError } = await admin
    .from("configuracoes_backup_google_drive")
    .insert({
      id: CONFIG_ID,
      ativo: false,
      pasta_pai_id: null,
    });

  if (insertError) {
    throw new Error(`Erro ao iniciar configuracao do acervo: ${insertError.message}`);
  }

  return {
    id: CONFIG_ID,
    ativo: false,
    pasta_pai_id: null,
    ultimo_backup_em: null,
    ultimo_backup_status: null,
    ultimo_backup_arquivo: null,
    ultimo_backup_erro: null,
    criado_em: null,
    atualizado_em: null,
  } satisfies ConfiguracaoBackupGoogleDrive;
}

async function atualizarStatusBackup(
  admin: SupabaseClient,
  payload: Partial<ConfiguracaoBackupGoogleDrive>
) {
  const { error } = await admin
    .from("configuracoes_backup_google_drive")
    .update({
      ...payload,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", CONFIG_ID);

  if (error) {
    throw new Error(`Erro ao atualizar status do acervo: ${error.message}`);
  }
}

async function montarAcervoDemandas(admin: SupabaseClient) {
  const { data: demandas, error: demandasError } = await admin
    .from("demandas_completas")
    .select(
      "id, titulo, descricao, setor, cadastrado_por, responsavel, produto, prioridade, status, data_entrega, criado_em"
    )
    .order("id", { ascending: false });

  if (demandasError) {
    throw new Error(`Erro ao carregar demandas do acervo: ${demandasError.message}`);
  }

  const demandasLista = (demandas || []) as DemandaResumo[];

  if (demandasLista.length === 0) {
    return [] as AcervoDemanda[];
  }

  const ids = demandasLista.map((item) => item.id);

  const [
    anexosDemandaResult,
    comentariosResult,
    comentarioAnexosResult,
    historicoResult,
    eixosResult,
    canaisResult,
    produtosResult,
    checklistResult,
  ] = await Promise.all([
    admin
      .from("demanda_anexos")
      .select("id, demanda_id, nome_arquivo, tipo_arquivo, caminho_storage")
      .in("demanda_id", ids),
    admin
      .from("comentarios_demanda")
      .select("id, demanda_id, comentario, criado_em")
      .in("demanda_id", ids)
      .order("criado_em", { ascending: true }),
    admin
      .from("comentario_anexos")
      .select("id, comentario_id, demanda_id, nome_arquivo, tipo_arquivo, caminho_storage")
      .in("demanda_id", ids),
    admin
      .from("historico_demanda")
      .select("id, demanda_id, acao, criado_em")
      .in("demanda_id", ids)
      .order("criado_em", { ascending: true }),
    admin
      .from("demanda_eixos")
      .select("demanda_id, eixos_comunicacao(nome)")
      .in("demanda_id", ids),
    admin
      .from("demanda_canais")
      .select("demanda_id, canais_comunicacao(nome)")
      .in("demanda_id", ids),
    admin
      .from("demanda_produtos_quantidade")
      .select("demanda_id, quantidade, status_producao, produtos(nome)")
      .in("demanda_id", ids),
    admin
      .from("demanda_checklist")
      .select("demanda_id, titulo, concluido")
      .in("demanda_id", ids),
  ]);

  checarErroConsulta(anexosDemandaResult.error, "anexos das demandas");
  checarErroConsulta(comentariosResult.error, "comentarios");
  checarErroConsulta(comentarioAnexosResult.error, "anexos dos comentarios");
  checarErroConsulta(historicoResult.error, "historico");
  checarErroConsulta(eixosResult.error, "eixos");
  checarErroConsulta(canaisResult.error, "canais");
  checarErroConsulta(produtosResult.error, "produtos");
  checarErroConsulta(checklistResult.error, "checklist");

  const anexosDemanda = (anexosDemandaResult.data || []) as DemandaAnexo[];
  const comentarios = (comentariosResult.data || []) as ComentarioDemanda[];
  const comentarioAnexos = (comentarioAnexosResult.data || []) as ComentarioAnexo[];
  const historico = (historicoResult.data || []) as HistoricoDemanda[];
  const eixos = (eixosResult.data || []) as DemandaEixo[];
  const canais = (canaisResult.data || []) as DemandaCanal[];
  const produtos = (produtosResult.data || []) as DemandaProduto[];
  const checklist = (checklistResult.data || []) as DemandaChecklist[];

  return demandasLista.map((demanda) => ({
    demanda,
    eixos: eixos
      .filter((item) => item.demanda_id === demanda.id)
      .map((item) => item.eixos_comunicacao?.nome || "")
      .filter(Boolean),
    canais: canais
      .filter((item) => item.demanda_id === demanda.id)
      .map((item) => item.canais_comunicacao?.nome || "")
      .filter(Boolean),
    produtos: produtos
      .filter((item) => item.demanda_id === demanda.id)
      .map((item) => ({
        nome: item.produtos?.nome || "Produto",
        quantidade: item.quantidade,
        status: item.status_producao,
      })),
    checklist: checklist
      .filter((item) => item.demanda_id === demanda.id)
      .map((item) => ({
        titulo: item.titulo || "Item",
        concluido: Boolean(item.concluido),
      })),
    anexosDemanda: anexosDemanda.filter((item) => item.demanda_id === demanda.id),
    comentarios: comentarios
      .filter((item) => item.demanda_id === demanda.id)
      .map((item) => ({
        comentario: item.comentario || "",
        criado_em: item.criado_em,
        anexos: comentarioAnexos.filter((anexo) => anexo.comentario_id === item.id),
      })),
    historico: historico.filter((item) => item.demanda_id === demanda.id),
  }));
}

async function garantirPastaDrive(
  drive: ReturnType<typeof google.drive>,
  nome: string,
  pastaPaiId: string
) {
  const busca = await drive.files.list({
    q: [
      `'${pastaPaiId}' in parents`,
      `name = '${escaparTextoDrive(nome)}'`,
      "mimeType = 'application/vnd.google-apps.folder'",
      "trashed = false",
    ].join(" and "),
    fields: "files(id, name)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const existente = busca.data.files?.[0];
  if (existente?.id) return existente.id;

  const criada = await drive.files.create({
    requestBody: {
      name: nome,
      mimeType: "application/vnd.google-apps.folder",
      parents: [pastaPaiId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!criada.data.id) {
    throw new Error(`Nao foi possivel criar a pasta ${nome} no Google Drive.`);
  }

  return criada.data.id;
}

async function enviarArquivoTexto(
  drive: ReturnType<typeof google.drive>,
  args: {
    pastaId: string;
    nomeArquivo: string;
    mimeType: string;
    conteudo: string;
  }
) {
  const stream = Readable.from(Buffer.from(args.conteudo, "utf-8"));

  await drive.files.create({
    requestBody: {
      name: args.nomeArquivo,
      parents: [args.pastaId],
    },
    media: {
      mimeType: args.mimeType,
      body: stream,
    },
    fields: "id",
    supportsAllDrives: true,
  });
}

async function enviarArquivosDemanda(
  admin: SupabaseClient,
  drive: ReturnType<typeof google.drive>,
  pastaArquivosId: string,
  item: AcervoDemanda
) {
  let enviados = 0;
  let falhas = 0;

  const arquivos = [
    ...item.anexosDemanda.map((anexo) => ({
      nome: anexo.nome_arquivo,
      tipo: anexo.tipo_arquivo,
      caminho: anexo.caminho_storage,
    })),
    ...item.comentarios.flatMap((comentario) =>
      comentario.anexos.map((anexo) => ({
        nome: anexo.nome_arquivo,
        tipo: anexo.tipo_arquivo,
        caminho: anexo.caminho_storage,
      }))
    ),
  ];

  const caminhosJaEnviados = new Set<string>();

  for (const arquivo of arquivos) {
    const caminho = normalizarTexto(arquivo.caminho);
    if (!caminho || caminhosJaEnviados.has(caminho)) continue;
    caminhosJaEnviados.add(caminho);

    try {
      const { data, error } = await admin.storage
        .from(BACKUP_BUCKET)
        .download(caminho);

      if (error || !data) {
        falhas += 1;
        continue;
      }

      const arrayBuffer = await data.arrayBuffer();
      const nomeArquivo =
        sanitizarNomeArquivo(arquivo.nome) || caminho.split("/").pop() || "arquivo";

      await drive.files.create({
        requestBody: {
          name: nomeArquivo,
          parents: [pastaArquivosId],
        },
        media: {
          mimeType: arquivo.tipo || "application/octet-stream",
          body: Readable.from(Buffer.from(arrayBuffer)),
        },
        fields: "id",
        supportsAllDrives: true,
      });

      enviados += 1;
    } catch {
      falhas += 1;
    }
  }

  return { enviados, falhas };
}

function criarNomePastaMensal(data: Date) {
  const meses = [
    "JANEIRO",
    "FEVEREIRO",
    "MARCO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO",
  ];

  return `Backup_${meses[data.getMonth()]}_${data.getFullYear()}`;
}

function criarNomePastaDemanda(demanda: DemandaResumo) {
  const titulo = sanitizarNomeArquivo(demanda.titulo) || `Demanda ${demanda.id}`;
  return `${String(demanda.id).padStart(4, "0")} - ${titulo}`;
}

function criarIndiceHtml(acervo: AcervoDemanda[], pastaMensal: string) {
  const linhas = acervo
    .map(
      (item) => `
        <tr>
          <td>${item.demanda.id}</td>
          <td>${escaparHtml(item.demanda.titulo || "Sem titulo")}</td>
          <td>${escaparHtml(formatarHumano(item.demanda.status))}</td>
          <td>${escaparHtml(item.demanda.responsavel || "Nao definido")}</td>
          <td>${escaparHtml(item.demanda.setor || "Nao informado")}</td>
          <td>${escaparHtml(formatarData(item.demanda.data_entrega))}</td>
          <td>${item.anexosDemanda.length}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escaparHtml(pastaMensal)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; background: #faf7f7; color: #1f2937; }
    h1 { color: #991b1b; margin-bottom: 8px; }
    p { color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; background: #fff; }
    th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { background: #7f1d1d; color: #fff; }
    tr:nth-child(even) { background: #f9fafb; }
  </style>
</head>
<body>
  <h1>Acervo mensal de demandas</h1>
  <p><strong>Pasta:</strong> ${escaparHtml(pastaMensal)}</p>
  <p><strong>Total de demandas:</strong> ${acervo.length}</p>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Titulo</th>
        <th>Status</th>
        <th>Responsavel</th>
        <th>Setor</th>
        <th>Entrega</th>
        <th>Anexos</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
</body>
</html>`;
}

function criarIndiceCsv(acervo: AcervoDemanda[]) {
  const linhas = [
    [
      "ID",
      "Titulo",
      "Status",
      "Responsavel",
      "Setor",
      "Solicitante",
      "Prioridade",
      "Entrega",
      "Produto Inicial",
      "Quantidade de Anexos",
    ].join(";"),
  ];

  for (const item of acervo) {
    linhas.push(
      [
        item.demanda.id,
        csvSeguro(item.demanda.titulo),
        csvSeguro(formatarHumano(item.demanda.status)),
        csvSeguro(item.demanda.responsavel),
        csvSeguro(item.demanda.setor),
        csvSeguro(item.demanda.cadastrado_por),
        csvSeguro(formatarHumano(item.demanda.prioridade)),
        csvSeguro(formatarData(item.demanda.data_entrega)),
        csvSeguro(item.demanda.produto),
        String(item.anexosDemanda.length),
      ].join(";")
    );
  }

  return "\uFEFF" + linhas.join("\n");
}

function criarResumoHtml(item: AcervoDemanda) {
  const d = item.demanda;
  const lista = (valores: string[]) =>
    valores.length
      ? `<ul>${valores.map((valor) => `<li>${escaparHtml(valor)}</li>`).join("")}</ul>`
      : "<p>Nao informado.</p>";

  const produtos = item.produtos.length
    ? `<ul>${item.produtos
        .map(
          (produto) =>
            `<li>${escaparHtml(produto.nome)} - Quantidade: ${produto.quantidade ?? 0} - Status: ${escaparHtml(formatarHumano(produto.status))}</li>`
        )
        .join("")}</ul>`
    : "<p>Nao informado.</p>";

  const checklist = item.checklist.length
    ? `<ul>${item.checklist
        .map(
          (check) =>
            `<li>${check.concluido ? "Concluido" : "Pendente"} - ${escaparHtml(check.titulo)}</li>`
        )
        .join("")}</ul>`
    : "<p>Nao informado.</p>";

  const comentarios = item.comentarios.length
    ? item.comentarios
        .map(
          (comentario) => `
            <div class="box">
              <strong>${escaparHtml(formatarDataHora(comentario.criado_em))}</strong>
              <p>${escaparHtml(comentario.comentario || "Sem texto")}</p>
              ${
                comentario.anexos.length
                  ? `<p><strong>Anexos do comentario:</strong> ${comentario.anexos
                      .map((anexo) => escaparHtml(anexo.nome_arquivo || "arquivo"))
                      .join(", ")}</p>`
                  : ""
              }
            </div>
          `
        )
        .join("")
    : "<p>Sem comentarios registrados.</p>";

  const historico = item.historico.length
    ? `<ul>${item.historico
        .map(
          (registro) =>
            `<li>${escaparHtml(formatarDataHora(registro.criado_em))} - ${escaparHtml(registro.acao || "")}</li>`
        )
        .join("")}</ul>`
    : "<p>Sem historico registrado.</p>";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Demanda #${d.id}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 28px; background: #fcfcfc; color: #1f2937; }
    h1 { color: #991b1b; margin-bottom: 8px; }
    h2 { color: #7f1d1d; margin-top: 28px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 12px; margin-top: 20px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
    .box { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
    p, li { line-height: 1.55; }
  </style>
</head>
<body>
  <h1>Demanda #${d.id} - ${escaparHtml(d.titulo || "Sem titulo")}</h1>
  <p><strong>Descricao:</strong> ${escaparHtml(removerHtml(d.descricao) || "Sem descricao")}</p>

  <div class="grid">
    <div class="card"><strong>Status</strong><br />${escaparHtml(formatarHumano(d.status))}</div>
    <div class="card"><strong>Prioridade</strong><br />${escaparHtml(formatarHumano(d.prioridade))}</div>
    <div class="card"><strong>Setor</strong><br />${escaparHtml(d.setor || "Nao informado")}</div>
    <div class="card"><strong>Solicitante</strong><br />${escaparHtml(d.cadastrado_por || "Nao informado")}</div>
    <div class="card"><strong>Responsavel</strong><br />${escaparHtml(d.responsavel || "Nao definido")}</div>
    <div class="card"><strong>Entrega</strong><br />${escaparHtml(formatarData(d.data_entrega))}</div>
    <div class="card"><strong>Produto inicial</strong><br />${escaparHtml(d.produto || "Nao informado")}</div>
    <div class="card"><strong>Criada em</strong><br />${escaparHtml(formatarDataHora(d.criado_em))}</div>
  </div>

  <h2>Eixos</h2>
  ${lista(item.eixos)}

  <h2>Canais</h2>
  ${lista(item.canais)}

  <h2>Produtos produzidos</h2>
  ${produtos}

  <h2>Checklist</h2>
  ${checklist}

  <h2>Anexos da demanda</h2>
  ${lista(item.anexosDemanda.map((anexo) => anexo.nome_arquivo || "arquivo"))}

  <h2>Comentarios</h2>
  ${comentarios}

  <h2>Historico</h2>
  ${historico}
</body>
</html>`;
}

function criarResumoTxt(item: AcervoDemanda) {
  const d = item.demanda;

  return [
    `Demanda #${d.id} - ${d.titulo || "Sem titulo"}`,
    "",
    `Descricao: ${removerHtml(d.descricao) || "Sem descricao"}`,
    `Status: ${formatarHumano(d.status)}`,
    `Prioridade: ${formatarHumano(d.prioridade)}`,
    `Setor: ${d.setor || "Nao informado"}`,
    `Solicitante: ${d.cadastrado_por || "Nao informado"}`,
    `Responsavel: ${d.responsavel || "Nao definido"}`,
    `Entrega: ${formatarData(d.data_entrega)}`,
    `Produto inicial: ${d.produto || "Nao informado"}`,
    "",
    `Eixos: ${item.eixos.join(", ") || "Nao informado"}`,
    `Canais: ${item.canais.join(", ") || "Nao informado"}`,
    `Produtos: ${
      item.produtos.length
        ? item.produtos
            .map(
              (produto) =>
                `${produto.nome} (qtd: ${produto.quantidade ?? 0}, status: ${formatarHumano(produto.status)})`
            )
            .join(", ")
        : "Nao informado"
    }`,
    `Checklist: ${
      item.checklist.length
        ? item.checklist
            .map((check) => `${check.concluido ? "Concluido" : "Pendente"} - ${check.titulo}`)
            .join(" | ")
        : "Nao informado"
    }`,
    `Anexos: ${
      item.anexosDemanda.length
        ? item.anexosDemanda.map((anexo) => anexo.nome_arquivo || "arquivo").join(", ")
        : "Nenhum"
    }`,
  ].join("\n");
}

function checarErroConsulta(erro: { message: string } | null, contexto: string) {
  if (erro && !tabelaOuColunaInexistente(erro.message)) {
    throw new Error(`Erro ao carregar ${contexto}: ${erro.message}`);
  }
}

function tabelaOuColunaInexistente(mensagem: string) {
  const texto = mensagem.toLowerCase();
  return (
    texto.includes("relation") ||
    texto.includes("does not exist") ||
    texto.includes("column") ||
    texto.includes("could not find")
  );
}

function removerHtml(valor?: string | null) {
  return (valor || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatarHumano(valor?: string | null) {
  if (!valor) return "Nao informado";
  return valor
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatarData(valor?: string | null) {
  if (!valor) return "Nao informado";
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return "Nao informado";
  try {
    return new Date(valor).toLocaleString("pt-BR");
  } catch {
    return valor;
  }
}

function escaparTextoDrive(valor: string) {
  return valor.replace(/'/g, "\\'");
}

function normalizarTexto(valor?: string | null) {
  const texto = valor?.trim();
  return texto ? texto : null;
}

function sanitizarNomeArquivo(valor?: string | null) {
  return (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function csvSeguro(valor?: string | null) {
  const texto = (valor || "").replace(/"/g, '""');
  return `"${texto}"`;
}
