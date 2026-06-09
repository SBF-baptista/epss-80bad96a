
# Integração Kafka (DigitalOcean) — Produção de eventos pós-agendamento

## Contexto e diferença vs. o exemplo Java
Este projeto não roda Spring. O backend disponível são **Supabase Edge Functions (Deno)**. O equivalente ao seu `KafkaProducerConfig` será uma edge function que abre conexão SASL_SSL/SCRAM-SHA-256 com o broker e publica a mensagem. A function é chamada pelo frontend logo após o agendamento ser persistido.

## O que será necessário (credenciais / secrets)
Vou pedir, via tool de secrets, os seguintes valores (equivalentes às suas variáveis do Spring):

| Secret no Lovable Cloud | Equivalente Spring | Descrição |
|---|---|---|
| `DO_KAFKA_BROKERS` | `DO_KAFKA_SERVER` | `host:porta` (vírgula se múltiplos) |
| `DO_KAFKA_USERNAME` | `DO_KAFKA_FROTASS_USERNAME` | usuário SCRAM |
| `DO_KAFKA_PASSWORD` | `DO_KAFKA_FROTASS_PASSWORD` | senha SCRAM |
| `DO_KAFKA_CA_PEM` | `TRUST_PATH_FROTASS` (.jks) | **conteúdo** do CA cert em PEM (não caminho de arquivo — em Deno não há filesystem persistente; cola-se o PEM inteiro como secret) |
| `DO_KAFKA_TOPIC_AGENDAMENTO` | — | nome do tópico de destino (ex.: `agendamentos.criados`) |

Observações importantes:
- Em Deno não dá para usar `.jks`. O painel da DigitalOcean fornece o CA em PEM (download "CA Certificate"). É esse conteúdo que vai no secret `DO_KAFKA_CA_PEM`.
- Mecanismo SCRAM-SHA-256, `security.protocol = SASL_SSL`, idempotência ativada — mesmas configs do seu Java.

## Arquitetura proposta

```text
Frontend (Scheduling form)
        │ após sucesso do insert do agendamento
        ▼
supabase.functions.invoke('kafka-publish-agendamento', { body: { scheduleId } })
        │
        ▼
Edge Function (Deno)
  ├── valida JWT do usuário
  ├── busca o agendamento + dados do veículo/cliente no banco (service role)
  ├── monta payload JSON
  └── KafkaJS (npm:kafkajs) → produce(topic, key=plate, value=JSON)
        │   SASL_SSL + SCRAM-SHA-256 + CA PEM
        ▼
   DigitalOcean Managed Kafka
```

## Itens a construir

1. **Secrets** — solicitar os 5 secrets listados acima (uma interação só).
2. **Edge function `kafka-publish-agendamento`** em `supabase/functions/kafka-publish-agendamento/index.ts`:
   - Imports: `import { Kafka, logLevel } from "npm:kafkajs@2.2.4"` e `corsHeaders` do supabase-js.
   - Config equivalente ao seu Java:
     ```ts
     new Kafka({
       brokers: brokers.split(','),
       ssl: { ca: [Deno.env.get('DO_KAFKA_CA_PEM')!], rejectUnauthorized: true },
       sasl: { mechanism: 'scram-sha-256', username, password },
       connectionTimeout: 30_000,
       requestTimeout: 60_000,
       logLevel: logLevel.ERROR,
     })
     ```
   - Producer com `idempotent: true`, `maxInFlightRequests: 5`, `retry: { retries: Number.MAX_SAFE_INTEGER, initialRetryTime: 300 }`, `acks: -1`.
   - Lê `scheduleId` do body (valida com Zod), busca o agendamento via service role (join com kickoff/veículo) e produz para `DO_KAFKA_TOPIC_AGENDAMENTO`.
   - Conecta → envia → desconecta (sem manter conexão entre invocações; cold start ~1–2 s, aceitável para evento pós-agendamento).
   - Sempre retorna 200 mesmo em erro de negócio (regra do projeto), com `{ ok:false, error }` para não derrubar a UI.
   - Log estruturado de sucesso/erro para Edge Function logs.
3. **Hook no fluxo de agendamento** (frontend, na função que hoje cria o agendamento e dispara o WhatsApp):
   - Após `insert` bem-sucedido, chamar `supabase.functions.invoke('kafka-publish-agendamento', { body: { scheduleId } })` em paralelo com o disparo do WhatsApp.
   - Falha não bloqueia o fluxo do usuário (toast só em modo dev/log).
4. **Sem alterações de schema** — a function lê dados existentes.

## Payload do evento (proposta — confirmar)
Como você não definiu o schema, vou seguir o padrão dos eventos do projeto:

```json
{
  "eventId": "uuid",
  "eventType": "agendamento.criado",
  "occurredAt": "2026-06-09T17:30:00Z",
  "schedule": {
    "id": "...",
    "scheduledFor": "...",
    "technician": "...",
    "serviceType": "...",
    "status": "..."
  },
  "vehicle": { "plate": "...", "chassi": "...", "model": "..." },
  "client":  { "id": "...", "companyName": "...", "saleSummaryId": "..." }
}
```
- Key da mensagem: `plate` (mantém ordenação por veículo na partição).
- Se preferir o mesmo formato do `VeiculoMigracao` do seu Java, me passa os campos exatos antes do build.

## Detalhes técnicos
- Lib: `kafkajs` via `npm:` (compatível com Deno em Edge Functions).
- TLS: `ssl.ca` recebe o PEM como string; `rejectUnauthorized: true` (no Java você desabilitou `endpoint.identification.algorithm` — em kafkajs o equivalente é `ssl: { ca, rejectUnauthorized: true }` sem `checkServerIdentity` customizado; se a DO emitir certificado válido para o hostname dos brokers, funciona direto).
- Erros comuns que vou tratar: `SASL Authentication failed`, `Connection error: self signed certificate` (CA errado), `Not authorized to access topics` (ACL do usuário sem `Write` no tópico).

## Itens em aberto que preciso confirmar antes do build
1. Nome exato do tópico (vai em `DO_KAFKA_TOPIC_AGENDAMENTO`).
2. Schema do payload — usar o padrão acima ou o mesmo da classe `VeiculoMigracao`?
3. Disparo ocorre em **todo** insert de agendamento, ou só em algum status/módulo específico (ex.: somente Kickoff → Planning)?

Pode confirmar esses 3 pontos e os 5 secrets que serão pedidos? Ao aprovar o plano eu já solicito os secrets na primeira ação.
