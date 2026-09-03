# RISCO: Risco na linha vencedora

## 1. História de Usuário

**Como** jogador, **Quero** ver o traço cortando as três casas que fecharam o jogo, tanto no tabuleiro pequeno quanto no grande, **Para que** a vitória fique óbvia na hora e o jogo tenha o gesto clássico de quem risca a velha no papel.

## 2. Contexto do Problema

Hoje, quando um tabuleiro pequeno é conquistado, ele apenas ganha uma marca grande sobreposta e as jogadas internas esmaecem. Falta o gesto que todo mundo faz no papel: riscar as três casas em linha. O mesmo vale para o fim da partida, quando três tabuleiros conquistados formam a linha no tabuleiro grande. Além de ser o detalhe clássico do jogo da velha, o risco mostra **por onde** a vitória aconteceu, informação que hoje o jogador precisa procurar sozinho.

## 3. Dependências

- Spec [[STT]] (regras e tabuleiro), já entregue.
- Spec [[SOM]] (o risco tem som próprio, REQ-SOM-09 e 10).
- Spec [[REPLAY2]] (o risco também aparece no GIF, com o mesmo traço à mão).

## 4. Requisitos

- **REQ-RISCO-01:** Quando uma jogada fecha uma linha de três num tabuleiro pequeno, o sistema **deve** traçar um risco sobre as três casas dessa linha, na cor de quem venceu.
- **REQ-RISCO-02:** Quando três tabuleiros conquistados formam linha no tabuleiro grande, o sistema **deve** traçar o risco correspondente sobre esses três tabuleiros, atravessando o tabuleiro inteiro.
- **REQ-RISCO-03:** O risco **deve** ter o mesmo traço à mão do resto do jogo (caneta no tema caderno, giz no tema lousa), inclusive extrapolando levemente as casas das pontas, como quem risca no papel.
- **REQ-RISCO-04:** O risco **deve** ser animado no momento em que acontece, desenhado de uma ponta à outra, e permanecer visível depois.
- **REQ-RISCO-11 (2026-09-03):** A duração da animação do risco **deve** ser a mesma duração do som daquele risco (spec [[SOM]]): o traço na tela e o traço ouvido terminam juntos. Os dois valores vêm da mesma fórmula (duração do clipe dividida pela velocidade de reprodução), sem acoplar os dois sistemas em tempo real.
- **REQ-RISCO-05:** Se uma jogada fecha mais de uma linha ao mesmo tempo, o sistema **deve** riscar todas elas.
- **REQ-RISCO-06:** O risco **deve** aparecer também no replay, na mesma jogada em que aconteceu, e no GIF exportado.
- **REQ-RISCO-07:** O motor **deve** expor quais linhas foram fechadas em cada tabuleiro, de forma derivável do estado, sem guardar dado novo nas partidas salvas.
- **REQ-RISCO-08:** No tabuleiro pequeno conquistado, a marca de quem fechou **deve** ser a protagonista: grande e nítida, com o risco e as jogadas em segundo plano. No tabuleiro grande é o contrário: o risco da vitória é o que se lê primeiro, e a marca sobreposta fica discreta.
- **REQ-RISCO-10:** A marca de conquista do tabuleiro pequeno **deve** ser dimensionada pelo próprio tabuleirinho, ficando igualmente grande no celular e no desktop.

## 5. Regras de Negócio

- **RN-RISCO-01:** só existe risco quando houve linha de três; vitória por maioria de tabuleiros (critério de desempate) e empate não geram risco.
- **RN-RISCO-02:** na variante em que o tabuleiro empatado conta pros dois, o risco atravessa também o tabuleiro empatado que completou a linha.
- **RN-RISCO-03:** desfazer a jogada que fechou a linha remove o risco correspondente.
- **RN-RISCO-04:** com a variante de limpeza ligada, o risco do tabuleiro conquistado permanece; a limpeza afeta apenas os tabuleiros ainda em aberto.
- **RN-RISCO-05:** o risco é sempre derivado do estado do tabuleiro pelo motor, nunca guardado na partida salva, para que partidas antigas e importadas também mostrem o risco.
- **RN-RISCO-06:** navegar o replay jogada a jogada mostra o risco a partir da jogada que o criou, sem animação a cada passo; a animação acontece na reprodução automática e no jogo ao vivo.

## 6. Critérios de Aceite

**Cenário AC-RISCO-01: risco no tabuleiro pequeno**
**Dado que** X tem duas casas de uma linha num tabuleiro pequeno
**Quando** X joga a terceira casa dessa linha
**Então** aparece um risco na cor de X sobre as três casas, animado de uma ponta à outra, e o tabuleiro fica conquistado.

**Cenário AC-RISCO-02: risco no tabuleiro grande encerra a partida**
**Dado que** X conquistou dois tabuleiros de uma linha do tabuleiro grande
**Quando** X conquista o terceiro dessa linha
**Então** aparece o risco grande atravessando os três tabuleiros e a partida é anunciada como vencida.

**Cenário AC-RISCO-03: diagonal**
**Dado que** a linha vencedora é uma das diagonais
**Quando** ela é fechada
**Então** o risco é traçado na diagonal correspondente, de canto a canto.

**Cenário AC-RISCO-04: duas linhas de uma vez**
**Dado que** uma única jogada fecha duas linhas do mesmo tabuleiro
**Quando** ela é feita
**Então** as duas linhas aparecem riscadas.

**Cenário AC-RISCO-05: vitória por maioria não risca**
**Dado que** o critério de desempate é maioria de tabuleiros e o tabuleiro grande encheu sem linha
**Quando** a partida é decidida
**Então** o vencedor é anunciado e nenhum risco grande é traçado.

**Cenário AC-RISCO-06: desfazer remove o risco**
**Dado que** um risco acabou de ser traçado
**Quando** o jogador desfaz a jogada que fechou a linha
**Então** o risco some junto com a marca.

**Cenário AC-RISCO-07: risco no replay e no GIF**
**Dado que** uma partida com vitória por linha está salva na biblioteca
**Quando** o jogador assiste ao replay e baixa o GIF
**Então** o risco aparece nos dois, a partir da jogada que o criou.

**Cenário AC-RISCO-08: partida antiga também risca**
**Dado que** existe uma partida salva antes desta entrega
**Quando** o jogador abre o replay dela
**Então** o risco aparece normalmente, porque é derivado do estado, não guardado.

**Cenário AC-RISCO-09: variante de limpeza preserva o risco**
**Dado que** a variante de limpeza está ligada
**Quando** um tabuleiro é conquistado e os demais são limpos
**Então** o risco do tabuleiro conquistado continua visível.

**Cenário AC-RISCO-10: traço e som terminam juntos**
**Dado que** um risco pequeno e um risco grande acontecem
**Quando** cada um é traçado
**Então** a animação do traço dura o mesmo tempo que o som daquele risco: o grande visivelmente mais longo que o pequeno.

## 7. Fora do Escopo

- Riscos em profundidade maior que 2 (a interface segue no jogo clássico de dois níveis).
- Efeitos de comemoração além do risco (confete, brilho, tremor de tela).
- Escolher a cor ou o estilo do risco nas preferências.
- Riscar linhas apenas ameaçadas (duas casas mais uma livre) como dica ao jogador.

## 8. Notas Técnicas

- O motor ganha uma função pura que devolve as linhas vencedoras de um tabuleiro (índices das três casas), reaproveitando a tabela `LINES` já existente; ela é usada pela tela, pelo replay e pelo desenho do GIF, atendendo REQ-RISCO-07 e RN-RISCO-05.
- Na tela, o risco é um SVG sobreposto ao tabuleiro, com o mesmo filtro de tremor usado nas linhas, animado por `stroke-dasharray` e `stroke-dashoffset`.
- No GIF, o risco é desenhado no canvas junto com o resto do quadro (spec REPLAY2), com o mesmo deslocamento pseudoaleatório de semente fixa.
- A extrapolação das pontas (REQ-RISCO-03) é um percentual da largura da casa, para imitar o gesto humano.
- O som do risco vem da spec [[SOM]] (REQ-SOM-09 e REQ-SOM-10) e respeita o silenciar.
- REQ-RISCO-11: as durações ficam em `src/ui/themes.css` como `--strike-dur-small`/`--strike-dur-big`, por tema, calculadas manualmente a partir das mesmas taxas base (`RATE.small.base`, `RATE.big.base`) e durações de clipe (`CLIP_DURATION_S`) de `src/audio/sound.ts`. Não há acoplamento em tempo real entre os dois arquivos: se a taxa mudar lá, o valor precisa ser recalculado aqui à mão (comentário cruzado nos dois arquivos avisa disso). O tabuleiro grande usa a duração maior via o mesmo seletor que já diferencia a espessura do traço (`.macro-board > .strike-layer .strike`).
