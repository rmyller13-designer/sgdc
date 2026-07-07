begin;

insert into public.usuarios_comunicacao (nome, funcao, ativo)
select 'Renata', 'Solicitante', true
where not exists (
  select 1
  from public.usuarios_comunicacao
  where lower(trim(nome)) = 'renata'
);

commit;

select id, nome, funcao, ativo
from public.usuarios_comunicacao
where lower(trim(nome)) = 'renata';
