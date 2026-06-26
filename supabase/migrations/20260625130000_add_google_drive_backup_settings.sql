create table if not exists public.configuracoes_backup_google_drive (
  id text primary key,
  ativo boolean not null default false,
  pasta_pai_id text,
  ultimo_backup_em timestamptz,
  ultimo_backup_status text,
  ultimo_backup_arquivo text,
  ultimo_backup_erro text,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now())
);

insert into public.configuracoes_backup_google_drive (id, ativo)
values ('principal', false)
on conflict (id) do nothing;

alter table public.configuracoes_backup_google_drive enable row level security;
