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

type GoogleTaskPayload = {
  title: string;
  notes: string;
  due?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (options: {
      client_id: string;
      scope: string;
      callback: (response: GoogleTokenResponse) => void;
      error_callback?: (error: unknown) => void;
    }) => GoogleTokenClient;
  };
};

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts;
    };
  }
}

export function criarGoogleTaskTexto(demanda: GoogleCalendarDemanda) {
  const detalhes = [
    `ASCOM STACASA #${demanda.id} - ${demanda.titulo || "Demanda"}`,
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

export async function criarTarefaGoogle(
  demanda: GoogleCalendarDemanda,
  accessTokenInformado?: string
) {
  if (!demanda.data_entrega) {
    throw new Error("Informe a data de entrega para criar a tarefa no Google Agenda.");
  }

  const accessToken = accessTokenInformado || (await autorizarGoogleTasks());
  const resposta = await fetch(
    "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(criarGoogleTaskPayload(demanda)),
    }
  );

  if (!resposta.ok) {
    const erro = await resposta.text();
    throw new Error(`Erro ao criar tarefa no Google Agenda: ${erro || resposta.status}`);
  }
}

export async function autorizarGoogleTasks() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      "Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID para criar tarefas automaticamente no Google Agenda."
    );
  }

  await carregarGoogleIdentity();

  return obterAccessToken(clientId);
}

function criarGoogleTaskPayload(demanda: GoogleCalendarDemanda): GoogleTaskPayload {
  const titulo = `ASCOM STACASA #${demanda.id} - ${demanda.titulo || "Demanda"}`;
  const detalhes = [
    demanda.descricao,
    demanda.produto ? `Produto: ${demanda.produto}` : null,
    demanda.setor ? `Setor: ${demanda.setor}` : null,
    demanda.status ? `Status: ${demanda.status}` : null,
    demanda.prioridade ? `Prioridade: ${demanda.prioridade}` : null,
    demanda.responsavel ? `Responsável: ${demanda.responsavel}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: titulo,
    notes: detalhes,
    due: demanda.data_entrega
      ? `${demanda.data_entrega.slice(0, 10)}T00:00:00.000Z`
      : undefined,
  };
}

function carregarGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const scriptExistente = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (scriptExistente) {
      scriptExistente.addEventListener("load", () => resolve(), { once: true });
      scriptExistente.addEventListener(
        "error",
        () => reject(new Error("Erro ao carregar o Google Identity.")),
        {
          once: true,
        }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Erro ao carregar o Google Identity."));
    document.head.appendChild(script);
  });
}

function obterAccessToken(clientId: string) {
  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/tasks",
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error("Autorização do Google Agenda cancelada ou negada."));
          return;
        }

        resolve(response.access_token);
      },
      error_callback: () =>
        reject(new Error("Não foi possível autorizar o Google Agenda.")),
    });

    if (!tokenClient) {
      reject(new Error("Google Identity não carregou corretamente."));
      return;
    }

    tokenClient.requestAccessToken();
  });
}

function formatarDataPtBr(data: string) {
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
