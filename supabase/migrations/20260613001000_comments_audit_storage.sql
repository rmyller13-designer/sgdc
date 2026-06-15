-- Comments, attachment storage rules and cleanup support for ASCOM STACASA.
--
-- Apply this after 20260613000000_harden_rls.sql so sgdc_usuario_id() exists.
-- The Storage bucket size limit may need to be configured in the Supabase
-- dashboard if your project does not allow updating file_size_limit by SQL.

begin;

create table if not exists public.comentario_anexos (
  id bigserial primary key,
  comentario_id bigint not null
    references public.comentarios_demanda(id) on delete cascade,
  demanda_id bigint not null
    references public.demandas(id) on delete cascade,
  nome_arquivo text not null,
  tipo_arquivo text,
  tamanho_arquivo bigint,
  url_arquivo text not null,
  caminho_storage text not null unique,
  criado_em timestamptz not null default now()
);

create index if not exists comentario_anexos_comentario_id_idx
on public.comentario_anexos(comentario_id);

create index if not exists comentario_anexos_demanda_id_idx
on public.comentario_anexos(demanda_id);

alter table public.comentario_anexos enable row level security;

drop policy if exists "sgdc_admin_all" on public.comentario_anexos;

do $$
begin
  if to_regprocedure('public.sgdc_is_admin()') is not null then
    create policy "sgdc_admin_all"
    on public.comentario_anexos
    for all
    to authenticated
    using (public.sgdc_is_admin())
    with check (public.sgdc_is_admin());
  end if;
end $$;

-- Organize uploads under demanda-<id>/anexos and
-- demanda-<id>/comentarios/comentario-<id>.
comment on table public.demanda_anexos is
  'Demand attachments. Storage path: demanda-<id>/anexos/<timestamp>-<file>. Limit: 10 MB.';

comment on table public.comentario_anexos is
  'Comment attachments. Storage path: demanda-<id>/comentarios/comentario-<id>/<timestamp>-<file>. Limit: 10 MB.';

-- Keep the database aware of the desired bucket policy.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain'
    ]::text[]
where id = 'demandas';

create or replace function public.sgdc_anexos_antigos(retencao_dias integer default 365)
returns table (
  origem text,
  id bigint,
  demanda_id bigint,
  caminho_storage text,
  criado_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select 'demanda'::text, id, demanda_id, caminho_storage, criado_em
  from public.demanda_anexos
  where criado_em < now() - make_interval(days => retencao_dias)
  union all
  select 'comentario'::text, id, demanda_id, caminho_storage, criado_em
  from public.comentario_anexos
  where criado_em < now() - make_interval(days => retencao_dias)
  order by criado_em asc
$$;

create or replace function public.sgdc_auditar_demanda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  demanda bigint;
  ator bigint;
  descricao text;
begin
  ator := public.sgdc_usuario_id();

  if ator is null then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  if tg_table_name = 'demandas' then
    demanda := case when tg_op = 'DELETE' then old.id else new.id end;
    descricao := case tg_op
      when 'INSERT' then 'criou a demanda'
      when 'UPDATE' then 'atualizou dados da demanda'
      when 'DELETE' then 'excluiu a demanda'
      else lower(tg_op)
    end;
  else
    demanda := case when tg_op = 'DELETE' then old.demanda_id else new.demanda_id end;
    descricao := case tg_table_name
      when 'demanda_checklist' then 'alterou o checklist'
      when 'demanda_eixos' then 'alterou eixos da demanda'
      when 'demanda_canais' then 'alterou canais da demanda'
      when 'demanda_produtos_quantidade' then 'alterou produtos da demanda'
      when 'demanda_anexos' then 'alterou anexos da demanda'
      when 'comentario_anexos' then 'alterou anexos de comentario'
      else 'alterou registros da demanda'
    end;
  end if;

  if demanda is not null then
    insert into public.historico_demanda (demanda_id, usuario_id, acao)
    select demanda, ator, u.nome || ' ' || descricao
    from public.usuarios_comunicacao u
    where u.id = ator;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists sgdc_audit_demandas on public.demandas;
create trigger sgdc_audit_demandas
after insert or update or delete on public.demandas
for each row execute function public.sgdc_auditar_demanda();

drop trigger if exists sgdc_audit_demanda_checklist on public.demanda_checklist;
create trigger sgdc_audit_demanda_checklist
after insert or update or delete on public.demanda_checklist
for each row execute function public.sgdc_auditar_demanda();

drop trigger if exists sgdc_audit_demanda_eixos on public.demanda_eixos;
create trigger sgdc_audit_demanda_eixos
after insert or update or delete on public.demanda_eixos
for each row execute function public.sgdc_auditar_demanda();

drop trigger if exists sgdc_audit_demanda_canais on public.demanda_canais;
create trigger sgdc_audit_demanda_canais
after insert or update or delete on public.demanda_canais
for each row execute function public.sgdc_auditar_demanda();

drop trigger if exists sgdc_audit_demanda_produtos_quantidade on public.demanda_produtos_quantidade;
create trigger sgdc_audit_demanda_produtos_quantidade
after insert or update or delete on public.demanda_produtos_quantidade
for each row execute function public.sgdc_auditar_demanda();

drop trigger if exists sgdc_audit_demanda_anexos on public.demanda_anexos;
create trigger sgdc_audit_demanda_anexos
after insert or update or delete on public.demanda_anexos
for each row execute function public.sgdc_auditar_demanda();

drop trigger if exists sgdc_audit_comentario_anexos on public.comentario_anexos;
create trigger sgdc_audit_comentario_anexos
after insert or update or delete on public.comentario_anexos
for each row execute function public.sgdc_auditar_demanda();

commit;
