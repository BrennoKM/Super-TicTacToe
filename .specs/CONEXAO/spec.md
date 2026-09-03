# CONEXAO: Robustez da conexão online e saída de partida

## 1. História de Usuário

**Como** jogador, **Quero** que entrar numa sala online funcione de forma previsível (conectando, ou falhando rápido com explicação) e poder sair de qualquer partida quando quiser, **Para que** eu não fique preso numa tela de "Conectando..." infinita nem numa partida que não quero mais jogar.

## 2. Contexto do Problema

Reproduzido em 2026-09-03 no site publicado:

- Os objetos `Peer` do PeerJS nunca são destruídos. Quem cria uma sala e sai continua registrado no broker: a sala vira fantasma e um segundo jogador "conecta" numa sessão que não existe mais na tela do criador.
- A reconexão automática cria um `Peer` novo a cada 4 segundos indefinidamente, sem destruir os anteriores, martelando o broker público.
- Não há timeout: quando o canal WebRTC não abre (comum entre redes diferentes, com NAT restritivo), a tela fica em "Conectando..." para sempre, sem erro e sem saída.
- Só há servidores STUN configurados; sem TURN, conexões entre redes diferentes falham com frequência.
- Não existe forma de abandonar uma partida em andamento nos modos local e contra bot.

## 3. Dependências

- Specs [[STT]] (modos de jogo) e [[P2P]] (contrato do protocolo), já entregues.

## 4. Requisitos

- **REQ-CONEXAO-01:** O sistema **deve** destruir o `Peer` (e a conexão) ao sair da sala, ao desmontar a tela online e antes de cada nova tentativa de conexão, de forma que nenhuma sala continue registrada depois que seu criador sai.
- **REQ-CONEXAO-02:** O sistema **deve** limitar a tentativa de conexão por um tempo máximo (20 segundos); esgotado o prazo sem canal aberto, exibe erro explicativo com as opções de tentar de novo e voltar.
- **REQ-CONEXAO-03:** A reconexão automática após queda **deve** ser limitada a 5 tentativas com intervalo crescente (4, 8, 16, 32 e 60 segundos); esgotadas, a reconexão só ocorre por ação manual do jogador.
- **REQ-CONEXAO-04:** O sistema **deve** configurar servidores TURN além dos STUN, para que a conexão funcione também entre jogadores em redes diferentes.
- **REQ-CONEXAO-05:** O sistema **deve** oferecer, durante qualquer partida em andamento (local, bot ou online), um controle visível de sair da partida, que leva de volta à tela de configuração.
- **REQ-CONEXAO-06:** Sair de uma partida em andamento **deve** pedir confirmação; sair de partida encerrada não pede.
- **REQ-CONEXAO-07:** Todos os textos novos seguem o i18n pt/en (REQ-STT-17).

## 5. Regras de Negócio

- **RN-CONEXAO-01:** um código de sala só é considerado ocupado enquanto o criador está com a sala aberta; ao sair, o código é liberado imediatamente.
- **RN-CONEXAO-02:** quem sai de uma partida online avisa o adversário (mensagem `leave` do contrato P2P) antes de destruir a conexão.
- **RN-CONEXAO-03:** sair de partida local ou contra bot descarta a partida em andamento salva (a partida não fica pendente pra retomada); o placar da sessão é preservado.
- **RN-CONEXAO-04:** nunca pode existir mais de uma tentativa de conexão simultânea por tela online; iniciar uma nova cancela e destrói a anterior.
- **RN-CONEXAO-05:** falha de conexão nunca deixa a tela sem saída: sempre há erro explicado com ação de voltar.
- **RN-CONEXAO-08:** um pedido de desfazer só pode ser aceito enquanto nenhuma jogada nova aconteceu depois dele; se acontecer (o adversário pode continuar jogando com o pedido em aberto), o aviso desaparece sozinho de quem tinha que responder, sem exigir decisão sobre um pedido desatualizado.

## 6. Critérios de Aceite

**Cenário AC-CONEXAO-01: sala liberada ao sair**
**Dado que** um jogador criou a sala com o código C e voltou pra configuração
**Quando** outro jogador tenta entrar com o código C
**Então** ele recebe "sala não encontrada" em vez de conectar numa sala fantasma.

**Cenário AC-CONEXAO-02: código reutilizável após sair**
**Dado que** um jogador criou e saiu da sala com o código C
**Quando** ele cria uma sala nova
**Então** a criação funciona sem erro de código em uso.

**Cenário AC-CONEXAO-03: timeout de conexão**
**Dado que** um jogador entra num código cuja conexão não se estabelece
**Quando** passam 20 segundos
**Então** aparece erro explicativo com "tentar de novo" e "voltar", e a tela sai de "Conectando...".

**Cenário AC-CONEXAO-04: reconexão limitada**
**Dado que** uma partida online perdeu a conexão
**Quando** as tentativas automáticas se esgotam (5 tentativas)
**Então** o jogo para de tentar sozinho e mantém disponíveis "Reconectar" e "Encerrar partida".

**Cenário AC-CONEXAO-05: sair de partida em andamento**
**Dado que** uma partida local ou contra bot está em andamento
**Quando** o jogador aciona sair e confirma
**Então** volta pra tela de configuração, sem partida pendente pra retomada, com o placar da sessão preservado.

**Cenário AC-CONEXAO-06: confirmação de saída**
**Dado que** uma partida está em andamento
**Quando** o jogador aciona sair e cancela a confirmação
**Então** a partida continua exatamente como estava.

**Cenário AC-CONEXAO-07: saída online avisa o adversário**
**Dado que** dois jogadores estão numa partida online
**Quando** um deles sai
**Então** o outro vê "O adversário saiu da sala" e o código é liberado.

**Cenário AC-CONEXAO-08: pedido de desfazer some visualmente e some por jogada nova**
**Dado que** um jogador pediu pra desfazer e o adversário está vendo o aviso
**Quando** (a) o aviso fica fixo no topo da tela, visível independente de rolagem, e (b) o adversário joga uma jogada nova antes de responder
**Então** o aviso é impossível de perder de vista em (a), e em (b) ele desaparece sozinho, sem opção de aceitar um pedido que já não corresponde ao estado atual da partida.

## 7. Fora do Escopo

- Servidor de sinalização ou TURN próprios (segue com serviços públicos gratuitos).
- Reconexão entre sessões de dispositivos diferentes (continua sendo por código de sala).
- PWA (próxima demanda), profundidade 3 na UI, chat, espectador e ranking.
- Diagnóstico de rede exibido ao usuário (tipo de NAT, candidatos ICE).

## 8. Notas Técnicas

- TURN: servidores públicos gratuitos do Open Relay (`openrelay.metered.ca`), somados aos STUN do Google já usados pelo PeerJS por padrão.
- O `Transport` ganha responsabilidade de destruir o `Peer` no `close()`; o `OnlineGame` cancela a tentativa anterior antes de iniciar outra e limpa tudo no desmonte.
- A confirmação de saída reusa o padrão de diálogo já existente na interface.
- RN/AC-CONEXAO-08 (revisão): o aviso de pedido de desfazer virou uma faixa fixa no topo (`position: fixed`), não um modal de tela cheia. De propósito: o adversário precisa continuar podendo jogar enquanto o pedido está em aberto (é da jogada dele que depende o pedido ficar desatualizado ou não), então nada bloqueia o tabuleiro por trás. `OnlineGame.tsx` guarda em `movesLenRef` o total de jogadas a cada mudança de estado e em `undoAskMovesRef` quantas havia quando o pedido chegou; se os dois números divergirem numa mudança de estado seguinte, o aviso é fechado localmente (sem mensagem nova no protocolo P2P, `PROTOCOL_VERSION` não muda). O lado que pediu já ficava protegido antes disso: `P2PSession.pendingUndo` zera em toda jogada aplicada (própria ou do adversário), então uma resposta atrasada a um pedido já obsoleto é ignorada (`onUndoRes`, `session.ts`).
