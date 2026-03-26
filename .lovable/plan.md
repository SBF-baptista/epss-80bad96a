

## Plano: Validar existencia da placa no OPM antes de considerar como instalada

### Problema
Placas que nao existem no sistema OPM (sem registro em `kit_schedules` nem `incoming_vehicles`) estao sendo exibidas como "Instalacao Confirmada" na tela de Instalacao, simplesmente porque existe um registro em `installation_confirmations` enviado por um app externo (Instala/OPM). Exemplo: XYZ9E88.

### Solucao

**1. `src/pages/Installation.tsx` — Validacao na pesquisa**
- Apos buscar em `installation_confirmations`, verificar tambem se a placa existe em `incoming_vehicles` OU `kit_schedules`
- Se a placa so existe em `installation_confirmations` mas NAO existe em nenhuma tabela do OPM, tratar como "Nao Encontrado" (ou novo status "Placa nao pertence ao sistema")
- Logica:
  ```
  const plateExistsInOPM = tem registro em kit_schedules OU incoming_vehicles
  if (confirmation && !plateExistsInOPM) → nao contar como instalada
  ```

**2. Edge Functions — Validacao na entrada (opcional mas recomendado)**
- `supabase/functions/confirm-installation/index.ts`: antes de inserir, verificar se a placa existe em `kit_schedules` ou `incoming_vehicles`. Se nao existir, retornar erro 404 "Placa nao encontrada no sistema"
- `supabase/functions/opm-installation/index.ts`: mesma validacao

**3. Resultado visual**
- Placa com confirmacao + existente no OPM → Card verde "Instalacao Confirmada" (como hoje)
- Placa com confirmacao mas SEM registro no OPM → Card vermelho "Placa nao encontrada no sistema" (ignorar a confirmacao)
- Placa com agendamento pendente → Card amarelo (como hoje)
- Placa sem nada → Card vermelho "Nenhum registro encontrado" (como hoje)

### Arquivos modificados
- `src/pages/Installation.tsx` — adicionar query em `incoming_vehicles` na busca e condicionar resultado
- `supabase/functions/confirm-installation/index.ts` — rejeitar placas inexistentes
- `supabase/functions/opm-installation/index.ts` — rejeitar placas inexistentes

