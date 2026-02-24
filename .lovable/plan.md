

## Corrigir Conteudo da Mensagem no Controle de Mensagens

### Problema
O conteudo salvo no banco (`message_content`) e uma concatenacao crua das variaveis do template:
```
Template: daily_agenda | technicianName: Zaqueu | scheduledDate: 24/02/2026 | schedule1: ...
```
Quando na verdade a mensagem entregue no WhatsApp e formatada assim:
```
📌 Horario: 09:35 | Cliente: PEDROCA | Servico: Instalacao | ...
```

### Causa Raiz
No arquivo `supabase/functions/send-whatsapp/index.ts` (linhas 482-496), a logica de construcao do `messageContent` para templates simplesmente concatena todas as variaveis com seus nomes de chave, sem reproduzir o formato real da mensagem.

### Solucao
Alterar a logica de construcao do `messageContent` na edge function para cada tipo de template, gerando um texto fiel ao que e entregue no WhatsApp:

**Arquivo**: `supabase/functions/send-whatsapp/index.ts`

Para `daily_agenda`:
- Montar o conteudo com cabecalho do tecnico e data
- Listar cada schedule (1-5) em linhas separadas, sem os prefixos de chave
- Remover marcadores de negrito (`*`) ja que no banco nao ha formatacao WhatsApp

Para `technician_schedule` / `technician_schedule_notification`:
- Montar com nome do tecnico, data, horario, cliente, endereco e contato

Para `technician_next_day_agenda`:
- Montar com nome, data e lista de agendamentos

Para `order_shipped`:
- Montar com numero do pedido, destinatario e empresa

Para mensagens customizadas (`customMessage`):
- Manter como esta (ja e o texto real)

### Detalhes Tecnicos

A alteracao e exclusivamente na secao de logging da edge function (linhas ~482-496). A logica atual:

```typescript
messageContent = `Template: ${templateType}`;
if (templateVariables) {
  const vars = Object.entries(templateVariables)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');
  if (vars) messageContent += ` | ${vars}`;
}
```

Sera substituida por uma funcao que formata o conteudo de acordo com o `templateType`, reconstruindo o texto como ele aparece no WhatsApp. Exemplo para `daily_agenda`:

```typescript
function buildReadableContent(templateType, templateVariables, orderNumber, recipientName, companyName) {
  if (templateType === 'daily_agenda') {
    const header = `Agenda ${templateVariables.scheduledDate} - ${templateVariables.technicianName}`;
    const schedules = [
      templateVariables.schedule1,
      templateVariables.schedule2,
      templateVariables.schedule3,
      templateVariables.schedule4,
      templateVariables.schedule5,
    ].filter(s => s && s !== '-' && s.trim() !== '');
    // Remove bold markers (*text*) for plain text storage
    const clean = (s) => s.replace(/\*/g, '');
    return header + '\n\n' + schedules.map(clean).join('\n\n');
  }
  // ... outros templates
}
```

### Resultado Esperado
O campo "Conteudo da Mensagem" no popup de detalhes exibira:

```
Agenda 24/02/2026 - Zaqueu

📌 Horario: 16:30 | Cliente: VINICIUS | Servico: Instalacao | Endereco: Rua P, 33, Redencao, Vitoria de Santo Antao, PE | Ponto de referencia: Segsat | Telefone cliente: 993937306 | Contato local: 23897238671 | Protocolo: -
```

Isso reflete fielmente o que o tecnico recebe no WhatsApp.

### Escopo
- 1 arquivo editado: `supabase/functions/send-whatsapp/index.ts`
- Redeploy da edge function `send-whatsapp`
- Nenhuma alteracao no frontend (a exibicao ja usa `<pre>` com `whitespace-pre-wrap`)
- Mensagens anteriores no banco nao serao afetadas (apenas novos envios)

