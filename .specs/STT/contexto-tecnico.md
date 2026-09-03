# Guia de Contexto Técnico: STT etapas E1 + E2 + E3 (motor, local, bot e online)

## 1. O que foi alterado

Repositório saiu de vazio pra SPA React + TypeScript + Vite. O núcleo é um motor de regras em TypeScript puro (`src/engine/`), recursivo em profundidade N e sem nenhuma dependência de UI; a interface React consome esse motor pra oferecer os modos local, contra o bot e online. O bot (`src/bot/`) tem três níveis: fácil (aleatório válido), médio (ganhar/bloquear por heurística) e difícil (minimax com poda alfa-beta e avaliação posicional). O multiplayer online (`src/p2p/`) implementa a Contract Spec P2P: sessão de protocolo agnóstica de transporte, transporte PeerJS (produção, carregado sob demanda) e transporte BroadcastChannel (testes e2e). Persistência é 100% localStorage. CI no GitHub Actions roda typecheck, unitários e e2e, e publica `dist/` no GitHub Pages a cada push na `main`.

## 2. Referência da demanda

Specs `STT` (etapas E1..E3) e `P2P` (contrato do protocolo), em `.specs/`.
Entrega: REQ-STT-01..17; RN-STT-01..08; AC-STT-01..14; CL-P2P-01..08; GAR-P2P-01..08.

## 3. Mudanças de dados

Sem banco. Estado local no navegador:

- `localStorage["stt.prefs"]`: idioma, tema, nomes, símbolo do jogador 1, última configuração de regras e último modo (local/bot + dificuldade)
- `localStorage["stt.match"]`: partida local/bot em andamento como `{config, moves}` + nomes + placar + modo; removida quando a partida termina. Saves antigos sem o campo `mode` são lidos como modo local (migração leniente em `loadMatch`)
- `localStorage["stt.p2p"]`: saves de partida online chaveados por `sala:papel` (GAR-P2P-05), com `updatedAt`; `sessionStorage["stt.p2p.self"]` aponta a entrada desta aba, pra reload retomar o papel certo mesmo com host e guest no mesmo navegador
- `localStorage["stt.transport"] = "broadcast"`: chave de teste que troca o PeerJS pelo transporte BroadcastChannel (usada só pelos e2e; ausente em uso normal)

A forma serializada é mínima e reconstituível: o estado inteiro é derivado por replay determinístico de `{config, moves}` (mesma base planejada pro protocolo p2p da E3).

## 4. Fluxo de chamadas e integrações

```
clique numa célula (BoardView)
  → App#handleMove                       [novo]
  → engine/game#applyMove                [novo] valida (validateMove), aplica,
                                          trata variante de limpeza e resultado
  → App#setAndPersist                    [novo] atualiza React e salva/limpa stt.match
  → GameScreen/BoardView re-renderizam   [novo] destaque via engine/game#allowedBoards

carga da página
  → storage/persist#loadMatch            [novo] se houver partida salva,
  → App exibe diálogo de retomada        [novo] replay(saved.game) reconstrói o estado

desfazer
  → engine/game#undo                     [novo] replay de moves.slice(0, -1);
                                          no modo bot, App desfaz 2 (o par)

vez do bot (useEffect em App)
  → bot/bot#chooseMove                   [novo] fácil aleatório; médio heurístico
                                          (vencer partida > conquistar tabuleiro >
                                          bloquear conquista > centro > aleatório);
                                          difícil minimax alfa-beta, profundidade
                                          adaptativa (4, ou 3 em jogada livre)
  → App#applyPath                        [novo] mesma via da jogada humana;
                                          cliques humanos na vez do bot são ignorados

partida online (OnlineGame)
  → p2p/transport#connectTransport       [novo] PeerJS (import dinâmico) ou
                                          BroadcastChannel (chave de teste)
  → p2p/session#P2PSession               [novo] handshake hello/config/accept,
                                          moves com seq, sync de autocorreção,
                                          undo com consentimento, rematch, leave
  → engine (validateMove/applyMove/replay) [sem alteração] valida tudo dos dois lados
  → storage/persist#saveOnline           [novo] save por sala:papel a cada mudança
```

Decisões relevantes pra manutenção:

- **Direcionamento genérico (RN-STT-01):** o prefixo obrigatório do próximo caminho é `path.slice(1)` da jogada. Na profundidade 2 isso equivale à regra clássica (célula c manda pro tabuleiro c) e generaliza pra N níveis.
- **Desfazer por replay:** em vez de snapshot, o undo reconstrói o estado reaplicando as jogadas. Determinístico inclusive com a variante de limpeza.
- **Desempate (`tiebreak`) avaliado em `resultOf`:** só se aplica a tabuleiros cujos filhos são tabuleiros; tabuleiro de células cheio sem linha é sempre empate simples.

## 5. Validações aplicadas

- REQ-STT-02: `validateMove` rejeita partida encerrada, caminho malformado, célula ocupada e tabuleiro não permitido; `applyMove` lança erro e a UI ignora, estado intacto
- RN-STT-01/02: direcionamento e liberação quando o destino está decidido (`allowedBoards`)
- RN-STT-03: vitória por linha em `resultOf` (todas as 8 linhas)
- RN-STT-04: limpeza só dos tabuleiros não decididos, detectando transição aberto→conquistado por comparação com o estado anterior
- RN-STT-05: três critérios de desempate; maioria empatada em quantidade dá empate real
- RN-STT-07: só o jogador da vez joga (o motor é a única porta de entrada de jogadas)
- RN-STT-08: `state.config` é `Object.freeze`ado na criação
- Guard do modo bot: clique humano na vez do bot é ignorado (`handleHumanMove`); `chooseMove` lança erro se chamado com partida encerrada
- Protocolo p2p: toda jogada recebida passa pelo motor local (CL-P2P-03/04); anomalia de seq ou jogada inválida dispara sync e o histórico válido mais longo prevalece (GAR-P2P-03); duplicata idêntica é ignorada (GAR-P2P-02); versão incompatível encerra com aviso (CL-P2P-02); tipo de mensagem desconhecido é ignorado (CL-P2P-06); desfazer só com undoRes ok e o pedido expira com jogada nova (GAR-P2P-07)
- Heartbeat p2p (GAR-P2P-06): ping a cada 5 s com pong imediato; 12 s sem tráfego marca a queda mesmo se o canal congelar sem fechar. Adição compatível (tipos ping/pong novos, versão do protocolo mantida)
- Visual: o tabuleiro é uma grade única de traços (grossos no jogo grande, finos nos pequenos) com tremor de traço à mão via filtro SVG feTurbulence/feDisplacementMap (#squiggle, definido no App); o destaque de jogável usa a cor do jogador da vez (classes turn-X/turn-O); o tema alterna por toggle ☀️/🌙; favicon SVG e metadados de descrição/Open Graph no index.html
- AC-STT-07: bot só escolhe entre `legalMoves`; verificado por partidas bot contra bot em todas as dificuldades e variantes
- Persistência tolerante a falha: toda leitura/escrita de localStorage em try/catch; storage indisponível não quebra o jogo

## 6. Possíveis impactos colaterais

- **Contrato do motor (`src/engine/index.ts`) é a fundação do bot e da E3:** o bot consome só a API pública (`legalMoves`/`applyMove`/`resultOf`); o protocolo p2p (E3) vai trafegar a forma serializada `{config, moves}`. Mudanças de assinatura ou de semântica de serialização quebram o que vem depois; versionar com cuidado.
- **Custo do bot difícil:** minimax roda na thread principal (~30ms por jogada, até ~1s em jogada livre no início). Se a profundidade de busca aumentar, considerar Web Worker.
- **Broker público do PeerJS:** dependência externa gratuita usada só na sinalização; se estiver fora do ar, criar/entrar em sala falha com "Falha ao conectar no serviço de salas" (o jogo local/bot não é afetado). Os e2e não dependem dele (transporte BroadcastChannel).
- **`npm audit` zerado:** o ferramental de dev foi atualizado (Vite 8, Vitest 4); as 5 vulnerabilidades da linha antiga eram só do servidor de desenvolvimento e foram eliminadas.
- **`npm ci` no CI depende do campo `allowScripts` do package.json** (aprovação do postinstall do esbuild pro npm 12+). Remover esse campo pode quebrar instalação em npm novo.
- **GitHub Pages exige configuração única no repositório:** Settings → Pages → Source = "GitHub Actions". Sem isso o job `deploy` falha. O `VITE_BASE=/Super-TicTacToe/` do workflow assume o site de projeto nesse caminho; se o repositório for renomeado, ajustar.
- Sem mais impactos: não há código preexistente afetado.
