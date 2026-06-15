-- Track production status per product line in a demand.

begin;

alter table public.demanda_produtos_quantidade
add column if not exists status_producao text not null default 'ANDAMENTO'
check (status_producao in ('ANDAMENTO', 'CONCLUIDO', 'CANCELADO'));

commit;
