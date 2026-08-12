begin;

create table if not exists public.demanda_responsaveis (
  id bigserial primary key,
  demanda_id bigint not null
    references public.demandas(id) on delete cascade,
  usuario_id bigint not null
    references public.usuarios_comunicacao(id) on delete cascade,
  principal boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (demanda_id, usuario_id)
);

create index if not exists demanda_responsaveis_demanda_idx
on public.demanda_responsaveis(demanda_id);

create index if not exists demanda_responsaveis_usuario_idx
on public.demanda_responsaveis(usuario_id);

insert into public.demanda_responsaveis (demanda_id, usuario_id, principal)
select d.id, d.responsavel_id, true
from public.demandas d
where d.responsavel_id is not null
on conflict (demanda_id, usuario_id) do update
set principal = excluded.principal;

alter table public.demanda_responsaveis enable row level security;

drop policy if exists "sgdc_admin_all" on public.demanda_responsaveis;

create policy "sgdc_admin_all"
on public.demanda_responsaveis
for all
to authenticated
using (public.sgdc_is_admin())
with check (public.sgdc_is_admin());

grant select, insert, update, delete on public.demanda_responsaveis to authenticated;
revoke all on public.demanda_responsaveis from anon;

comment on table public.demanda_responsaveis is
  'Relaciona uma demanda a um ou mais responsaveis da equipe.';

commit;
