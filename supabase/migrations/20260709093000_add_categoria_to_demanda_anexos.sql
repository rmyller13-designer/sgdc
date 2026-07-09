alter table public.demanda_anexos
add column if not exists categoria text;

update public.demanda_anexos
set categoria = 'referencia'
where categoria is null;

alter table public.demanda_anexos
alter column categoria set default 'referencia';

alter table public.demanda_anexos
alter column categoria set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'demanda_anexos_categoria_check'
  ) then
    alter table public.demanda_anexos
    add constraint demanda_anexos_categoria_check
    check (categoria in ('referencia', 'final'));
  end if;
end $$;

create index if not exists demanda_anexos_demanda_categoria_idx
on public.demanda_anexos(demanda_id, categoria);
