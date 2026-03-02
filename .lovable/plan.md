
Objetivo
Corrigir imediatamente o fluxo de login para que ele siga sempre a sequência esperada (e-mail → código → senha) sem travar na primeira tela, e reduzir o problema de “código não chega” causado por bloqueio de envio no Supabase.

Diagnóstico já confirmado
- O front está usando a rota correta (`/auth`) e o fluxo está implementado em `src/pages/Auth.tsx`.
- O problema principal não é renderização: os logs do Supabase Auth mostram erro real de envio:
  - `POST /otp`
  - `status 429`
  - `error_code: over_email_send_rate_limit`
  - `msg: 429: email rate limit exceeded`
- Isso significa que, em várias tentativas seguidas, o provedor de auth bloqueia novos e-mails temporariamente.
- Há um segundo risco funcional: o fluxo pede código de 6 dígitos, então o template de e-mail de Magic Link precisa conter `{{ .Token }}`; sem isso, pode chegar link sem código.

Plano de correção (implementação)
1) Ajustar o comportamento da etapa de e-mail para nunca “prender” o usuário
- Arquivo: `src/pages/Auth.tsx`
- Manter avanço para etapa `code` ao clicar em “Continuar” mesmo quando houver throttling (429), como você pediu.
- Separar mensagens de UX por cenário:
  - envio aceito: “Código enviado”
  - rate limit: “Use o último código enviado e aguarde para novo envio”
- Garantir que `otpExpiry` só seja renovado de forma consistente (evitar reset indevido em toda tentativa).

2) Implementar bloqueio anti-spam mais forte e persistente (evita 429 recorrente)
- Arquivo: `src/pages/Auth.tsx`
- Hoje o cooldown é curto e só em memória; ao recarregar a página, perde estado.
- Vou implementar cooldown persistido em `localStorage` por e-mail (chave por endereço) para:
  - bloquear novos envios por janela mínima (ex.: 60s) após sucesso;
  - aplicar janela maior após 429 (ex.: 3–5 min), com countdown visível;
  - impedir spam de “Reenviar código” mesmo após refresh.
- Resultado esperado: menos chamadas ao `/otp`, menos bloqueio e mais chance de entrega real.

3) Tornar “Reenviar código” seguro e previsível
- Arquivo: `src/pages/Auth.tsx`
- Reenviar deve respeitar o mesmo cooldown do botão principal.
- Quando bloqueado, botão desabilitado + texto do tempo restante.
- Isso evita que o usuário fique tentando sem efeito e agrave o rate limit.

4) Revisar template de e-mail no Supabase para código de 6 dígitos
- Ação de configuração (dashboard Supabase Auth, não no código do front):
  - Template “Magic Link” deve incluir `{{ .Token }}`.
- Sem isso, o usuário pode não visualizar o código manual mesmo quando o e-mail chega.

5) Melhorar mensagens para clareza operacional
- Arquivo: `src/pages/Auth.tsx`
- Em vez de mensagem genérica, mostrar instruções objetivas:
  - “Verifique caixa de spam”
  - “Aguarde Xs para novo envio”
  - “Use o último código recebido”
- Isso reduz confusão e retrabalho no login.

Critérios de aceite
- Clicar “Continuar” sempre leva para a etapa do código.
- Se houver 429, usuário não fica travado; recebe orientação clara e cooldown aplicado.
- “Reenviar código” não dispara chamadas durante cooldown.
- Após refresh da página, cooldown continua válido.
- Com limite liberado, novo e-mail volta a ser enviado normalmente.
- Fluxo completo funciona: e-mail → código válido → senha → acesso.

Validação end-to-end (após implementar)
1. Solicitar código uma vez e confirmar avanço para etapa 2.
2. Tentar reenviar antes do tempo e confirmar bloqueio com countdown.
3. Aguardar término do cooldown e reenviar.
4. Confirmar chegada do e-mail e entrada do código.
5. Concluir senha e login.
6. Repetir com refresh entre etapas para validar persistência do cooldown.

Observações importantes
- O 429 é limitação real do Supabase Auth; não dá para “desligar” só no frontend.
- O frontend pode e deve evitar gerar rajadas de envio.
- A correção combina UX + proteção de fluxo + configuração correta do template para estabilizar de vez.
