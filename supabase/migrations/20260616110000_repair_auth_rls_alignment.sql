-- Repair auth/RLS alignment for environments that still compare auth.uid()
-- directly to public.usuarios_comunicacao.id (uuid vs bigint).
--
-- This project uses public.usuarios_acesso as the bridge between Supabase Auth
-- and usuarios_comunicacao. Do not compare auth.uid() to usuarios_comunicacao.id.

begin;

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

grant execute on function public.sgdc_usuario_id() to authenticated;
grant execute on function public.sgdc_is_admin() to authenticated;

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

-- Remove legacy/wrong policies that compare auth.uid() to bigint ids.
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
