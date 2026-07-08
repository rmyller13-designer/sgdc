insert into public.setores (nome)
select 'ABRIGO SAGRADO CORAÇÃO DE JESUS'
where not exists (
  select 1
  from public.setores
  where upper(trim(nome)) = 'ABRIGO SAGRADO CORAÇÃO DE JESUS'
);
