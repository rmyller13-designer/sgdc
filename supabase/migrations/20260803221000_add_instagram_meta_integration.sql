begin;

create table if not exists public.configuracoes_instagram_meta (
  id text primary key,
  ativo boolean not null default false,
  facebook_page_id text null,
  facebook_page_name text null,
  instagram_business_account_id text null,
  instagram_username text null,
  instagram_nome_exibicao text null,
  token_acesso text null,
  token_tipo text null,
  token_expira_em timestamptz null,
  ultimo_sync_em timestamptz null,
  ultimo_sync_status text null,
  ultimo_sync_resumo text null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

insert into public.configuracoes_instagram_meta (id, ativo)
values ('principal', false)
on conflict (id) do nothing;

alter table public.clipping_registros
  add column if not exists instagram_media_id text null,
  add column if not exists instagram_shortcode text null,
  add column if not exists facebook_post_id text null,
  add column if not exists metricas_atualizadas_em timestamptz null,
  add column if not exists metricas_origem text null;

create index if not exists clipping_registros_instagram_shortcode_idx
  on public.clipping_registros (instagram_shortcode);

create index if not exists clipping_registros_metricas_atualizadas_idx
  on public.clipping_registros (metricas_atualizadas_em desc);

commit;
