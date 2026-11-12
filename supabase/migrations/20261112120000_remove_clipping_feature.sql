begin;

-- Remove arquivos anexados pelo modulo no bucket compartilhado de demandas.
delete from storage.objects
where bucket_id = 'demandas'
  and name like 'clipping/%';

drop table if exists public.clipping_anexos;
drop table if exists public.clipping_registros;
drop table if exists public.configuracoes_instagram_meta;

commit;
