begin;

alter table public.clipping_registros
  add column if not exists autoria text null,
  add column if not exists editoria text null;

create index if not exists clipping_registros_autoria_idx
  on public.clipping_registros (autoria);

create index if not exists clipping_registros_editoria_idx
  on public.clipping_registros (editoria);

commit;
