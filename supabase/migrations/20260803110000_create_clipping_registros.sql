begin;

create table if not exists public.clipping_registros (
  id bigserial primary key,
  titulo text not null,
  canal text not null
    check (canal in ('INSTAGRAM', 'SITE')),
  sentimento text not null
    check (sentimento in ('POSITIVA', 'NEGATIVA', 'NEUTRA')),
  url text null,
  data_publicacao date not null default current_date,
  views integer not null default 0,
  comentarios integer not null default 0,
  likes integer not null default 0,
  compartilhamentos integer not null default 0,
  salvos integer not null default 0,
  engajamento integer not null default 0,
  observacoes text null,
  criado_por_usuario_id bigint null
    references public.usuarios_comunicacao(id) on delete set null,
  criado_por_nome text null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists clipping_registros_data_idx
  on public.clipping_registros (data_publicacao desc);

create index if not exists clipping_registros_canal_idx
  on public.clipping_registros (canal);

create index if not exists clipping_registros_sentimento_idx
  on public.clipping_registros (sentimento);

grant select, insert, update, delete on public.clipping_registros to anon;
grant usage, select on sequence public.clipping_registros_id_seq to anon;

grant select, insert, update, delete on public.clipping_registros to authenticated;
grant usage, select on sequence public.clipping_registros_id_seq to authenticated;

commit;
