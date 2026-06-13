-- SGDC RLS hardening
--
-- Apply this only after migrating the login to Supabase Auth.
-- The current browser/localStorage login is not visible to Supabase, so every
-- database request still arrives as the "anon" role and would be blocked.
--
-- Before applying:
-- 1. Create Auth users for Terezinha, Junior, Roberto and Josivania.
-- 2. Link each auth.users.id to usuarios_comunicacao through usuarios_acesso.
-- 3. Make sure the app uses supabase.auth.signInWithPassword/signOut.

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
drop policy if exists "sgdc_admin_all" on public.usuarios_acesso;

create policy "sgdc_self_or_admin_select"
on public.usuarios_acesso
for select
to authenticated
using (auth.uid() = auth_user_id or public.sgdc_is_admin());

create policy "sgdc_admin_all"
on public.usuarios_acesso
for all
to authenticated
using (public.sgdc_is_admin())
with check (public.sgdc_is_admin());

do $$
declare
  tabela text;
  tabelas text[] := array[
    'usuarios_comunicacao',
    'demandas',
    'demanda_anexos',
    'comentarios_demanda',
    'historico_demanda',
    'demanda_checklist',
    'demanda_eixos',
    'demanda_canais',
    'demanda_produtos_quantidade',
    'setores',
    'prioridades',
    'status_demanda',
    'produtos',
    'eixos_comunicacao',
    'canais_comunicacao'
  ];
begin
  foreach tabela in array tabelas loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('drop policy if exists "sgdc_admin_all" on public.%I', tabela);
    execute format(
      'create policy "sgdc_admin_all" on public.%I for all to authenticated using (public.sgdc_is_admin()) with check (public.sgdc_is_admin())',
      tabela
    );
  end loop;
end $$;

-- Public/anon should not read or write application data directly.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Views used by the app must run with the caller's permissions so RLS on the
-- underlying tables still applies.
do $$
declare
  view_name text;
  views text[] := array[
    'demandas_completas',
    'demandas_kanban',
    'relatorio_quantitativo_produtos',
    'relatorio_quantitativo_canais',
    'relatorio_quantitativo_eixos'
  ];
begin
  foreach view_name in array views loop
    begin
      execute format('alter view public.%I set (security_invoker = true)', view_name);
      execute format('grant select on public.%I to authenticated', view_name);
      execute format('revoke all on public.%I from anon', view_name);
    exception
      when undefined_table or wrong_object_type then
        raise notice 'Skipping %, not a normal view', view_name;
    end;
  end loop;
end $$;

-- Storage bucket used for demand attachments.
-- After this, the app must use signed URLs instead of public URLs.
update storage.buckets
set public = false
where id = 'demandas';

alter table storage.objects enable row level security;

drop policy if exists "sgdc_demandas_storage_select" on storage.objects;
drop policy if exists "sgdc_demandas_storage_insert" on storage.objects;
drop policy if exists "sgdc_demandas_storage_update" on storage.objects;
drop policy if exists "sgdc_demandas_storage_delete" on storage.objects;

create policy "sgdc_demandas_storage_select"
on storage.objects
for select
to authenticated
using (bucket_id = 'demandas' and public.sgdc_is_admin());

create policy "sgdc_demandas_storage_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'demandas' and public.sgdc_is_admin());

create policy "sgdc_demandas_storage_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'demandas' and public.sgdc_is_admin())
with check (bucket_id = 'demandas' and public.sgdc_is_admin());

create policy "sgdc_demandas_storage_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'demandas' and public.sgdc_is_admin());

commit;

-- Link users after creating Supabase Auth accounts. Replace the UUIDs:
--
-- insert into public.usuarios_acesso (usuario_comunicacao_id, auth_user_id, perfil)
-- select id, '00000000-0000-0000-0000-000000000000'::uuid, 'admin'
-- from public.usuarios_comunicacao
-- where nome ilike 'Roberto%';
--
-- Repeat for Josivania, Junior and Terezinha.
