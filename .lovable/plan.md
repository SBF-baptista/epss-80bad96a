
# Correção das Linhas de Conexão do Timeline

## Problema Identificado

Analisando a imagem e o código, identifiquei os seguintes problemas:

1. **Posicionamento incorreto**: As linhas estão usando `position: absolute` com `left-0 right-0` e `px-4`, o que não alinha corretamente com o centro dos ícones
2. **Linhas passando dos ícones**: As margens e o sistema de `flex-1` não garantem que as linhas comecem e terminem exatamente no centro de cada ícone
3. **Visual feio**: A falta de alinhamento preciso faz com que as linhas ultrapassem os limites visuais esperados

## Solução Proposta

Vou reescrever a lógica de renderização das linhas usando uma abordagem diferente:

**Em vez de um container absoluto separado**, vou renderizar cada linha de conexão individualmente entre os steps, garantindo que cada linha comece exatamente após o ícone anterior e termine antes do próximo.

### Mudanças no arquivo `KitStatusTimeline.tsx`:

1. **Remover o container absoluto das linhas** - A abordagem atual não funciona bem
2. **Integrar as linhas dentro do fluxo de cada step** - Cada step terá sua própria linha de conexão (exceto o último)
3. **Usar posicionamento relativo** - As linhas ficarão posicionadas corretamente entre os centros dos ícones

### Nova estrutura do componente:

```
[Ícone 1] ─────── [Ícone 2] ─────── [Ícone 3] ...
```

Cada step terá:
- O ícone centralizado
- Uma linha que se estende até o próximo ícone (exceto o último step)
- A linha ficará atrás do ícone usando z-index

### Detalhes Técnicos:

- Cada linha será um elemento absoluto dentro do container do step
- Posicionada horizontalmente do centro do ícone atual até o centro do próximo
- Usando `calc(50% + 16px)` para iniciar após o ícone e `calc(100% + diferença)` para chegar ao próximo
- Z-index menor que o ícone para ficar por trás

---

## Resultado Esperado

- Linhas perfeitamente alinhadas entre o centro de cada ícone
- Linha verde para etapas concluídas
- Linha cinza para etapas pendentes
- Transição visual suave
- Sem linhas passando por cima ou além dos ícones
