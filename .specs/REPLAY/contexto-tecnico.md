# Guia de Contexto Técnico: REPLAY (biblioteca, replay navegável e GIF)

## 1. O que foi alterado

Novo módulo `src/replay/` com três partes: `library.ts` (biblioteca em localStorage, limite de 100, remoção quando o fim é desfeito), `exchange.ts` (exportar/importar JSON com validação por replay do motor) e `gif.ts` (frames desenhados em canvas 2D + codificação com `gifenc`, dependência nova de ~3 KB). Duas telas novas (`LibraryScreen`, `ReplayScreen`) e ganchos no `App` e no `OnlineGame` pra salvar no fim da partida e expor os atalhos.

## 2. Referência da demanda

Spec `REPLAY` (`.specs/REPLAY/spec.md`).
Entrega: REQ-REPLAY-01..08; RN-REPLAY-01..05; AC-REPLAY-01..09.

## 3. Mudanças de dados

- `localStorage["stt.library"]` (novo): array de partidas terminadas `{id, finishedAt, mode, names por símbolo, config, moves, result}`, mais recente primeiro, máximo 100 (RN-REPLAY-04). Não destrutivo pra chaves existentes.
- Arquivo de exportação: JSON `{app: "super-tictactoe", kind: "match", version: 1, match: {...}}`; importação valida shape, tamanho (64 KiB), replay íntegro no motor e resultado batendo (RN-REPLAY-03).

## 4. Fluxo de chamadas e integrações

```
fim de partida (applyPath no App / onChange no OnlineGame)
  → replay/library#addToLibrary          [novo] guarda o id na partida corrente
desfazer que reabre o fim
  → replay/library#removeFromLibrary     [novo] RN-REPLAY-01

telas
  → LibraryScreen                        [novo] lista, exclui, exporta, importa
  → ReplayScreen                         [novo] estados via engine#replay(moves.slice(0, n));
                                          reusa BoardView com allowed vazio (somente leitura)
  → replay/gif#generateGif               [novo] buildFrames (puro, testável) +
                                          drawState em canvas + gifenc
```

Decisões relevantes:
- O replay do modo online abre DENTRO do OnlineGame (desmontar o componente derrubaria a conexão p2p).
- Nomes de exibição são resolvidos no idioma vigente no momento do salvamento e congelados na entrada (trocar idioma depois não retraduz "Bot (difícil)").
- No fim de partida, os atalhos "Ver replay"/"Baixar GIF" usam uma entrada efêmera construída do estado atual; a entrada persistida da biblioteca é a mesma em conteúdo.

## 5. Validações aplicadas

- RN-REPLAY-01: entrada criada no fim, removida se o fim é desfeito (App e OnlineGame)
- RN-REPLAY-02/05: replay e GIF derivam tudo de `{config, moves}` via motor; telas somente leitura
- RN-REPLAY-03: importação rejeita JSON malformado, shape alheio, arquivo > 64 KiB, jogada ilegal, partida não terminada e resultado divergente, sempre com mensagem, nunca com crash
- RN-REPLAY-04: `addToLibrary` corta em 100
- Armazenamento indisponível segue tolerado (try/catch, jogo funciona sem persistir)

## 6. Possíveis impactos colaterais

- `Match` (App) e o fluxo do OnlineGame ganharam o rastreio `libraryId`/refs; o salvamento acontece no mesmo ponto que contabiliza o placar, mantenha os dois juntos em manutenções.
- O GIF roda na thread principal; partidas longas (~80 jogadas) levam alguns segundos codificando. Se incomodar, mover pra Web Worker.
- `gifenc` entra no bundle principal (~3 KB gzip); PeerJS segue em chunk separado.
- A biblioteca guarda nomes como digitados: são dados locais do próprio usuário, sem exposição externa.
