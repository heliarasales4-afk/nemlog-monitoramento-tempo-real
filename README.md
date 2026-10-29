# Monitoramento NemLog em tempo real

Servidor para receber webhooks do Vuupt e enviar alertas operacionais pelo WhatsApp Cloud API.

## Alertas iniciais

- urgência acionada;
- alerta quando o condutor não registrar chegada à coleta em 40 minutos;
- SLA de 60 minutos atingido;
- conclusão da urgência fora do SLA;
- chegada na coleta não registrada;
- espera da unidade acima de 10 minutos;
- checklist incompleto de coleta ou entrega;
- serviços com “sem material” são desconsiderados.

## Webhook do Vuupt

Cadastre no Vuupt:

`https://SEU-SERVICO.onrender.com/webhooks/vuupt?secret=SEU_SEGREDO`

Selecione, no mínimo, os eventos de serviço criado, iniciado, chegada, concluído e checklist preenchido.

## Segurança

Nunca salve tokens no GitHub. Configure `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `WHATSAPP_RECIPIENTS` e `VUUPT_WEBHOOK_SECRET` apenas nos segredos do Render.
