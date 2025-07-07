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
    "usage_type": "particular", // ou "comercial" ou "frota"
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
      "auth_debug": "Add ?auth-debug=true to URL for detailed authentication analysis"
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

1. **Teste de Conectividade**
   ```bash
   curl "https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle?test=true" \
     -H "x-api-key: SUA_API_KEY"
   ```

2. **Diagnóstico de Autenticação**
   ```bash
   curl "https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle?auth-debug=true" \
     -H "x-api-key: SUA_API_KEY"
   ```

3. **Teste com Dados Mínimos**
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

## Suporte
Para problemas técnicos:
1. Use os endpoints de diagnóstico
2. Verifique os logs da aplicação
3. Consulte esta documentação