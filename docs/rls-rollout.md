# RLS rollout do SGDC

O SGDC agora usa Supabase Auth para login real. A sessao local em
`localStorage` foi removida: o banco passa a receber o token do usuario
autenticado e as politicas RLS conseguem usar `auth.uid()`.

## Ordem de aplicacao

1. Aplicar `20260613000000_harden_rls.sql`.
2. Aplicar `20260613001000_comments_audit_storage.sql`.
3. Aplicar `20260613002000_email_notifications.sql`.
4. Aplicar `20260613003000_supabase_auth_registration.sql`.
5. Conferir no Supabase Auth se o login por e-mail/senha esta habilitado.

## Como cada usuario entra

1. Abrir `/login`.
2. Clicar em `Registre-se`.
3. Selecionar o usuario interno: Roberto, Josivania, Junior ou Terezinha.
4. Informar e-mail e senha.
5. Entrar com e-mail e senha.

A funcao `sgdc_registrar_usuario_acesso()` vincula o `auth.users.id` ao registro
em `usuarios_comunicacao` e grava perfil `admin` em `usuarios_acesso`.

Designer, Jornalista e Coordenadora continuam com acesso administrativo por meio
do perfil `admin`, sem alterar o cargo/descricao em `usuarios_comunicacao`.

## Observacoes de seguranca

- `anon` nao le nem grava dados do sistema.
- A tela de registro usa apenas `sgdc_usuarios_registro()`, que expoe somente os
  nomes autorizados para cadastro.
- A tabela `usuarios_acesso` e as tabelas principais seguem protegidas por RLS.
- Se a confirmacao de e-mail do Supabase estiver ligada, o usuario pode precisar
  confirmar o e-mail antes de entrar.

## Armazenamento

- Limite por arquivo: 10 MB.
- Anexos gerais: `demanda-<id>/anexos/`.
- Anexos de comentarios: `demanda-<id>/comentarios/comentario-<id>/`.
- Retencao sugerida: 365 dias. A funcao `sgdc_anexos_antigos()` lista arquivos
  candidatos para revisao/limpeza.
