-- Corrige registros importados do acervo SCMS 2025 que ficaram gravados com ano 2026.
-- Regra segura: só altera itens cuja observação aponta importação histórica de 2025
-- e cuja data_publicacao caiu indevidamente em 2026.

update public.clipping_registros
set data_publicacao = make_date(
  2025,
  extract(month from data_publicacao)::int,
  extract(day from data_publicacao)::int
)
where observacoes like '%Importação histórica SCMS.%'
  and observacoes like '%Importado do acervo SCMS (2025)%'
  and data_publicacao >= date '2026-01-01'
  and data_publicacao < date '2027-01-01';
