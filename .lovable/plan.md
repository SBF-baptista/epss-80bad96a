

# Plan: Integrar trocarLocalBemList no fluxo de Aguardando Envio

## Resumo

Ao salvar as informações de envio no status "Aguardando Envio", o sistema deve chamar a edge function `trocar-bem` enviando os IMEIs escaneados como `codigosTombamento` e um novo campo "Local Bem" como `codLocal`. O campo "Local Bem" será adicionado ao lado do campo "Código da Linha" no formulário de escaneamento.

## Mudanças

### 1. Adicionar campo "Local Bem" no ProductionScannerTabs
**Arquivo:** `src/components/production/ProductionScannerTabs.tsx`
- Adicionar nova prop `localBem` e `onLocalBemChange`
- Renderizar um campo de input "Local Bem" ao lado do campo "Código da Linha" nas duas tabs (scanner e manual)

### 2. Propagar prop pelo ProductionForm
**Arquivo:** `src/components/production/ProductionForm.tsx`
- Adicionar props `localBem` e `onLocalBemChange` na interface e repassar ao `ProductionScannerTabs`

### 3. Adicionar estado e lógica no OrderModal
**Arquivo:** `src/components/OrderModal.tsx`
- Criar estado `localBem` / `setLocalBem`
- Passar `localBem` e `setLocalBem` como props para `ProductionForm`
- Passar `localBem` e `productionItems` (IMEIs) para `ShipmentFormEmbedded` para que o save possa usá-los

### 4. Integrar chamada trocar-bem no ShipmentFormEmbedded
**Arquivo:** `src/components/shipment/ShipmentFormEmbedded.tsx`
- Aceitar novas props: `localBem` (string) e `scannedImeis` (string[])
- Na função `handleSave`, após salvar o envio com sucesso, chamar `supabase.functions.invoke('trocar-bem')` com:
  - `codLocal`: valor do campo "Local Bem"
  - `codigosTombamento`: array de IMEIs dos itens escaneados
- Exibir toast de sucesso/erro para a chamada da API
- Incluir `localBem` preenchido como requisito de validação do formulário (junto com endereço e rastreio)

### Fluxo resultante
1. Operador escaneia IMEIs na seção "Escaneamento / Itens"
2. Operador preenche o campo "Local Bem" ao lado do "Código da Linha"
3. Operador preenche endereço e código de rastreio na seção "Envio Logístico"
4. Ao clicar "Salvar Informações de Envio": salva envio no banco E faz POST na API trocarLocalBemList via edge function

