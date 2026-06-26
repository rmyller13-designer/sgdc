begin;

with setor_legado as (
  select id
  from public.setores
  where upper(trim(nome)) = 'HOTELARIA'
  order by id
  limit 1
)
update public.setores
set nome = 'HOTEL VISCONDE'
where id in (select id from setor_legado)
  and not exists (
    select 1
    from public.setores
    where upper(trim(nome)) = 'HOTEL VISCONDE'
  );

insert into public.setores (nome)
select 'HOTELARIA'
where not exists (
  select 1
  from public.setores
  where upper(trim(nome)) = 'HOTELARIA'
);

commit;
