# Plano: Limitar campo Placa a 7 dígitos no Novo Agendamento

## Objetivo
O campo "Placa" do formulário de Novo Agendamento (`ScheduleFormModal.tsx`) atualmente aceita texto livre sem limite. Deve aceitar **no máximo 7 caracteres** (formato de placa brasileira, antigo ABC1234 ou Mercosul ABC1D23).

## Arquivo alterado
- `src/components/configuration/ScheduleFormModal.tsx`

## Mudanças

### 1. Schema Zod (linha ~55)
Trocar:
```ts
plate: z.string().min(1, 'Placa é obrigatória'),
```
por:
```ts
plate: z.string()
  .min(1, 'Placa é obrigatória')
  .max(7, 'A placa deve ter no máximo 7 dígitos'),
```

### 2. Input do campo Placa (linha ~659)
Trocar:
```tsx
<Input placeholder="Placa do veículo" {...field} className={`h-9 ${hasInitialData ? '...' : ''}`} disabled={hasInitialData} />
```
por um `Input` com:
- `maxLength={7}`
- `onChange` que aplica `.toUpperCase()` e remove espaços, limitando a 7 caracteres
- classe `uppercase font-mono` para refletir o formato de placa

```tsx
<Input
  placeholder="Placa do veículo"
  {...field}
  maxLength={7}
  onChange={(e) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    field.onChange(v);
  }}
  className={`h-9 uppercase font-mono ${hasInitialData ? '...' : ''}`}
  disabled={hasInitialData}
/>
```

## Notas
- Quando o formulário é aberto via "Veículos Pendentes de Agendamento" (`hasInitialData = true`), o campo já vem preenchido e bloqueado — a limitação não afeta esses casos.
- A busca automática de contrato (que usa a primeira placa do campo) já trata placas com até 7 caracteres; não precisa mudar.
- Nenhuma alteração de banco nem de outras telas é necessária.
