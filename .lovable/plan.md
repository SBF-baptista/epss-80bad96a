Diagnóstico encontrado:
- O Matheus (`matheus.nunes@segsat.com`) está com apenas uma permissão salva: `homologation=admin`.
- Ele não tem `kickoff=admin`, nem perfil de acesso vinculado (`access_profile_id` está vazio).
- Por isso a página de Kickoff não libera tudo para ele.
- Além disso, hoje a tela de Kickoff pendente não tem uma ação de “apagar card” implementada; só existe “Realizar Kickoff”. Então mesmo com permissão correta, o botão de exclusão não apareceria.

Plano de correção:
1. Ajustar permissões do Matheus no banco
   - Vincular o Matheus ao perfil `Gerente`, que já tem `kickoff=admin` e acesso total aos módulos.
   - Como segurança extra, sincronizar permissões explícitas em `user_module_permissions` para incluir `kickoff=admin` e os demais módulos admin, evitando depender só do perfil.

2. Implementar exclusão de card pendente no Kickoff
   - Criar uma função de serviço para excluir/remover um card pendente por `sale_summary_id`.
   - A exclusão deve atuar nos veículos pendentes da venda (`incoming_vehicles` com `kickoff_completed=false`) e remover/limpar dados relacionados de acessórios quando aplicável.
   - Manter histórico via log da ação.

3. Mostrar botão “Excluir” apenas para admin do Kickoff
   - Atualizar `KickoffClientCard` para receber permissão de gerenciamento.
   - Exibir botão de lixeira apenas quando `canManageModule('kickoff')` for verdadeiro.
   - Manter o botão “Realizar Kickoff” para quem pode editar.

4. Confirmar exclusão antes de apagar
   - Adicionar confirmação na página `Kickoff` antes de excluir o card.
   - Após exclusão, atualizar a lista de pendentes, estatísticas e datas.

5. Corrigir a leitura/visibilidade de permissões se necessário
   - Garantir que `useUserRole` reconheça corretamente permissões vindas de perfil e permissões explícitas.
   - Remover logs de debug excessivos após confirmar o funcionamento.

Resultado esperado:
- Matheus acessa completamente a página de Kickoff.
- Matheus vê a opção de excluir/apagar cards pendentes do Kickoff.
- A exclusão funciona apenas para usuários com `kickoff=admin` ou admin global.