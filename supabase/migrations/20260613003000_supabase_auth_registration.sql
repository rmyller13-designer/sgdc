-- Supabase Auth registration and secure user lookup for ASCOM STACASA.
--
-- Apply after 20260613000000_harden_rls.sql and
-- 20260613002000_email_notifications.sql.

begin;

alter table public.usuarios_comunicacao
add column if not exists email text;

create or replace function public.sgdc_usuario_autorizado(nome_usuario text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(nome_usuario, '')) = any (
    array['terezinha', 'junior', 'josivania']
  )
  or lower(coalesce(nome_usuario, '')) like 'roberto%'
$$;

create or replace function public.sgdc_usuarios_registro()
returns table (
  id bigint,
  nome text,
  funcao text,
  ativo boolean,
  email_cadastrado boolean,
  conta_criada boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.nome,
    u.funcao,
    u.ativo,
    nullif(btrim(coalesce(u.email, '')), '') is not null as email_cadastrado,
    exists (
      select 1
      from public.usuarios_acesso acesso
      where acesso.usuario_comunicacao_id = u.id
        and acesso.ativo = true
    ) as conta_criada
  from public.usuarios_comunicacao u
  where coalesce(u.ativo, true) = true
    and public.sgdc_usuario_autorizado(u.nome)
  order by u.nome;
$$;

create or replace function public.sgdc_registrar_usuario_acesso(
  usuario_id_param bigint,
  email_param text
)
returns table (
  id bigint,
  nome text,
  funcao text,
  email text,
  ativo boolean,
  perfil text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_user uuid;
  auth_email text;
  email_limpo text;
  usuario public.usuarios_comunicacao%rowtype;
begin
  auth_user := auth.uid();
  auth_email := lower(nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), ''));
  email_limpo := lower(nullif(btrim(coalesce(email_param, '')), ''));

  if auth_user is null then
    raise exception 'Faça login pelo Supabase antes de registrar o acesso.';
  end if;

  if email_limpo is null or auth_email is null or email_limpo <> auth_email then
    raise exception 'O e-mail informado precisa ser o mesmo da conta autenticada.';
  end if;

  select *
  into usuario
  from public.usuarios_comunicacao
  where id = usuario_id_param
    and coalesce(ativo, true) = true
  for update;

  if usuario.id is null then
    raise exception 'Usuário não encontrado ou inativo.';
  end if;

  if not public.sgdc_usuario_autorizado(usuario.nome) then
    raise exception 'Usuário sem autorização para acessar o ASCOM STACASA.';
  end if;

  if nullif(btrim(coalesce(usuario.email, '')), '') is not null
    and lower(btrim(usuario.email)) <> email_limpo then
    raise exception 'Este usuário já possui outro e-mail cadastrado.';
  end if;

  if exists (
    select 1
    from public.usuarios_acesso acesso
    where acesso.auth_user_id = auth_user
      and acesso.usuario_comunicacao_id <> usuario_id_param
  ) then
    raise exception 'Esta conta já está vinculada a outro usuário.';
  end if;

  if exists (
    select 1
    from public.usuarios_acesso acesso
    where acesso.usuario_comunicacao_id = usuario_id_param
      and acesso.auth_user_id <> auth_user
      and acesso.ativo = true
  ) then
    raise exception 'Este usuário já possui uma conta vinculada.';
  end if;

  update public.usuarios_comunicacao
  set email = email_limpo
  where id = usuario_id_param;

  insert into public.usuarios_acesso (
    usuario_comunicacao_id,
    auth_user_id,
    perfil,
    ativo
  )
  values (
    usuario_id_param,
    auth_user,
    'admin',
    true
  )
  on conflict (usuario_comunicacao_id) do update
  set auth_user_id = excluded.auth_user_id,
      perfil = 'admin',
      ativo = true;

  return query
  select
    u.id,
    u.nome,
    u.funcao,
    u.email,
    u.ativo,
    acesso.perfil
  from public.usuarios_comunicacao u
  join public.usuarios_acesso acesso
    on acesso.usuario_comunicacao_id = u.id
  where acesso.auth_user_id = auth_user
    and acesso.ativo = true
  limit 1;
end;
$$;

create or replace function public.sgdc_usuario_logado()
returns table (
  id bigint,
  nome text,
  funcao text,
  email text,
  ativo boolean,
  perfil text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.nome,
    u.funcao,
    u.email,
    u.ativo,
    acesso.perfil
  from public.usuarios_acesso acesso
  join public.usuarios_comunicacao u
    on u.id = acesso.usuario_comunicacao_id
  where acesso.auth_user_id = auth.uid()
    and acesso.ativo = true
    and coalesce(u.ativo, true) = true
  limit 1;
$$;

grant execute on function public.sgdc_usuario_autorizado(text) to authenticated;
grant execute on function public.sgdc_usuarios_registro() to anon, authenticated;
grant execute on function public.sgdc_registrar_usuario_acesso(bigint, text) to authenticated;
grant execute on function public.sgdc_usuario_logado() to authenticated;

commit;
