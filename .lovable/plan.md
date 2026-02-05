
# Plano de Correção: Linhas de Conexão no Timeline de Acompanhamento de Clientes

## Problema Identificado

As linhas de conexão entre os ícones de status do timeline não estão aparecendo. Analisando o código atual, encontrei a causa:

- As linhas são renderizadas em um container com posição absoluta (`z-0`)
- Cada etapa (step) tem `bg-card` aplicado em todo o container, que está cobrindo completamente as linhas
- O `bg-card` deveria estar apenas no círculo do ícone, não em toda a coluna

## Solução Proposta

### Arquivo: `src/components/customer-tracking/KitStatusTimeline.tsx`

**Alterações:**

1. **Remover `bg-card` do container da etapa** - O background não deve cobrir a área das linhas
2. **Adicionar `bg-card` apenas ao círculo do ícone** - Para que as linhas passem por trás do círculo de forma limpa
3. **Ajustar o posicionamento das linhas** - Garantir que fiquem visíveis entre os ícones

**Mudança específica no código:**

```text
Antes:
<div key={step.id} className="flex flex-col items-center z-10 bg-card px-0.5 flex-1">

Depois:
<div key={step.id} className="flex flex-col items-center z-10 px-0.5 flex-1">
```

E garantir que o círculo do ícone tenha o background:

```text
<div className={`
  w-8 h-8 rounded-full flex items-center justify-center border-2 
  transition-all duration-200 bg-card
  ${styles.circle}
`}>
```

## Resultado Esperado

Após a correção, o timeline exibirá:
- **Linha verde** entre etapas concluídas (indicando que o processo passou)
- **Linha cinza** entre etapas pendentes (indicando que ainda não foi alcançado)
- Os círculos dos ícones continuarão limpos, com o fundo sólido cobrindo a linha exatamente no ponto do ícone
