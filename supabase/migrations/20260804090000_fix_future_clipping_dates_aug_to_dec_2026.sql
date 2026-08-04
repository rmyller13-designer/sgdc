-- Corrige clippings com datas no futuro entre 01/08/2026 e 31/12/2026.
-- Regra solicitada: alterar apenas o ano para 2025, preservando mes e dia.

update public.clipping_registros
set data_publicacao = make_date(
  2025,
  extract(month from data_publicacao)::int,
  extract(day from data_publicacao)::int
)
where data_publicacao >= date '2026-08-01'
  and data_publicacao <= date '2026-12-31';
