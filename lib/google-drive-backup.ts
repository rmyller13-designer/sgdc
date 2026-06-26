import "server-only";
import { Readable } from "node:stream";
import { google } from "googleapis";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
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
  arquivoIndicePdf: string;
  demandasProcessadas: number;
  pdfsGerados: number;
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

type ImagemResumo = {
  nome: string;
  mimeType: string;
  bytes: Uint8Array;
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

    const indicePdf = await criarIndicePdf(acervo, pastaMensal);
    await enviarArquivoBuffer(drive, {
      pastaId: pastaMensalId,
      nomeArquivo: "Indice das Demandas.pdf",
      mimeType: "application/pdf",
      conteudo: indicePdf,
    });

    let anexosEnviados = 0;
    let anexosComFalha = 0;
    let pdfsGerados = 1;

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

      const imagensResumo = await baixarImagensResumo(admin, item);
      const resumoPdf = await criarResumoPdf(item, imagensResumo);
      await enviarArquivoBuffer(drive, {
        pastaId: pastaDemandaId,
        nomeArquivo: "Resumo da Demanda.pdf",
        mimeType: "application/pdf",
        conteudo: resumoPdf,
      });
      pdfsGerados += 1;

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
      arquivoIndicePdf: "Indice das Demandas.pdf",
      demandasProcessadas: acervo.length,
      pdfsGerados,
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

export async function obterPastaMensalAtualGoogleDrive() {
  const configuracao = await obterConfiguracaoBackupGoogleDrive();
  const pastaPaiId = normalizarTexto(configuracao.pasta_pai_id);

  if (!pastaPaiId) {
    throw new Error("Pasta principal do acervo ainda nao foi configurada.");
  }

  const drive = await criarClienteGoogleDrive();
  const nomePasta = criarNomePastaMensal(new Date());
  const pasta = await buscarPastaDrivePorNome(drive, nomePasta, pastaPaiId);

  if (!pasta?.id) {
    throw new Error("A pasta do mes ainda nao foi gerada.");
  }

  return {
    id: pasta.id,
    nome: pasta.name || nomePasta,
    url: `https://drive.google.com/drive/folders/${pasta.id}`,
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

  const demandasLista = ((demandas || []) as DemandaResumo[]).filter((demanda) =>
    statusEntraNoAcervo(demanda.status)
  );

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

function statusEntraNoAcervo(status?: string | null) {
  const texto = (status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_]+/g, "")
    .toUpperCase();

  return texto === "CONCLUIDO" || texto.startsWith("ARQUIV");
}

async function garantirPastaDrive(
  drive: ReturnType<typeof google.drive>,
  nome: string,
  pastaPaiId: string
) {
  const existente = await buscarPastaDrivePorNome(drive, nome, pastaPaiId);
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
  await enviarArquivoStream(drive, {
    pastaId: args.pastaId,
    nomeArquivo: args.nomeArquivo,
    mimeType: args.mimeType,
    corpo: Readable.from(Buffer.from(args.conteudo, "utf-8")),
  });
}

async function enviarArquivoBuffer(
  drive: ReturnType<typeof google.drive>,
  args: {
    pastaId: string;
    nomeArquivo: string;
    mimeType: string;
    conteudo: Uint8Array;
  }
) {
  await enviarArquivoStream(drive, {
    pastaId: args.pastaId,
    nomeArquivo: args.nomeArquivo,
    mimeType: args.mimeType,
    corpo: Readable.from(Buffer.from(args.conteudo)),
  });
}

async function enviarArquivoStream(
  drive: ReturnType<typeof google.drive>,
  args: {
    pastaId: string;
    nomeArquivo: string;
    mimeType: string;
    corpo: Readable;
  }
) {
  await drive.files.create({
    requestBody: {
      name: args.nomeArquivo,
      parents: [args.pastaId],
    },
    media: {
      mimeType: args.mimeType,
      body: args.corpo,
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

async function baixarImagensResumo(
  admin: SupabaseClient,
  item: AcervoDemanda
) {
  const imagens: ImagemResumo[] = [];
  const caminhosJaLidos = new Set<string>();
  const candidatos = [
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

  for (const arquivo of candidatos) {
    if (imagens.length >= 3) break;

    const caminho = normalizarTexto(arquivo.caminho);
    const mimeType = arquivo.tipo || "";

    if (!caminho || caminhosJaLidos.has(caminho) || !mimeType.startsWith("image/")) {
      continue;
    }

    caminhosJaLidos.add(caminho);

    try {
      const { data, error } = await admin.storage.from(BACKUP_BUCKET).download(caminho);
      if (error || !data) continue;

      imagens.push({
        nome: arquivo.nome || caminho.split("/").pop() || "imagem",
        mimeType,
        bytes: new Uint8Array(await data.arrayBuffer()),
      });
    } catch {
      continue;
    }
  }

  return imagens;
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
  const resumo = resumirAcervo(acervo);
  const linhas = acervo
    .map(
      (item) => `
        <tr>
          <td>${item.demanda.id}</td>
          <td>${escaparHtml(item.demanda.titulo || "Sem titulo")}</td>
          <td>${criarBadgeStatusHtml(item.demanda.status)}</td>
          <td>${escaparHtml(item.demanda.responsavel || "Nao definido")}</td>
          <td>${escaparHtml(item.demanda.setor || "Nao informado")}</td>
          <td>${escaparHtml(formatarData(item.demanda.data_entrega))}</td>
          <td>${contarArquivosDaDemanda(item)}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escaparHtml(pastaMensal)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 32px; background: #f6f3f4; color: #1f2937; }
    .hero { background: linear-gradient(135deg, #7f1d1d, #991b1b 58%, #450a0a); color: #fff; border-radius: 22px; padding: 28px 30px; box-shadow: 0 20px 40px rgba(69, 10, 10, .2); }
    .eyebrow { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: rgba(254, 226, 226, .92); margin-bottom: 10px; }
    h1 { margin: 0 0 8px; font-size: 34px; line-height: 1.1; }
    .hero p { margin: 0; max-width: 780px; line-height: 1.6; color: rgba(255,255,255,.86); }
    .meta { margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap; }
    .meta span, .pill { display: inline-flex; align-items: center; padding: 7px 11px; border-radius: 999px; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.15); font-size: 12px; font-weight: 700; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 20px 0 24px; }
    .stat { background: #fff; border: 1px solid #eadfe1; border-radius: 18px; padding: 18px; box-shadow: 0 12px 28px rgba(15, 23, 42, .06); }
    .stat label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #9f1239; margin-bottom: 8px; font-weight: 700; }
    .stat strong { font-size: 30px; color: #111827; }
    .panel { background: #fff; border: 1px solid #eadfe1; border-radius: 20px; padding: 20px; box-shadow: 0 16px 34px rgba(15, 23, 42, .08); }
    .panel h2 { margin: 0 0 6px; color: #7f1d1d; font-size: 22px; }
    .panel p { margin: 0 0 18px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 14px; text-align: left; vertical-align: top; border-bottom: 1px solid #ede7e8; }
    th { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #7f1d1d; background: #fff7f8; }
    td { color: #1f2937; }
    tr:hover td { background: #fffafb; }
    .status { display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid transparent; white-space: nowrap; }
    .status.concluido { background: #ecfdf3; color: #047857; border-color: #a7f3d0; }
    .status.arquivado { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .status.outro { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .footer { margin-top: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <section class="hero">
    <div class="eyebrow">ASCOM STACASA</div>
    <h1>Acervo mensal de demandas</h1>
    <p>Indice institucional do SGDC com as demandas finalizadas no periodo, organizado para consulta rapida da equipe e reaproveitamento editorial.</p>
    <div class="meta">
      <span>${escaparHtml(pastaMensal)}</span>
      <span>${acervo.length} demanda(s)</span>
      <span>${resumo.totalAnexos} arquivo(s)</span>
    </div>
  </section>

  <section class="stats">
    <div class="stat"><label>Demandas</label><strong>${acervo.length}</strong></div>
    <div class="stat"><label>Anexos</label><strong>${resumo.totalAnexos}</strong></div>
    <div class="stat"><label>Setores</label><strong>${resumo.totalSetores}</strong></div>
    <div class="stat"><label>Responsaveis</label><strong>${resumo.totalResponsaveis}</strong></div>
  </section>

  <section class="panel">
    <h2>Indice geral</h2>
    <p>Lista consolidada para navegar pelas demandas exportadas no Drive.</p>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Titulo</th>
          <th>Status</th>
          <th>Responsavel</th>
          <th>Setor</th>
          <th>Entrega</th>
          <th>Arquivos</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="footer">Gerado automaticamente pelo SGDC.</div>
  </section>
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

async function criarIndicePdf(acervo: AcervoDemanda[], pastaMensal: string) {
  const pdf = await PDFDocument.create();
  const fonteTitulo = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonteTexto = await pdf.embedFont(StandardFonts.Helvetica);
  const resumo = resumirAcervo(acervo);
  let pagina = pdf.addPage([595.28, 841.89]);
  let y = 800;

  pagina.drawRectangle({
    x: 28,
    y: 726,
    width: 539,
    height: 88,
    color: rgb(0.5, 0.11, 0.11),
  });

  y = desenharTextoBranco(
    pagina,
    fonteTexto,
    10,
    "ASCOM STACASA",
    46,
    786
  );
  y = desenharTextoBranco(
    pagina,
    fonteTitulo,
    22,
    `Acervo mensal - ${pastaMensal}`,
    46,
    764
  );
  y = desenharTextoBranco(
    pagina,
    fonteTexto,
    11,
    `Demandas: ${acervo.length}  |  Arquivos: ${resumo.totalAnexos}  |  Setores: ${resumo.totalSetores}`,
    46,
    738
  );

  desenharCartaoResumoPdf(pagina, fonteTexto, fonteTitulo, 40, 670, "Demandas", String(acervo.length));
  desenharCartaoResumoPdf(pagina, fonteTexto, fonteTitulo, 170, 670, "Arquivos", String(resumo.totalAnexos));
  desenharCartaoResumoPdf(pagina, fonteTexto, fonteTitulo, 300, 670, "Setores", String(resumo.totalSetores));
  desenharCartaoResumoPdf(
    pagina,
    fonteTexto,
    fonteTitulo,
    430,
    670,
    "Responsaveis",
    String(resumo.totalResponsaveis)
  );

  y = 620;

  for (const item of acervo) {
    if (y < 120) {
      pagina = pdf.addPage([595.28, 841.89]);
      y = 800;
    }

    const linhas = [
      `#${item.demanda.id} - ${item.demanda.titulo || "Sem titulo"}`,
      `Status: ${formatarHumano(item.demanda.status)} | Prioridade: ${formatarHumano(item.demanda.prioridade)}`,
      `Responsavel: ${item.demanda.responsavel || "Nao definido"} | Setor: ${item.demanda.setor || "Nao informado"}`,
      `Entrega: ${formatarData(item.demanda.data_entrega)} | Arquivos: ${contarArquivosDaDemanda(item)}`,
    ];

    pagina.drawRectangle({
      x: 36,
      y: y - 66,
      width: 523,
      height: 72,
      color: rgb(0.99, 0.985, 0.985),
      borderColor: rgb(0.91, 0.84, 0.85),
      borderWidth: 1,
    });

    desenharTagStatusPdf(
      pagina,
      fonteTexto,
      formatarHumano(item.demanda.status),
      440,
      y - 22,
      obterCoresStatusPdf(item.demanda.status)
    );

    let linhaY = y - 20;
    for (const linha of linhas) {
      pagina.drawText(truncarTexto(linha, 95), {
        x: 48,
        y: linhaY,
        size: linha === linhas[0] ? 11 : 9,
        font: linha === linhas[0] ? fonteTitulo : fonteTexto,
        color: rgb(0.12, 0.14, 0.18),
      });
      linhaY -= 14;
    }

    y -= 84;
  }

  return pdf.save();
}

function criarResumoHtml(item: AcervoDemanda) {
  const d = item.demanda;
  const lista = (valores: string[], vazio = "Nao informado.") =>
    valores.length
      ? `<div class="chips">${valores
          .map((valor) => `<span class="chip">${escaparHtml(valor)}</span>`)
          .join("")}</div>`
      : `<p class="muted">${vazio}</p>`;

  const produtos = item.produtos.length
    ? `<div class="stack">${item.produtos
        .map(
          (produto) =>
            `<div class="row">
              <strong>${escaparHtml(produto.nome)}</strong>
              <span>Quantidade: ${produto.quantidade ?? 0}</span>
              <span>Status: ${escaparHtml(formatarHumano(produto.status))}</span>
            </div>`
        )
        .join("")}</div>`
    : `<p class="muted">Nenhum produto produzido informado.</p>`;

  const checklist = item.checklist.length
    ? `<div class="stack">${item.checklist
        .map(
          (check) =>
            `<div class="row">
              <strong>${escaparHtml(check.titulo)}</strong>
              <span class="pill ${check.concluido ? "ok" : "pendente"}">${check.concluido ? "Concluido" : "Pendente"}</span>
            </div>`
        )
        .join("")}</div>`
    : `<p class="muted">Sem checklist registrado.</p>`;

  const comentarios = item.comentarios.length
    ? item.comentarios
        .map(
          (comentario) => `
            <div class="box timeline">
              <strong>${escaparHtml(formatarDataHora(comentario.criado_em))}</strong>
              <p>${escaparHtml(comentario.comentario || "Sem texto")}</p>
              ${
                comentario.anexos.length
                  ? `<p class="muted"><strong>Anexos do comentario:</strong> ${comentario.anexos
                      .map((anexo) => escaparHtml(anexo.nome_arquivo || "arquivo"))
                      .join(", ")}</p>`
                  : ""
              }
            </div>
          `
        )
        .join("")
    : '<p class="muted">Sem comentarios registrados.</p>';

  const historico = item.historico.length
    ? `<div class="stack">${item.historico
        .map(
          (registro) =>
            `<div class="row">
              <strong>${escaparHtml(formatarDataHora(registro.criado_em))}</strong>
              <span>${escaparHtml(registro.acao || "")}</span>
            </div>`
        )
        .join("")}</div>`
    : '<p class="muted">Sem historico registrado.</p>';

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Demanda #${d.id}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 28px; background: #f7f4f5; color: #1f2937; }
    .hero { background: linear-gradient(135deg, #7f1d1d, #991b1b 60%, #450a0a); color: #fff; border-radius: 22px; padding: 26px 28px; box-shadow: 0 22px 40px rgba(69,10,10,.18); }
    .eyebrow { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: rgba(254, 226, 226, .92); margin-bottom: 8px; }
    h1 { margin: 0; font-size: 30px; line-height: 1.15; }
    .hero p { margin: 12px 0 0; color: rgba(255,255,255,.9); line-height: 1.7; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
    .meta .pill { background: rgba(255,255,255,.14); color: #fff; border: 1px solid rgba(255,255,255,.16); }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 12px; margin-top: 18px; }
    .card, .box, .section { background: #fff; border: 1px solid #eadfe1; border-radius: 16px; padding: 16px; box-shadow: 0 12px 28px rgba(15, 23, 42, .06); }
    .label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #9f1239; margin-bottom: 6px; font-weight: 700; }
    .value { font-size: 16px; font-weight: 700; color: #111827; }
    .muted { color: #6b7280; line-height: 1.65; }
    .section { margin-top: 18px; }
    .section h2 { margin: 0 0 14px; color: #7f1d1d; font-size: 20px; }
    .chips { display: flex; flex-wrap: wrap; gap: 10px; }
    .chip, .pill { display: inline-flex; align-items: center; padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .chip { background: #fff7f8; color: #9f1239; border: 1px solid #fecdd3; }
    .pill.status-concluido, .pill.ok { background: #ecfdf3; color: #047857; border: 1px solid #a7f3d0; }
    .pill.status-arquivado { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .pill.status-outro, .pill.pendente { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .stack { display: flex; flex-direction: column; gap: 10px; }
    .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 14px; background: #fffafb; border: 1px solid #f3e8ea; }
    .timeline { border-left: 4px solid #fca5a5; }
    p { line-height: 1.7; }
  </style>
</head>
<body>
  <section class="hero">
    <div class="eyebrow">ASCOM STACASA</div>
    <h1>Demanda #${d.id} - ${escaparHtml(d.titulo || "Sem titulo")}</h1>
    <p>${escaparHtml(removerHtml(d.descricao) || "Sem descricao")}</p>
    <div class="meta">
      <span class="pill ${obterClasseStatusHtml(d.status)}">${escaparHtml(formatarHumano(d.status))}</span>
      <span class="pill">${escaparHtml(formatarHumano(d.prioridade))}</span>
      <span class="pill">${escaparHtml(formatarData(d.data_entrega))}</span>
    </div>
  </section>

  <div class="grid">
    <div class="card"><span class="label">Status</span><span class="value">${escaparHtml(formatarHumano(d.status))}</span></div>
    <div class="card"><span class="label">Prioridade</span><span class="value">${escaparHtml(formatarHumano(d.prioridade))}</span></div>
    <div class="card"><span class="label">Setor</span><span class="value">${escaparHtml(d.setor || "Nao informado")}</span></div>
    <div class="card"><span class="label">Solicitante</span><span class="value">${escaparHtml(d.cadastrado_por || "Nao informado")}</span></div>
    <div class="card"><span class="label">Responsavel</span><span class="value">${escaparHtml(d.responsavel || "Nao definido")}</span></div>
    <div class="card"><span class="label">Entrega</span><span class="value">${escaparHtml(formatarData(d.data_entrega))}</span></div>
    <div class="card"><span class="label">Produto inicial</span><span class="value">${escaparHtml(d.produto || "Nao informado")}</span></div>
    <div class="card"><span class="label">Arquivos vinculados</span><span class="value">${contarArquivosDaDemanda(item)}</span></div>
  </div>

  <section class="section">
    <h2>Eixos</h2>
    ${lista(item.eixos, "Nenhum eixo registrado.")}
  </section>

  <section class="section">
    <h2>Canais</h2>
    ${lista(item.canais, "Nenhum canal registrado.")}
  </section>

  <section class="section">
    <h2>Produtos produzidos</h2>
    ${produtos}
  </section>

  <section class="section">
    <h2>Checklist</h2>
    ${checklist}
  </section>

  <section class="section">
    <h2>Anexos da demanda</h2>
    ${lista(
      item.anexosDemanda.map((anexo) => anexo.nome_arquivo || "arquivo"),
      "Nenhum anexo direto nesta demanda."
    )}
  </section>

  <section class="section">
    <h2>Comentarios</h2>
    ${comentarios}
  </section>

  <section class="section">
    <h2>Historico</h2>
    ${historico}
  </section>
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

async function criarResumoPdf(item: AcervoDemanda, imagens: ImagemResumo[]) {
  const pdf = await PDFDocument.create();
  const fonteTitulo = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonteTexto = await pdf.embedFont(StandardFonts.Helvetica);
  let pagina = pdf.addPage([595.28, 841.89]);
  let y = 800;
  const margemEsquerda = 40;
  const larguraTexto = 515;
  const demanda = item.demanda;

  pagina.drawRectangle({
    x: 28,
    y: 724,
    width: 539,
    height: 92,
    color: rgb(0.5, 0.11, 0.11),
  });

  desenharTextoBranco(pagina, fonteTexto, 10, "ASCOM STACASA", 44, 790);
  y = desenharTextoBranco(
    pagina,
    fonteTitulo,
    20,
    `Demanda #${demanda.id} - ${demanda.titulo || "Sem titulo"}`,
    44,
    764
  );
  y = desenharTextoBranco(
    pagina,
    fonteTexto,
    10,
    `Status: ${formatarHumano(demanda.status)}  |  Prioridade: ${formatarHumano(demanda.prioridade)}  |  Entrega: ${formatarData(demanda.data_entrega)}`,
    44,
    740
  );

  desenharCartaoResumoPdf(
    pagina,
    fonteTexto,
    fonteTitulo,
    40,
    654,
    "Responsavel",
    demanda.responsavel || "Nao definido"
  );
  desenharCartaoResumoPdf(
    pagina,
    fonteTexto,
    fonteTitulo,
    220,
    654,
    "Setor",
    demanda.setor || "Nao informado"
  );
  desenharCartaoResumoPdf(
    pagina,
    fonteTexto,
    fonteTitulo,
    400,
    654,
    "Arquivos",
    String(contarArquivosDaDemanda(item))
  );

  y = 610;

  const blocos = [
    ["Descricao", removerHtml(demanda.descricao) || "Sem descricao"],
    [
      "Resumo",
      [
        `Status: ${formatarHumano(demanda.status)}`,
        `Prioridade: ${formatarHumano(demanda.prioridade)}`,
        `Setor: ${demanda.setor || "Nao informado"}`,
        `Solicitante: ${demanda.cadastrado_por || "Nao informado"}`,
        `Responsavel: ${demanda.responsavel || "Nao definido"}`,
        `Entrega: ${formatarData(demanda.data_entrega)}`,
        `Produto inicial: ${demanda.produto || "Nao informado"}`,
      ].join("\n"),
    ],
    ["Eixos", item.eixos.length ? item.eixos.join(", ") : "Nao informado"],
    ["Canais", item.canais.length ? item.canais.join(", ") : "Nao informado"],
    [
      "Produtos produzidos",
      item.produtos.length
        ? item.produtos
            .map(
              (produto) =>
                `${produto.nome} - Quantidade: ${produto.quantidade ?? 0} - Status: ${formatarHumano(produto.status)}`
            )
            .join("\n")
        : "Nao informado",
    ],
    [
      "Checklist",
      item.checklist.length
        ? item.checklist
            .map((check) => `${check.concluido ? "Concluido" : "Pendente"} - ${check.titulo}`)
            .join("\n")
        : "Nao informado",
    ],
  ] as const;

  for (const [titulo, conteudo] of blocos) {
    if (y < 120) {
      pagina = pdf.addPage([595.28, 841.89]);
      y = 800;
    }

    y = desenharTexto(pagina, fonteTitulo, 12, titulo, margemEsquerda, y - 8);
    y = desenharBlocoTexto(
      pagina,
      fonteTexto,
      conteudo,
      margemEsquerda,
      y - 6,
      larguraTexto,
      10
    );
  }

  if (imagens.length > 0) {
    if (y < 220) {
      pagina = pdf.addPage([595.28, 841.89]);
      y = 800;
    }

    y = desenharTexto(pagina, fonteTitulo, 12, "Imagens anexadas", margemEsquerda, y - 8);

    for (const imagem of imagens) {
      const embutida = await incorporarImagem(pdf, imagem);
      if (!embutida) continue;

      const areaLargura = 240;
      const areaAltura = 150;
      const escala = Math.min(
        areaLargura / embutida.width,
        areaAltura / embutida.height,
        1
      );
      const largura = embutida.width * escala;
      const altura = embutida.height * escala;

      if (y - altura < 70) {
        pagina = pdf.addPage([595.28, 841.89]);
        y = 800;
      }

      pagina.drawRectangle({
        x: margemEsquerda - 4,
        y: y - altura - 6,
        width: largura + 8,
        height: altura + 8,
        borderWidth: 1,
        borderColor: rgb(0.85, 0.87, 0.9),
      });

      pagina.drawImage(embutida, {
        x: margemEsquerda,
        y: y - altura - 2,
        width: largura,
        height: altura,
      });

      y = desenharTexto(
        pagina,
        fonteTexto,
        9,
        imagem.nome,
        margemEsquerda,
        y - altura - 20
      );
    }
  }

  return pdf.save();
}

function checarErroConsulta(erro: { message: string } | null, contexto: string) {
  if (erro && !tabelaOuColunaInexistente(erro.message)) {
    throw new Error(`Erro ao carregar ${contexto}: ${erro.message}`);
  }
}

async function buscarPastaDrivePorNome(
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

  return busca.data.files?.[0] || null;
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

function contarArquivosDaDemanda(item: AcervoDemanda) {
  return (
    item.anexosDemanda.length +
    item.comentarios.reduce((total, comentario) => total + comentario.anexos.length, 0)
  );
}

function resumirAcervo(acervo: AcervoDemanda[]) {
  const setores = new Set<string>();
  const responsaveis = new Set<string>();
  let totalAnexos = 0;

  for (const item of acervo) {
    if (item.demanda.setor) setores.add(item.demanda.setor);
    if (item.demanda.responsavel) responsaveis.add(item.demanda.responsavel);
    totalAnexos += contarArquivosDaDemanda(item);
  }

  return {
    totalAnexos,
    totalSetores: setores.size,
    totalResponsaveis: responsaveis.size,
  };
}

function obterClasseStatusHtml(status?: string | null) {
  const texto = normalizarStatus(status);
  if (texto === "CONCLUIDO") return "status-concluido";
  if (texto.startsWith("ARQUIV")) return "status-arquivado";
  return "status-outro";
}

function criarBadgeStatusHtml(status?: string | null) {
  return `<span class="status ${obterClasseStatusHtml(status).replace("status-", "")}">${escaparHtml(
    formatarHumano(status)
  )}</span>`;
}

function normalizarStatus(status?: string | null) {
  return (status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_]+/g, "")
    .toUpperCase();
}

function desenharTexto(
  pagina: PDFPage,
  fonte: PDFFont,
  tamanho: number,
  texto: string,
  x: number,
  y: number,
  cor = rgb(0.1, 0.12, 0.16)
) {
  pagina.drawText(texto, {
    x,
    y,
    size: tamanho,
    font: fonte,
    color: cor,
  });

  return y - (tamanho + 4);
}

function desenharTextoBranco(
  pagina: PDFPage,
  fonte: PDFFont,
  tamanho: number,
  texto: string,
  x: number,
  y: number
) {
  return desenharTexto(pagina, fonte, tamanho, texto, x, y, rgb(1, 1, 1));
}

function desenharCartaoResumoPdf(
  pagina: PDFPage,
  fonteTexto: PDFFont,
  fonteTitulo: PDFFont,
  x: number,
  y: number,
  titulo: string,
  valor: string
) {
  pagina.drawRectangle({
    x,
    y,
    width: 155,
    height: 52,
    color: rgb(0.985, 0.985, 0.99),
    borderColor: rgb(0.89, 0.9, 0.92),
    borderWidth: 1,
  });

  pagina.drawText(titulo, {
    x: x + 12,
    y: y + 34,
    size: 8,
    font: fonteTexto,
    color: rgb(0.55, 0.12, 0.12),
  });

  pagina.drawText(truncarTexto(valor, 22), {
    x: x + 12,
    y: y + 15,
    size: 11,
    font: fonteTitulo,
    color: rgb(0.12, 0.14, 0.18),
  });
}

function obterCoresStatusPdf(status?: string | null) {
  const texto = normalizarStatus(status);

  if (texto === "CONCLUIDO") {
    return {
      fundo: rgb(0.92, 0.98, 0.94),
      borda: rgb(0.65, 0.91, 0.75),
      texto: rgb(0.04, 0.47, 0.34),
    };
  }

  if (texto.startsWith("ARQUIV")) {
    return {
      fundo: rgb(0.93, 0.96, 1),
      borda: rgb(0.75, 0.85, 0.98),
      texto: rgb(0.11, 0.31, 0.85),
    };
  }

  return {
    fundo: rgb(0.99, 0.94, 0.94),
    borda: rgb(0.99, 0.8, 0.8),
    texto: rgb(0.73, 0.11, 0.11),
  };
}

function desenharTagStatusPdf(
  pagina: PDFPage,
  fonte: PDFFont,
  texto: string,
  x: number,
  y: number,
  cores: { fundo: ReturnType<typeof rgb>; borda: ReturnType<typeof rgb>; texto: ReturnType<typeof rgb> }
) {
  const largura = Math.min(Math.max(fonte.widthOfTextAtSize(texto, 8) + 18, 68), 104);

  pagina.drawRectangle({
    x,
    y,
    width: largura,
    height: 18,
    color: cores.fundo,
    borderColor: cores.borda,
    borderWidth: 1,
  });

  pagina.drawText(truncarTexto(texto, 18), {
    x: x + 9,
    y: y + 5,
    size: 8,
    font: fonte,
    color: cores.texto,
  });
}

function desenharBlocoTexto(
  pagina: PDFPage,
  fonte: PDFFont,
  texto: string,
  x: number,
  y: number,
  larguraMaxima: number,
  tamanho: number
) {
  const linhas = quebrarLinhas(texto, fonte, tamanho, larguraMaxima);
  let atualY = y;

  for (const linha of linhas) {
    pagina.drawText(linha, {
      x,
      y: atualY,
      size: tamanho,
      font: fonte,
      color: rgb(0.18, 0.2, 0.24),
    });
    atualY -= tamanho + 4;
  }

  return atualY - 8;
}

function quebrarLinhas(
  texto: string,
  fonte: PDFFont,
  tamanho: number,
  larguraMaxima: number
) {
  const linhas: string[] = [];

  for (const paragrafo of texto.split("\n")) {
    const palavras = paragrafo.split(/\s+/).filter(Boolean);

    if (palavras.length === 0) {
      linhas.push("");
      continue;
    }

    let linhaAtual = palavras[0];

    for (const palavra of palavras.slice(1)) {
      const tentativa = `${linhaAtual} ${palavra}`;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) <= larguraMaxima) {
        linhaAtual = tentativa;
      } else {
        linhas.push(linhaAtual);
        linhaAtual = palavra;
      }
    }

    linhas.push(linhaAtual);
  }

  return linhas;
}

async function incorporarImagem(pdf: PDFDocument, imagem: ImagemResumo) {
  if (imagem.mimeType === "image/png") {
    return pdf.embedPng(imagem.bytes);
  }

  if (imagem.mimeType === "image/jpeg" || imagem.mimeType === "image/jpg") {
    return pdf.embedJpg(imagem.bytes);
  }

  return null;
}

function truncarTexto(texto: string, limite: number) {
  if (texto.length <= limite) return texto;
  return `${texto.slice(0, Math.max(0, limite - 3))}...`;
}
