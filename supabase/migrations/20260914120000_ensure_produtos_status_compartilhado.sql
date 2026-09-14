-- Product production status must live in the database so every user sees the
-- same value. This migration intentionally repeats the earlier column setup:
-- it repairs environments where that migration was not applied and refreshes
-- PostgREST's schema cache.

begin;

alter table public.demanda_produtos_quantidade
add column if not exists status_producao text;

update public.demanda_produtos_quantidade
set status_producao = 'ANDAMENTO'
where status_producao is null
   or status_producao not in ('ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

alter table public.demanda_produtos_quantidade
alter column status_producao set default 'ANDAMENTO',
alter column status_producao set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.demanda_produtos_quantidade'::regclass
      and conname = 'demanda_produtos_quantidade_status_producao_check'
  ) then
    alter table public.demanda_produtos_quantidade
      add constraint demanda_produtos_quantidade_status_producao_check
      check (status_producao in ('ANDAMENTO', 'CONCLUIDO', 'CANCELADO'));
  end if;
end
$$;

-- Keep already-open demand screens synchronized between users.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'demanda_produtos_quantidade'
  ) then
    alter publication supabase_realtime
      add table public.demanda_produtos_quantidade;
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;
