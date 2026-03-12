

## Plano: Alterar autenticação do `confirm-installation` para JWT (mesmo padrão do `create-homologation`)

### Problema atual
A edge function `confirm-installation` usa autenticação via `x-api-key` customizada. Porém, a aplicação INSTALA já possui integração com o Supabase Auth via login com email/senha (`/auth/v1/token?grant_type=password`) e usa o `access_token` retornado como Bearer token — exatamente como faz para chamar `create-homologation`.

### Solução
Alterar a function `confirm-installation` para usar o mesmo padrão de autenticação JWT do `create-homologation`:

1. **Remover** a validação por `x-api-key`
2. **Adicionar** validação por `Authorization: Bearer <access_token>` usando `supabase.auth.getUser(token)`
3. Registrar o `user.id` na confirmação (campo `confirmed_by`)

### Mudança única: `supabase/functions/confirm-installation/index.ts`

Substituir o bloco de validação por API Key pelo mesmo padrão do `create-homologation`:

```typescript
// Antes (remover):
const apiKey = req.headers.get("x-api-key");
const expectedKey = Deno.env.get("INSTALLATION_API_KEY");
// ...validação por key

// Depois (usar):
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  return 401 "Missing authorization header"
}
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return 401 "Invalid token"
}
```

### Fluxo da aplicação INSTALA

```text
1. POST /auth/v1/token?grant_type=password
   Body: { email, password }
   → Recebe access_token

2. POST /functions/v1/confirm-installation
   Headers: Authorization: Bearer <access_token>
   Body: { "plate": "ABC1D23", "imei": "123456789012345" }
   → Recebe { success, confirmation_id, matched_schedule, schedule_id }
```

### O que NÃO muda
- Payload continua `{ plate, imei }`
- Lógica de match com `kit_schedules` permanece igual
- Tabela `installation_confirmations` permanece igual
- `config.toml` já está com `verify_jwt = false` (correto, validamos no código)
- Secret `INSTALLATION_API_KEY` não será mais necessária

