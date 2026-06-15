import { createClient } from "https://esm.sh/@supabase/supabase-js@2.107.0";

type NotificacaoEmail = {
  id: number;
  email: string;
  assunto: string;
  corpo: string;
  tentativas: number;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const emailFrom = Deno.env.get("EMAIL_FROM");

Deno.serve(async () => {
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !emailFrom) {
    return json(
      {
        erro:
          "Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY e EMAIL_FROM.",
      },
      500
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: notificacoes, error } = await supabase
    .from("notificacoes_email")
    .select("id, email, assunto, corpo, tentativas")
    .in("status", ["pendente", "erro"])
    .lt("tentativas", 3)
    .order("criado_em", { ascending: true })
    .limit(25);

  if (error) {
    return json({ erro: error.message }, 500);
  }

  const resultados = [];

  for (const notificacao of (notificacoes || []) as NotificacaoEmail[]) {
    await supabase
      .from("notificacoes_email")
      .update({
        status: "enviando",
        tentativas: notificacao.tentativas + 1,
      })
      .eq("id", notificacao.id);

    try {
      const envio = await enviarEmail(notificacao);

      if (envio.ok) {
        await supabase
          .from("notificacoes_email")
          .update({
            status: "enviado",
            erro: null,
            enviado_em: new Date().toISOString(),
          })
          .eq("id", notificacao.id);

        resultados.push({ id: notificacao.id, status: "enviado" });
      } else {
        const erro = await envio.text();

        await marcarErro(supabase, notificacao.id, erro);

        resultados.push({ id: notificacao.id, status: "erro", erro });
      }
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      await marcarErro(supabase, notificacao.id, mensagem);
      resultados.push({ id: notificacao.id, status: "erro", erro: mensagem });
    }
  }

  return json({ enviados: resultados });
});

async function enviarEmail(notificacao: NotificacaoEmail) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [notificacao.email],
      subject: notificacao.assunto,
      text: notificacao.corpo,
    }),
  });
}

async function marcarErro(
  supabase: ReturnType<typeof createClient>,
  id: number,
  erro: string
) {
  await supabase
    .from("notificacoes_email")
    .update({
      status: "erro",
      erro: erro.slice(0, 1000),
    })
    .eq("id", id);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
