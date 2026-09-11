# Corrigir a importação automática do Segsale

## Diagnóstico confirmado

A rotina de 10 minutos está ativa e sendo disparada, mas a busca automática está olhando para o lugar errado:

- A descoberta parte do maior identificador encontrado no Kickoff. Existem registros manuais com identificadores `900001` e superiores; por isso ela tenta procurar novas vendas a partir de `900002`, enquanto as vendas reais do Segsale estão atualmente na faixa de `11551`.
- A rotina também usa veículos com `processed = false` como fila de sincronização. No fluxo normal, veículos que aguardam ou já concluíram o Kickoff podem continuar com esse valor, criando uma fila permanente de 280 vendas e fazendo a rotina revisitar vendas antigas.
- A consulta pública ao Segsale limita 5 chamadas por minuto, mas uma sincronização automática pode fazer até 8 buscas de descoberta e mais 10 processamentos. Isso pode interromper parte do ciclo de forma intermitente.
- O agendador registra “sucesso” quando apenas entrega a chamada; a própria rotina também finaliza com sucesso mesmo quando algumas vendas falham ou retornam vazias. Assim, o problema fica invisível.
- Há dois agendamentos ativos para a mesma rotina: a cada 10 minutos e a cada 5 horas.

A integração em si está funcionando: quando as vendas corretas foram consultadas, as vendas `11548` a `11551` foram gravadas entre 14:08 e 14:10. O defeito está na descoberta e no controle da fila automática, não no cadastro do veículo.

## Correção

1. **Separar vendas reais de registros manuais**
   - Nunca usar identificadores sintéticos/manuais como ponto inicial da busca no Segsale.
   - Manter um cursor próprio com o último identificador real consultado.

2. **Criar uma descoberta contínua e tolerante a atrasos**
   - A cada ciclo, revisar uma pequena faixa anterior e avançar a partir do último identificador real.
   - Registrar IDs vazios temporariamente e tentar novamente em ciclos futuros, sem bloquear vendas mais novas.

3. **Eliminar a fila incorreta**
   - Parar de tratar todo veículo com `processed = false` como venda pendente de importação.
   - Controlar importação, tentativa, erro e conclusão no estado da integração, independentemente da etapa do Kickoff.

4. **Evitar bloqueio por limite de chamadas**
   - Manter a proteção para consultas públicas.
   - Permitir que a rotina interna autenticada consulte o volume necessário ou processe em lotes controlados.

5. **Corrigir monitoramento e agendamento**
   - Desativar o agendamento antigo de 5 horas e manter apenas o de 10 minutos.
   - Registrar quantas vendas foram descobertas, importadas, ignoradas e falharam.
   - Marcar o ciclo como parcial/erro quando alguma venda não for processada, em vez de mostrar sucesso geral.

6. **Validar o fluxo completo**
   - Executar uma busca automática sem informar IDs manualmente.
   - Confirmar que ela começa depois da última venda real (`11551` no diagnóstico atual), não em `900002`.
   - Simular venda vazia, venda válida e falha temporária, verificando que uma não impede as demais.
   - Confirmar no ciclo seguinte de 10 minutos que novas vendas entram no Kickoff sem intervenção manual.

## Resultado esperado

Novas vendas do Segsale serão procuradas e inseridas automaticamente a cada 10 minutos, sem depender de solicitação manual e sem serem bloqueadas por registros antigos ou criados manualmente.
