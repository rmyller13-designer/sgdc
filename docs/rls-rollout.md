# RLS rollout do SGDC

O app hoje usa uma senha local no navegador. Isso nao autentica no Supabase:
para o banco, as chamadas continuam chegando como `anon`.

Para proteger de verdade:

1. Criar usuarios em Supabase Auth para Terezinha, Junior, Roberto e Josivania.
2. Trocar o login local por `supabase.auth.signInWithPassword`.
3. Vincular cada `auth.users.id` ao usuario em `usuarios_comunicacao` na tabela `usuarios_acesso`.
4. Aplicar `supabase/migrations/20260613000000_harden_rls.sql`.
5. Trocar anexos para URLs assinadas, porque o bucket `demandas` deixa de ser publico.
6. Aplicar `supabase/migrations/20260613001000_comments_audit_storage.sql` para anexos em comentarios, limite de upload e relatorio de limpeza.

Depois disso, `anon` nao le nem grava dados do sistema. Designer, Jornalista e
Coordenadora continuam com acesso administrativo por meio do perfil `admin` em
`usuarios_acesso`, sem alterar o cargo/descricao em `usuarios_comunicacao`.

Armazenamento:

- Limite por arquivo: 10 MB.
- Anexos gerais: `demanda-<id>/anexos/`.
- Anexos de comentarios: `demanda-<id>/comentarios/comentario-<id>/`.
- Retencao sugerida: 365 dias. A funcao `sgdc_anexos_antigos()` lista arquivos
  candidatos para revisao/limpeza.
