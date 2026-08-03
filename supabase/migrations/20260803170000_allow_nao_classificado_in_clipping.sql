begin;

alter table public.clipping_registros
  drop constraint if exists clipping_registros_sentimento_check;

alter table public.clipping_registros
  add constraint clipping_registros_sentimento_check
  check (sentimento in ('POSITIVA', 'NEGATIVA', 'NEUTRA', 'NAO_CLASSIFICADO'));

commit;
