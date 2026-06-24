do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'demandas'
      and column_name = 'descricao'
      and data_type <> 'text'
  ) then
    alter table public.demandas
      alter column descricao type text;
  end if;
end
$$;
