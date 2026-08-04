begin;

alter table public.clipping_registros
  add column if not exists origem text not null default 'EXTERNO';

alter table public.clipping_registros
  drop constraint if exists clipping_registros_origem_check;

alter table public.clipping_registros
  add constraint clipping_registros_origem_check
  check (origem in ('EXTERNO', 'ASCOM'));

create index if not exists clipping_registros_origem_idx
  on public.clipping_registros (origem);

commit;
