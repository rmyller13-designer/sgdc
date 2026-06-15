-- Make registration user lookup accent/case tolerant.
-- Existing databases need this after 20260613003000_supabase_auth_registration.sql.

begin;

create or replace function public.sgdc_usuario_autorizado(nome_usuario text)
returns boolean
language sql
immutable
as $$
  with nome_normalizado as (
    select translate(
      lower(btrim(coalesce(nome_usuario, ''))),
      'áàâãäéèêëíìîïóòôõöúùûüç',
      'aaaaaeeeeiiiiooooouuuuc'
    ) as nome
  )
  select nome = any (array['terezinha', 'junior', 'josivania'])
    or nome like 'roberto%'
  from nome_normalizado
$$;

grant execute on function public.sgdc_usuario_autorizado(text) to anon, authenticated;

commit;
