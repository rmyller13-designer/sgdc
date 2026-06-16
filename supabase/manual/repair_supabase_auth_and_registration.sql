-- One-shot repair script for production Supabase environments.
-- Use this in the Supabase SQL Editor when the app is deployed but the
-- database is still missing auth/registration functions or has broken RLS
-- policies comparing auth.uid() to bigint ids.

begin;

alter table public.usuarios_comunicacao
add column if not exists email text;

create table if not exists public.usuarios_acesso (
  id bigserial primary key,
  usuario_comunicacao_id bigint not null unique
    references public.usuarios_comunicacao(id) on delete cascade,
  auth_user_id uuid not null unique
    references auth.users(id) on delete cascade,
  perfil text not null default 'admin'
    check (perfil in ('admin', 'solicitante')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.usuarios_acesso enable row level security;
alter table public.usuarios_comunicacao enable row level security;

create or replace function public.sgdc_usuario_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select usuario_comunicacao_id
  from public.usuarios_acesso
  where auth_user_id = auth.uid()
    and ativo = true
  limit 1
$$;

create or replace function public.sgdc_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios_acesso
    where auth_user_id = auth.uid()
      and ativo = true
      and perfil = 'admin'
  )
$$;

create or replace function public.sgdc_usuario_autorizado(nome_usuario text)
returns boolean
language sql
immutable
as $$
  with nome_normalizado as (
    select translate(
      lower(btrim(coalesce(nome_usuario, ''))),
      'áàâãäéèêëíìîïóòôõöúùûüç',
      'aaaaaeeeeiiiiooooouuuuc'
    ) as nome
  )
  select nome = any (array['terezinha', 'junior', 'josivania'])
    or nome like 'roberto%'
  from nome_normalizado
$$;

create or replace function public.sgdc_usuarios_registro()
returns table (
  id bigint,
  nome text,
  funcao text,
  ativo boolean,
  email_cadastrado boolean,
  conta_criada boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.nome,
    u.funcao,
    coalesce(u.ativo, true) as ativo,
    nullif(btrim(coalesce(u.email, '')), '') is not null as email_cadastrado,
    exists (
      select 1
      from public.usuarios_acesso acesso
      where acesso.usuario_comunicacao_id = u.id
        and acesso.ativo = true
    ) as conta_criada
  from public.usuarios_comunicacao u
  where coalesce(u.ativo, true) = true
    and public.sgdc_usuario_autorizado(u.nome)
  order by u.nome
$$;

create or replace function public.sgdc_registrar_usuario_acesso(
  usuario_id_param bigint,
  email_param text
)
returns table (
  id bigint,
  nome text,
  funcao text,
  email text,
  ativo boolean,
  perfil text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_user uuid;
  auth_email text;
  email_limpo text;
  usuario public.usuarios_comunicacao%rowtype;
begin
  auth_user := auth.uid();
  auth_email := lower(nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), ''));
  email_limpo := lower(nullif(btrim(coalesce(email_param, '')), ''));

  if auth_user is null then
    raise exception 'Faca login pelo Supabase antes de registrar o acesso.';
  end if;

  if email_limpo is null or auth_email is null or email_limpo <> auth_email then
    raise exception 'O email informado precisa ser o mesmo da conta autenticada.';
  end if;

  select *
  into usuario
  from public.usuarios_comunicacao
  where id = usuario_id_param
    and coalesce(ativo, true) = true
  for update;

  if usuario.id is null then
    raise exception 'Usuario nao encontrado ou inativo.';
  end if;

  if not public.sgdc_usuario_autorizado(usuario.nome) then
    raise exception 'Usuario sem autorizacao para acessar o ASCOM STACASA.';
  end if;

  if nullif(btrim(coalesce(usuario.email, '')), '') is not null
    and lower(btrim(usuario.email)) <> email_limpo then
    raise exception 'Este usuario ja possui outro email cadastrado.';
  end if;

  if exists (
    select 1
    from public.usuarios_acesso acesso
    where acesso.auth_user_id = auth_user
      and acesso.usuario_comunicacao_id <> usuario_id_param
  ) then
    raise exception 'Esta conta ja esta vinculada a outro usuario.';
  end if;

  if exists (
    select 1
    from public.usuarios_acesso acesso
    where acesso.usuario_comunicacao_id = usuario_id_param
      and acesso.auth_user_id <> auth_user
      and acesso.ativo = true
  ) then
    raise exception 'Este usuario ja possui uma conta vinculada.';
  end if;

  update public.usuarios_comunicacao
  set email = email_limpo
  where id = usuario_id_param;

  insert into public.usuarios_acesso (
    usuario_comunicacao_id,
    auth_user_id,
    perfil,
    ativo
  )
  values (
    usuario_id_param,
    auth_user,
    'admin',
    true
  )
  on conflict (usuario_comunicacao_id) do update
  set auth_user_id = excluded.auth_user_id,
      perfil = 'admin',
      ativo = true;

  return query
  select
    u.id,
    u.nome,
    u.funcao,
    u.email,
    coalesce(u.ativo, true) as ativo,
    acesso.perfil
  from public.usuarios_comunicacao u
  join public.usuarios_acesso acesso
    on acesso.usuario_comunicacao_id = u.id
  where acesso.auth_user_id = auth_user
    and acesso.ativo = true
  limit 1;
end;
$$;

create or replace function public.sgdc_usuario_logado()
returns table (
  id bigint,
  nome text,
  funcao text,
  email text,
  ativo boolean,
  perfil text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.nome,
    u.funcao,
    u.email,
    coalesce(u.ativo, true) as ativo,
    acesso.perfil
  from public.usuarios_acesso acesso
  join public.usuarios_comunicacao u
    on u.id = acesso.usuario_comunicacao_id
  where acesso.auth_user_id = auth.uid()
    and acesso.ativo = true
    and coalesce(u.ativo, true) = true
  limit 1
$$;

grant usage on schema public to authenticated;
grant execute on function public.sgdc_usuario_id() to authenticated;
grant execute on function public.sgdc_is_admin() to authenticated;
grant execute on function public.sgdc_usuario_autorizado(text) to anon, authenticated;
grant execute on function public.sgdc_usuarios_registro() to anon, authenticated;
grant execute on function public.sgdc_registrar_usuario_acesso(bigint, text) to authenticated;
grant execute on function public.sgdc_usuario_logado() to authenticated;

drop policy if exists "sgdc_self_or_admin_select" on public.usuarios_acesso;
create policy "sgdc_self_or_admin_select"
on public.usuarios_acesso
for select
to authenticated
using (auth.uid() = auth_user_id or public.sgdc_is_admin());

drop policy if exists "sgdc_admin_all" on public.usuarios_acesso;
create policy "sgdc_admin_all"
on public.usuarios_acesso
for all
to authenticated
using (public.sgdc_is_admin())
with check (public.sgdc_is_admin());

drop policy if exists "usuarios_comunicacao_select_own" on public.usuarios_comunicacao;
drop policy if exists "usuarios_comunicacao_update_own" on public.usuarios_comunicacao;
drop policy if exists "Allow user read own profile" on public.usuarios_comunicacao;
drop policy if exists "Allow user update own profile" on public.usuarios_comunicacao;
drop policy if exists "auth_uid_equals_id_select" on public.usuarios_comunicacao;
drop policy if exists "auth_uid_equals_id_update" on public.usuarios_comunicacao;
drop policy if exists "sgdc_admin_all" on public.usuarios_comunicacao;

create policy "sgdc_admin_all"
on public.usuarios_comunicacao
for all
to authenticated
using (public.sgdc_is_admin())
with check (public.sgdc_is_admin());

commit;

select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'usuarios_comunicacao'
order by ordinal_position;

select *
from public.usuarios_comunicacao
limit 5;
