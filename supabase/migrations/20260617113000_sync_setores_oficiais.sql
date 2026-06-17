begin;

create temp table sgdc_setores_oficiais (
  nome text not null
);

insert into sgdc_setores_oficiais (nome)
values
  ('DIREÇÃO GERAL'),
  ('SECRETARIA'),
  ('COMUNICAÇÃO'),
  ('DEPE'),
  ('FALE CONOSCO'),
  ('NUGESP'),
  ('COORDENAÇÃO ADMINISTRATIVA'),
  ('SCIH'),
  ('NUCLEO DE EPIDEMIOLOGIA'),
  ('AMBULATÓRIO'),
  ('CME'),
  ('TRANSPORTE'),
  ('CENTRO CIRÚRGICO GERAL (CCG)'),
  ('INTERNAÇÃO PEDIÁTRICA'),
  ('DIREÇÃO ASSISTENCIAL'),
  ('IMAGEM'),
  ('NAC'),
  ('NÚCLEO DE EXPERIÊNCIA DO PACIENTE (NEXP)'),
  ('UTI ADULTO 2'),
  ('NEONATOLOGIA'),
  ('UCE'),
  ('OBSTETRÍCIA'),
  ('NEUROCIRURGIA'),
  ('FARMÁCIA'),
  ('LABORATÓRIO'),
  ('ENGENHARIA CLÍNICA'),
  ('AGÊNCIA TRANSFUSIONAL'),
  ('NAF'),
  ('NUTRIÇÃO'),
  ('TECNOLOGIA DA INFORMAÇÃO (TI)'),
  ('SESMT'),
  ('FONOAUDIOLOGIA'),
  ('FISIOTERAPIA'),
  ('SERVIÇO SOCIAL'),
  ('PSICOLOGIA'),
  ('HOTELARIA'),
  ('MANUTENÇÃO'),
  ('COMISSÃO'),
  ('CIPA'),
  ('POSTO DE COLETA (LEITE)'),
  ('IMPRENSA/ EXTERNO'),
  ('DHO'),
  ('DIREÇÃO ADMINISTRATIVA'),
  ('DIREÇÃO TÉCNICA'),
  ('DEMANDA EXTERNA'),
  ('GERÊNCIA DE QUALIDADE E SEGURANÇA DO PACIENTE'),
  ('EMERGÊNCIA ADULTO - EIXO VERMELHO'),
  ('EMERGÊNCIA ADULTO - EIXO AZUL'),
  ('HIGIENIZAÇÃO'),
  ('CLÍNICA MÉDICA'),
  ('NÚCLEO HOSPITALAR DE EPIDEMIOLOGIA (NHE)'),
  ('UTI PEDIÁTRICA'),
  ('SUPRIMENTOS'),
  ('UTI ADULTO 3 e 4'),
  ('HEMODIÁLISE'),
  ('INFRAESTRUTURA'),
  ('TECNOVIGILÂNCIA'),
  ('RESPONSABILIDADE SOCIAL'),
  ('ORGANIZAÇÃO DE PROCURA DE ÓRGÃOS (OPO)'),
  ('ENFERMARIA SÃO JOSÉ'),
  ('GESTÃO DE PESSOAS'),
  ('ALMOXARIFADO'),
  ('JURÍDICO'),
  ('NÚCLEO INTERNO DE REGULAÇÃO (NIR)'),
  ('MATERNIDADE'),
  ('RH'),
  ('CACON ONCOLOGIA'),
  ('CENTRAL DE PROJETOS'),
  ('SERVIÇO DE SEGURANÇA E PORTARIA'),
  ('ENFERMARIA SÃO JOAQUIM'),
  ('PATRIMÔNIO'),
  ('CENTRAL DE TRANSPORTES'),
  ('ELO DE ESPERANÇA'),
  ('SAME'),
  ('CENTRO DE IMAGEM'),
  ('OPME'),
  ('DIREÇÃO FINANCEIRA'),
  ('LIMPEZA'),
  ('RADIOTERAPIA'),
  ('CAPELA'),
  ('COMPRAS E SUPRIMENTO');

create or replace function public.sgdc_normalizar_setor(valor text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      lower(trim(coalesce(valor, ''))),
      'áàâãäéèêëíìîïóòôõöúùûüç',
      'aaaaaeeeeiiiiooooouuuuc'
    ),
    '\s+',
    ' ',
    'g'
  )
$$;

update public.setores atual
set nome = oficial.nome
from sgdc_setores_oficiais oficial
where public.sgdc_normalizar_setor(atual.nome) = public.sgdc_normalizar_setor(oficial.nome)
  and atual.nome is distinct from oficial.nome;

insert into public.setores (nome)
select oficial.nome
from sgdc_setores_oficiais oficial
where not exists (
  select 1
  from public.setores atual
  where public.sgdc_normalizar_setor(atual.nome) = public.sgdc_normalizar_setor(oficial.nome)
);

drop function public.sgdc_normalizar_setor(text);

commit;
