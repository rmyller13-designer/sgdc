begin;

alter table public.clipping_registros
  drop constraint if exists clipping_registros_canal_check;

alter table public.clipping_registros
  add constraint clipping_registros_canal_check
  check (canal in ('INSTAGRAM', 'FACEBOOK', 'SITE'));

commit;
