
# Correção: Input de Quantidade de Câmera Extra não Aparecendo

## Problema Identificado

O veículo com placa **RZP4H27** possui o acessório "CAMERA EXTRA" no banco de dados, mas o campo de quantidade não aparece na interface.

### Causa Raiz

O código tem um **bug de comparação de strings**. Nas linhas 406-408 (mobile) e 661-663 (desktop):

```javascript
const isCameraExtra =
  item.name.toLowerCase().includes("CAMERA EXTRA") ||
  item.name.toLowerCase().includes("CAMERA EXTRA");
```

O problema:
- `.toLowerCase()` converte o nome para minúsculas: "camera extra"
- A busca usa "CAMERA EXTRA" (maiúsculas)
- `"camera extra".includes("CAMERA EXTRA")` sempre retorna `false`

---

## Solução

### Arquivo: `src/components/kickoff/KickoffVehiclesTable.tsx`

**Alterar de:**
```javascript
const isCameraExtra =
  item.name.toLowerCase().includes("CAMERA EXTRA") ||
  item.name.toLowerCase().includes("CAMERA EXTRA");
```

**Para:**
```javascript
const isCameraExtra = item.name.toLowerCase().includes("camera extra");
```

### Locais a Corrigir:
1. **Linha ~406-408** - Layout mobile (dentro do bloco `lg:hidden`)
2. **Linha ~661-663** - Layout desktop (dentro da tabela)

---

## Resultado Esperado

Após a correção:
- O veículo RZP4H27 exibirá o campo de input numérico para definir a quantidade de câmeras extras
- Qualquer veículo com acessório contendo "câmera extra" (independente de maiúsculas/minúsculas) terá o campo de quantidade
