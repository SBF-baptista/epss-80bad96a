# Receive Vehicle API - Guia de Integração

## Visão Geral
Este endpoint recebe dados de veículos de aplicações terceiras e processa automaticamente, criando pedidos ou cartões de homologação conforme necessário.

## URL do Endpoint
```
POST https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle
```

## Autenticação
Todas as requisições devem incluir o header de autenticação:
```
x-api-key: [SUA_API_KEY]
```

## Endpoints de Diagnóstico

### 1. Teste Básico
Para verificar conectividade e configuração:
```
GET/POST https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle?test=true
```

### 2. Diagnóstico de Autenticação
Para análise detalhada de problemas de autenticação:
```
GET/POST https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle?auth-debug=true
```

### 3. Diagnóstico de Configuração
Para verificar todas as variáveis de ambiente e configurações:
```
GET/POST https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle?config-debug=true
```

## Formato da Requisição

### Headers Obrigatórios
```
Content-Type: application/json
x-api-key: [SUA_API_KEY]
```

### Corpo da Requisição
```json
[
  {
    "company_name": "Nome da Empresa",
    "usage_type": "particular", // Valores aceitos: "particular", "comercial", "frota", "TELEMETRIA GPS", "TELEMETRIA CAN", "COPILOTO 2 CAMERAS", "COPILOTO 4 CAMERAS"
    "vehicles": [
      {
        "vehicle": "Nome do Modelo",
        "brand": "Marca",
        "year": 2024, // opcional
        "quantity": 1 // opcional, padrão é 1
      }
    ]
  }
]
```

### Valores Aceitos para usage_type:
- `"particular"` - Uso particular
- `"comercial"` - Uso comercial
- `"frota"` - Frota
- `"TELEMETRIA GPS"` - Telemetria GPS
- `"TELEMETRIA CAN"` - Telemetria CAN
- `"COPILOTO 2 CAMERAS"` - Copiloto com 2 câmeras
- `"COPILOTO 4 CAMERAS"` - Copiloto com 4 câmeras

## Exemplo de Requisição Completa
```bash
curl -X POST https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY_AQUI" \
  -d '[
    {
      "company_name": "Transportadora ABC",
      "usage_type": "comercial",
      "vehicles": [
        {
          "vehicle": "HRV",
          "brand": "Honda",
          "year": 2024,
          "quantity": 2
        }
      ]
    }
  ]'
```

## Respostas

### Sucesso (201)
```json
{
  "success": true,
  "message": "Successfully processed 1 vehicle groups with 2 total vehicles",
  "request_id": "abc123def456",
  "total_groups": 1,
  "total_vehicles": 2,
  "processing_summary": {
    "total_orders_created": 2,
    "total_homologations_created": 0,
    "total_errors": 0
  },
  "processed_groups": [...]
}
```

### Erro de Autenticação (401)
```json
{
  "error": "Unauthorized",
  "message": "Authentication failed",
  "request_id": "abc123def456",
  "debug_info": {
    "api_key_provided": false,
    "common_solutions": [
      "Ensure x-api-key header is included in the request",
      "Verify the API key value is correct",
      "Check for extra spaces or characters in the API key"
    ],
    "test_endpoints": {
      "basic_test": "Add ?test=true to URL for basic connectivity test",
      "auth_debug": "Add ?auth-debug=true to URL for detailed authentication analysis",
      "config_debug": "Add ?config-debug=true to URL for server configuration verification"
    }
  }
}
```

## Troubleshooting

### Problemas Comuns

1. **"Unauthorized" Error**
   - Verifique se o header `x-api-key` está presente
   - Confirme se a API key está correta
   - Use o endpoint `?auth-debug=true` para análise detalhada

2. **"Method not allowed"**
   - Use método POST, não GET
   - Inclua `Content-Type: application/json`

3. **"Invalid JSON"**
   - Verifique a sintaxe do JSON
   - Certifique-se de que está enviando um array de objetos

4. **"Invalid request format"**
   - O corpo deve ser um array de grupos de veículos
   - Cada grupo deve ter `company_name`, `usage_type` e `vehicles`

### Passos de Verificação

**PARA RESOLVER ERRO 401 "Authentication failed":**

1. **Primeiro, teste o endpoint de diagnóstico de autenticação**
   ```bash
   curl "https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle?auth-debug=true" \
     -H "x-api-key: SUA_API_KEY_AQUI"
   ```
   
   Este comando irá retornar uma análise detalhada mostrando:
   - Se o header x-api-key está presente
   - Se a API key tem o comprimento correto
   - Se há espaços em branco extras
   - Comparação entre a key fornecida e a esperada

2. **Teste de Conectividade Básica**
   ```bash
   curl "https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle?test=true" \
     -H "x-api-key: SUA_API_KEY_AQUI"
   ```

3. **Verifique os headers exatos sendo enviados**
   Use o endpoint auth-debug para ver exatamente quais headers estão chegando ao servidor

4. **Teste com dados mínimos após confirmar autenticação**
   ```bash
   curl -X POST "https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle" \
     -H "Content-Type: application/json" \
     -H "x-api-key: SUA_API_KEY" \
     -d '[{"company_name":"Test","usage_type":"particular","vehicles":[{"vehicle":"Test","brand":"Test"}]}]'
   ```

## Processamento dos Dados

### Veículos Existentes
- Se o veículo já existe no sistema, um pedido automático é criado
- Status: `order_created`

### Veículos Novos
- Se o veículo não existe, um cartão de homologação é criado
- Status: `homologation_pending`

### Erros
- Falhas são registradas com detalhes específicos
- Status: `error`

## Diagnóstico Rápido para Erro 401

Se você está recebendo erro **"Authentication failed"**, use o script de diagnóstico:

1. **Baixe o script de diagnóstico**
   ```bash
   curl -o diagnose.sh https://raw.githubusercontent.com/supabase/functions/receive-vehicle/diagnose.sh
   chmod +x diagnose.sh
   ```

2. **Execute o diagnóstico**
   ```bash
   ./diagnose.sh SUA_API_KEY_AQUI
   ```

3. **Ou execute manualmente o diagnóstico**
   ```bash
   curl "https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle?auth-debug=true" \
     -H "x-api-key: SUA_API_KEY" \
     -H "Content-Type: application/json"
   ```

O diagnóstico irá mostrar:
- ✅ Se a API key está sendo enviada corretamente
- ✅ Se há espaços em branco ou caracteres extras
- ✅ Se a chave corresponde ao valor esperado
- ✅ Recomendações específicas para resolver o problema

## Suporte
Para problemas técnicos:
1. Use os endpoints de diagnóstico
2. Verifique os logs da aplicação
3. Consulte esta documentação