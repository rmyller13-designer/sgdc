# Integração do Google Alerts com o clipping

O Google Alerts não possui uma API pública para consultar alertas. O SGDC usa o
feed RSS fornecido pelo próprio alerta.

## Configuração

1. Acesse `https://www.google.com/alerts` com a conta institucional.
2. Crie ou edite o alerta para `"Santa Casa de Sobral"`.
3. Em **Mostrar opções**, selecione a entrega por **Feed RSS**.
4. Salve o alerta e copie o endereço exibido no ícone RSS.
5. Na Vercel, crie a variável `GOOGLE_ALERTS_RSS_URL` com esse endereço.
6. Confirme que `CRON_SECRET` também está configurado e publique novamente.

Para monitorar mais de um alerta, use `GOOGLE_ALERTS_RSS_URLS` e separe os
endereços por quebra de linha, vírgula ou ponto e vírgula.

## Funcionamento

- A Vercel consulta os feeds diariamente às 10:00 UTC (07:00 em Brasília).
- URLs que já existem no clipping não são importadas novamente.
- Novos itens entram como canal `SITE`, origem `EXTERNO`, sentimento
  `NAO_CLASSIFICADO` e status `EM_MONITORAMENTO`.
- A equipe deve revisar sentimento, editoria, autoria e relevância.
- A URL completa do feed nunca é devolvida pela API de status nem exibida na
  interface.
