-- Reset controlado das contas internas do ASCOM STACASA.
--
-- O que este script faz:
-- 1. Remove vinculos em public.usuarios_acesso dos usuarios autorizados
-- 2. Limpa o email salvo em public.usuarios_comunicacao desses usuarios
-- 3. Remove contas correspondentes em auth.users quando encontradas
--
-- O que este script NAO faz:
-- - Nao apaga demandas
-- - Nao apaga comentarios
-- - Nao apaga anexos
-- - Nao altera setores, status, prioridades ou demais dados de negocio
--
-- Execute no SQL Editor do Supabase antes de recriar as contas.

begin;

create temp table sgdc_reset_usuarios as
select
  u.id,
  u.nome,
  lower(nullif(btrim(coalesce(u.email, '')), '')) as email
from public.usuarios_comunicacao u
where coalesce(u.ativo, true) = true
  and (
    lower(u.nome) = any (array['terezinha', 'junior', 'josivania'])
    or lower(u.nome) like 'roberto%'
  );

create temp table sgdc_reset_auth_ids as
select distinct acesso.auth_user_id as id
from public.usuarios_acesso acesso
join sgdc_reset_usuarios alvo
  on alvo.id = acesso.usuario_comunicacao_id
where acesso.auth_user_id is not null;

insert into sgdc_reset_auth_ids (id)
select distinct auth_user.id
from auth.users auth_user
join sgdc_reset_usuarios alvo
  on lower(auth_user.email) = alvo.email
where alvo.email is not null
  and not exists (
    select 1
    from sgdc_reset_auth_ids ids
    where ids.id = auth_user.id
  );

delete from public.usuarios_acesso
where usuario_comunicacao_id in (
  select id
  from sgdc_reset_usuarios
);

update public.usuarios_comunicacao
set email = null
where id in (
  select id
  from sgdc_reset_usuarios
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'auth'
      and table_name = 'identities'
  ) then
    execute $sql$
      delete from auth.identities
      where user_id in (select id from sgdc_reset_auth_ids)
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'auth'
      and table_name = 'sessions'
  ) then
    execute $sql$
      delete from auth.sessions
      where user_id in (select id from sgdc_reset_auth_ids)
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'auth'
      and table_name = 'refresh_tokens'
  ) then
    execute $sql$
      delete from auth.refresh_tokens
      where user_id in (select id from sgdc_reset_auth_ids)
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'auth'
      and table_name = 'mfa_factors'
  ) then
    execute $sql$
      delete from auth.mfa_factors
      where user_id in (select id from sgdc_reset_auth_ids)
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'auth'
      and table_name = 'one_time_tokens'
  ) then
    execute $sql$
      delete from auth.one_time_tokens
      where user_id in (select id from sgdc_reset_auth_ids)
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'auth'
      and table_name = 'audit_log_entries'
  ) then
    execute $sql$
      delete from auth.audit_log_entries
      where user_id in (select id::uuid from sgdc_reset_auth_ids)
    $sql$;
  end if;
end $$;

delete from auth.users
where id in (
  select id
  from sgdc_reset_auth_ids
);

commit;

select
  'usuarios_comunicacao' as origem,
  id::text as referencia,
  nome,
  email
from public.usuarios_comunicacao
where lower(nome) = any (array['terezinha', 'junior', 'josivania'])
   or lower(nome) like 'roberto%'
order by nome;

select
  'usuarios_acesso' as origem,
  usuario_comunicacao_id::text as referencia,
  auth_user_id::text as nome,
  perfil as email
from public.usuarios_acesso
where usuario_comunicacao_id in (
  select id
  from public.usuarios_comunicacao
  where lower(nome) = any (array['terezinha', 'junior', 'josivania'])
     or lower(nome) like 'roberto%'
)
order by usuario_comunicacao_id;
