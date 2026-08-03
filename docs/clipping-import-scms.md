# Migração do acervo `Clipping SCMS.xlsx`

## Diagnóstico do arquivo

O arquivo enviado contém múltiplas abas por ano, mas o padrão de preenchimento muda bastante ao longo do tempo.

### Abas encontradas

- `2019`
- `2020`
- `2021`
- `2022`
- `2023`
- `2024`
- `2025`
- `2026`
- `Gráficos`
- `Sheet7` (vazia)

## Leitura estrutural por período

### 2019 a 2021

Formato editorial em blocos:

- mês
- data do bloco
- cabeçalho `Blogs/Sites | Título | Link`
- várias linhas com `Veículo | Título | Link`

O que funciona bem:

- título presente
- veículo presente
- link quase sempre presente
- data de publicação por bloco

Limitação:

- não há classificação por sentimento em nível de linha

### 2022 e 2023

Formato resumido:

- mês
- cabeçalho `Blogs/Sites | Link`
- linhas com `Veículo | Link`
- linha final com totais do mês

O que funciona:

- veículo
- link
- mês de referência

Limitações:

- sem título explícito na maioria dos registros
- sem sentimento em nível de linha
- data exata geralmente não está em coluna própria

### 2024

Essa aba não contém matérias individualizadas. Ela guarda apenas resumos mensais:

- total
- positivas
- negativas
- neutras

Conclusão:

Essa aba **não permite reconstruir cada clipping individual**. Ela pode ser aproveitada para painel histórico consolidado, mas não para importar matérias uma a uma.

### 2025

Formato já próximo do sistema:

- `Data`
- `Veículo`
- `O que?`
- `Link`
- classificação em coluna lateral

Pontos fortes:

- ótimo para importação
- título praticamente completo
- sentimento em boa parte das linhas

Observação:

- há linhas sem sentimento preenchido

### 2026

Formato mais maduro do arquivo:

- `Data`
- `Classificação`
- `Retranca`
- `Veículo`
- `Título`
- `Link`

Esse ano está praticamente pronto para migração direta.

## Estimativa de registros aproveitáveis

Esses números são estimativas técnicas com base na estrutura atual da planilha:

| Ano | Registros estimados | Observação principal |
| --- | ---: | --- |
| 2019 | 148 | sem sentimento por linha |
| 2020 | 271 | sem sentimento por linha |
| 2021 | 469 | sem sentimento por linha |
| 2022 | 373 | sem título e sem sentimento por linha |
| 2023 | 50 | sem título e sem sentimento por linha |
| 2024 | 0 | só resumo mensal |
| 2025 | 897 | quase pronto |
| 2026 | 1029 | pronto para importação |

### Total estimado de matérias individualizáveis

`3237` registros

### Total de anos com importação praticamente direta

- `2025`
- `2026`

## Mapeamento proposto para o SGDC

### Campos do sistema de Clipping

Mapeamento sugerido:

| Excel | SGDC |
| --- | --- |
| Veículo | `autoria` |
| Título / O que? | `titulo` |
| Link | `url` |
| Data | `data_publicacao` |
| Classificação / Positivo / Negativo / Neutro | `sentimento` |
| Retranca | `observacoes` ou campo dedicado futuro |
| Canal derivado do link | `canal` |
| Status padrão na importação | `FECHADO` |

### Regra de canal

Sugestão de normalização:

- link com `instagram.com` ou `instagr.am` => `INSTAGRAM`
- link com `facebook.com` ou `fb.watch` => `FACEBOOK`
- todo o restante => `SITE`

Observação importante:

Links de `x.com` e similares hoje cairiam em `SITE`, porque o sistema ainda não possui canal próprio para `X/Twitter`.

## Decisões importantes para não distorcer os indicadores

### 1. Sentimento ausente

Nos anos antigos, o arquivo não informa o sentimento em nível de matéria.

Por isso, **não é recomendável forçar tudo como positivo, neutro ou negativo**.

O melhor caminho é adicionar um quarto estado:

- `NAO_CLASSIFICADO`

Assim:

- não falseamos os indicadores
- o supervisor consegue separar o acervo histórico classificado do não classificado
- podemos revisar e classificar depois, por lote

### 2. Título ausente em 2022 e 2023

Quando o título não vier no Excel, a estratégia mais segura é:

1. tentar extrair um título legível do slug da URL
2. se não der, usar um título técnico provisório:
   - `Matéria sem título informado - <veículo> - <mês/ano>`

### 3. Data ausente ou incompleta

Regra sugerida:

1. usar a data da coluna quando existir
2. quando só houver mês do bloco, tentar inferir pela própria URL
3. se não der para inferir o dia, usar:
   - primeiro dia do mês de referência
4. registrar isso em observação de importação

## Estratégia de migração recomendada

### Fase 1 - importação imediata

Importar primeiro:

- `2025`
- `2026`

Motivo:

- melhor qualidade de dados
- menor risco
- já entrega valor rápido no painel

### Fase 2 - importação histórica com tratamento

Depois importar:

- `2019`
- `2020`
- `2021`
- `2022`
- `2023`

Com regras de:

- normalização de datas
- dedução de canal
- título derivado da URL quando faltar
- sentimento como `NAO_CLASSIFICADO` quando não existir

### Fase 3 - histórico executivo de 2024

Como 2024 não traz matérias individualizadas, ele deve entrar por outro caminho:

- painel consolidado anual/mensal
- série histórica executiva
- não como linha unitária de clipping

## Recomendação técnica

Antes da importação definitiva, vale ajustar o módulo de clipping para aceitar:

1. `sentimento = NAO_CLASSIFICADO`
2. um campo opcional `origem_importacao`
3. um campo opcional `observacao_importacao`
4. um importador por lote com relatório final:
   - importados
   - ignorados
   - duplicados
   - incompletos

## Resumo executivo

Sim, esse Excel é migrável.

Mas ele não deve ser importado como se todos os anos tivessem o mesmo formato.

O arquivo está em três camadas:

- anos bem estruturados
- anos parcialmente estruturados
- ano só com resumo agregado

O caminho certo é uma migração inteligente por fases, preservando a linha do tempo e sem adulterar os indicadores.
