

## Plano: Criar rota de integração OPM ← INSTALA

### Contexto
A aplicação INSTALA envia dados de instalação concluída (placa e IMEI) para o OPM. O OPM precisa de um endpoint para receber e armazenar esses dados, e opcionalmente atualizar o status dos agendamentos correspondentes.

### 1. Criar tabela `installation_confirmations`

Tabela dedicada para registrar cada confirmação recebida da aplicação INSTALA:

```sql
CREATE TABLE public.installation_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL,
  imei text NOT NULL,
  source text DEFAULT 'instala',
  raw_payload jsonb,
  matched_schedule_id uuid REFERENCES kit_schedules(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.installation_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view confirmations"
  ON public.installation_confirmations FOR SELECT TO authenticated USING (true);
```

### 2. Criar Edge Function `confirm-installation`

Endpoint: `POST /confirm-installation`

- **Autenticação**: Header `X-API-Key` validado contra secret `INSTALLATION_API_KEY`
- **Payload esperado**:
  ```json
  {
    "plate": "ABC1D23",
    "imei": "123456789012345"
  }
  ```
- **Fluxo**:
  1. Valida API Key
  2. Valida campos obrigatórios (`plate`, `imei`)
  3. Salva na tabela `installation_confirmations`
  4. Tenta encontrar `kit_schedules` com `vehicle_plate` correspondente
  5. Se encontrar, vincula o `matched_schedule_id` e atualiza status para `installed`
  6. Retorna resposta com sucesso e se houve match

### 3. Configurar secret e config.toml

- Adicionar secret `INSTALLATION_API_KEY` para autenticação
- Adicionar ao `config.toml`:
  ```toml
  [functions.confirm-installation]
  verify_jwt = false
  ```

### 4. Criar service no frontend

Arquivo `src/services/installationConfirmationService.ts` para consultar as confirmações recebidas via Supabase client.

### Exemplo de uso pela aplicação INSTALA

```bash
curl -X POST \
  https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/confirm-installation \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_CHAVE_AQUI" \
  -d '{"plate": "ABC1D23", "imei": "123456789012345"}'
```

### Resposta esperada
```json
{
  "success": true,
  "confirmation_id": "uuid",
  "matched_schedule": true,
  "schedule_id": "uuid"
}
```

