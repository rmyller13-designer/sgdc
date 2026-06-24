do $$
declare
  coluna record;
begin
  for coluna in
    select *
    from (
      values
        ('public', 'demandas', 'titulo'),
        ('public', 'demandas', 'descricao'),
        ('public', 'comentarios_demanda', 'comentario'),
        ('public', 'historico_demanda', 'acao'),
        ('public', 'notificacoes_email', 'assunto'),
        ('public', 'notificacoes_email', 'corpo'),
        ('public', 'notificacoes_email', 'erro')
    ) as colunas(table_schema, table_name, column_name)
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = coluna.table_schema
        and table_name = coluna.table_name
        and column_name = coluna.column_name
        and data_type <> 'text'
    ) then
      execute format(
        'alter table %I.%I alter column %I type text',
        coluna.table_schema,
        coluna.table_name,
        coluna.column_name
      );
    end if;
  end loop;
end
$$;
