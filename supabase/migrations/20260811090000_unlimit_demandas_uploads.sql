begin;

update storage.buckets
set file_size_limit = null,
    allowed_mime_types = null
where id = 'demandas';

comment on table public.demanda_anexos is
  'Demand attachments. Storage path: demanda-<id>/anexos/<categoria>/<timestamp>-<file>. No file type or size restriction at the application policy level.';

comment on table public.comentario_anexos is
  'Comment attachments. Storage path: demanda-<id>/comentarios/comentario-<id>/<timestamp>-<file>. No file type or size restriction at the application policy level.';

commit;
