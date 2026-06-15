-- Email notifications for SGDC movements.
--
-- This migration stores user e-mails, creates an email queue and adds a
-- trigger so every new historico_demanda record creates pending notifications.

begin;

alter table public.usuarios_comunicacao
add column if not exists email text;

create unique index if not exists usuarios_comunicacao_email_unique
on public.usuarios_comunicacao (lower(email))
where email is not null and btrim(email) <> '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuarios_comunicacao_email_formato_chk'
      and conrelid = 'public.usuarios_comunicacao'::regclass
  ) then
    alter table public.usuarios_comunicacao
    add constraint usuarios_comunicacao_email_formato_chk
    check (
      email is null
      or btrim(email) = ''
      or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    );
  end if;
end $$;

create table if not exists public.notificacoes_email (
  id bigserial primary key,
  demanda_id bigint not null
    references public.demandas(id) on delete cascade,
  historico_id bigint not null
    references public.historico_demanda(id) on delete cascade,
  usuario_id bigint not null
    references public.usuarios_comunicacao(id) on delete cascade,
  email text not null,
  assunto text not null,
  corpo text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'enviando', 'enviado', 'erro')),
  tentativas integer not null default 0,
  erro text,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz
);

create unique index if not exists notificacoes_email_historico_usuario_unique
on public.notificacoes_email(historico_id, usuario_id);

create index if not exists notificacoes_email_status_criado_em_idx
on public.notificacoes_email(status, criado_em);

create index if not exists notificacoes_email_demanda_id_idx
on public.notificacoes_email(demanda_id);

alter table public.notificacoes_email enable row level security;

drop policy if exists "sgdc_admin_all" on public.notificacoes_email;

do $$
begin
  if to_regprocedure('public.sgdc_is_admin()') is not null then
    create policy "sgdc_admin_all"
    on public.notificacoes_email
    for all
    to authenticated
    using (public.sgdc_is_admin())
    with check (public.sgdc_is_admin());
  end if;
end $$;

grant select, insert, update, delete on public.notificacoes_email to authenticated;
grant usage, select on sequence public.notificacoes_email_id_seq to authenticated;

create or replace function public.sgdc_criar_notificacoes_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  titulo_demanda text;
begin
  select titulo
  into titulo_demanda
  from public.demandas
  where id = new.demanda_id;

  insert into public.notificacoes_email (
    demanda_id,
    historico_id,
    usuario_id,
    email,
    assunto,
    corpo
  )
  select
    new.demanda_id,
    new.id,
    usuario.id,
    btrim(usuario.email),
    'SGDC - movimentacao na demanda #' || new.demanda_id,
    'Ola, ' || usuario.nome || E'\n\n' ||
    'Houve uma movimentacao na demanda #' || new.demanda_id ||
    case
      when nullif(btrim(coalesce(titulo_demanda, '')), '') is null then ''
      else ' - ' || titulo_demanda
    end ||
    E'.\n\nMovimentacao: ' || new.acao ||
    E'\n\nData: ' || to_char(new.criado_em, 'DD/MM/YYYY HH24:MI') ||
    E'\n\nAcesse o SGDC para ver os detalhes.'
  from public.usuarios_comunicacao usuario
  where coalesce(usuario.ativo, true) = true
    and nullif(btrim(coalesce(usuario.email, '')), '') is not null
  on conflict (historico_id, usuario_id) do nothing;

  return new;
end;
$$;

drop trigger if exists sgdc_notificar_historico_email on public.historico_demanda;

create trigger sgdc_notificar_historico_email
after insert on public.historico_demanda
for each row execute function public.sgdc_criar_notificacoes_email();

comment on table public.notificacoes_email is
  'Fila de e-mails criada automaticamente a cada movimentacao registrada em historico_demanda.';

commit;
