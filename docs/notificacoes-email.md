# Notificacoes por e-mail

## O que foi preparado

- O registro de usuario agora pede e-mail junto com a senha.
- A migration `20260613002000_email_notifications.sql` adiciona `email` em `usuarios_comunicacao`.
- Toda nova linha em `historico_demanda` cria notificacoes pendentes para todos os usuarios ativos com e-mail.
- A tabela `notificacoes_email` guarda fila, status, tentativas, erro e data de envio.
- A Edge Function `enviar-notificacoes-email` envia os itens pendentes usando Resend.

## Como ativar

1. Aplique as migrations do Supabase.
2. Entre no sistema com cada usuario e use `Registre-se` para cadastrar senha e e-mail.
3. Configure os secrets da Edge Function:

```bash
supabase secrets set RESEND_API_KEY="sua-chave"
supabase secrets set EMAIL_FROM="ASCOM STACASA <notificacoes@seudominio.com>"
```

4. Publique a funcao:

```bash
supabase functions deploy enviar-notificacoes-email
```

5. Execute a funcao por agendamento, webhook ou manualmente:

```bash
supabase functions invoke enviar-notificacoes-email
```

## Observacoes

- Sem `RESEND_API_KEY` e `EMAIL_FROM`, as notificacoes ficam registradas na fila, mas nao sao enviadas.
- A regra atual notifica todos os usuarios ativos com e-mail, inclusive o usuario que fez a movimentacao.
- Se quiser evitar e-mail para quem executou a acao, ajuste a funcao `sgdc_criar_notificacoes_email` para ignorar `new.usuario_id`.
