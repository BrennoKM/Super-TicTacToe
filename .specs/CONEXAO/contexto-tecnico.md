# Guia de Contexto Técnico: CONEXAO (robustez do online e saída de partida)

## 1. O que foi alterado

`src/p2p/transport.ts` passou a devolver uma tentativa cancelável (`TransportAttempt`) que destrói o `Peer` do PeerJS ao cancelar ou fechar; antes o `Peer` nunca era destruído, o que deixava salas registradas no broker aceitando conexões fantasma. O `OnlineGame` cancela a tentativa anterior antes de abrir outra, limpa tudo no desmonte, aplica timeout de 20 s no papel de guest e limita a reconexão automática a 5 tentativas com intervalo crescente. Foram adicionados servidores TURN à configuração de ICE. Na interface, sair da partida passou a existir durante o jogo (não só no fim) e pede confirmação.

## 2. Referência da demanda

Spec `CONEXAO` (`.specs/CONEXAO/spec.md`).
Entrega: REQ-CONEXAO-01..07; RN-CONEXAO-01..05; AC-CONEXAO-01..07.

## 3. Mudanças de dados

Sem alteração de schema. Comportamento novo em dado existente: sair de partida local ou bot chama `clearMatch()`, então `localStorage["stt.match"]` não fica com partida pendente (RN-CONEXAO-03). Sair de partida online segue limpando `stt.p2p` da sala/papel correspondente.

## 4. Fluxo de chamadas e integrações

```
abrir tela online (OnlineGame#connect)
  → attemptRef.cancel()                  [novo] destrói o peer da tentativa anterior
  → setTimeout(CONNECT_TIMEOUT_MS)       [novo] só no papel guest; host espera indefinido
  → p2p/transport#connectTransport       [alterado] devolve TransportAttempt
      → connectPeerJs                    [alterado] guarda `cancelled`, destrói peer,
                                          iceServers com STUN + TURN
      → connectBroadcast                 [alterado] sonda a sala (ping-room/room-alive)
                                          pra refletir a mesma semântica nos testes
desmontar a tela / sair
  → attemptRef.cancel() + clearTimeout   [novo] libera o código da sala no broker
queda de conexão
  → efeito de reconexão                  [alterado] backoff 4/8/16/32/60 s, máximo 5,
                                          depois só manual (manualReconnect)
sair da partida (qualquer modo)
  → GameScreen: botão leave-match        [novo] visível com partida em andamento
  → App / OnlineGame: diálogo leave-dialog [novo] confirma antes de encerrar
```

Detalhe importante: o transporte BroadcastChannel dos testes ganhou uma sondagem de sala (`ping-room` respondido só por host presente) porque, sem isso, ele não conseguiria reproduzir o cenário de sala abandonada que o PeerJS agora trata corretamente.

## 5. Validações aplicadas

- REQ-CONEXAO-01 / RN-CONEXAO-01: `Peer.destroy()` no `close()` do transporte, no `cancel()` da tentativa e no desmonte da tela
- REQ-CONEXAO-02 / RN-CONEXAO-05: timeout de 20 s no guest com erro `tempo-esgotado`; toda tela de erro tem "Tentar de novo" e "Voltar"
- REQ-CONEXAO-03: `RECONNECT_DELAYS_MS` limita a 5 tentativas; sucesso zera o contador
- RN-CONEXAO-04: `attemptRef` garante tentativa única; callbacks de tentativa cancelada são ignorados (guarda `cancelled`)
- REQ-CONEXAO-05/06 / RN-CONEXAO-03: sair disponível durante a partida, com confirmação, e `clearMatch()` no local/bot
- RN-CONEXAO-02: `session.leave()` continua avisando o adversário antes de destruir a conexão
- RN-CONEXAO-08 (revisão): `OnlineGame.tsx` guarda `movesLenRef` (total de jogadas a cada `onChange`) e `undoAskMovesRef` (quantas havia quando o pedido chegou); divergência entre os dois fecha o aviso local sem exigir decisão. Nenhuma mensagem nova no protocolo P2P; `P2PSession.pendingUndo` (lado de quem pediu) já zerava em toda jogada aplicada, então o requerente já ficava protegido contra aceitar uma resposta atrasada a um pedido obsoleto.

## 6. Possíveis impactos colaterais

- **TURN público (Open Relay):** dependência externa gratuita, sem garantia de disponibilidade nem de banda. Se sair do ar, volta-se ao comportamento anterior (só STUN), que funciona em redes permissivas. Trocar por outro provedor é mudar a lista `ICE_SERVERS`.
- **Peers destruídos de forma mais agressiva:** se alguma tela futura precisar manter a conexão viva ao trocar de componente, precisará segurar a tentativa fora do `OnlineGame` (hoje o replay online abre por dentro, justamente por isso).
- **StrictMode em desenvolvimento** monta efeitos duas vezes; com o cancelamento da tentativa anterior isso agora se resolve sozinho, mas em dev ainda aparecem dois registros no broker por instante (não acontece no build de produção).
- Os testes e2e continuam usando o transporte BroadcastChannel; o caminho PeerJS real foi verificado manualmente (sala abandonada, partida completa e saída avisando o adversário) contra o broker público.
