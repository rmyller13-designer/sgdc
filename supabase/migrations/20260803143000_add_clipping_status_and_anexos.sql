begin;

alter table public.clipping_registros
  add column if not exists status text not null default 'EM_MONITORAMENTO'
    check (status in ('EM_MONITORAMENTO', 'FECHADO', 'CRISE'));

create index if not exists clipping_registros_status_idx
  on public.clipping_registros (status);

create table if not exists public.clipping_anexos (
  id bigserial primary key,
  clipping_id bigint not null
    references public.clipping_registros(id) on delete cascade,
  nome_arquivo text not null,
  url_arquivo text not null,
  tipo_arquivo text null,
  tamanho_arquivo bigint null,
  caminho_storage text not null unique,
  criado_em timestamptz not null default now()
);

create index if not exists clipping_anexos_clipping_idx
  on public.clipping_anexos (clipping_id, criado_em desc);

grant select, insert, update, delete on public.clipping_anexos to anon;
grant usage, select on sequence public.clipping_anexos_id_seq to anon;

grant select, insert, update, delete on public.clipping_anexos to authenticated;
grant usage, select on sequence public.clipping_anexos_id_seq to authenticated;

commit;
