# REPLAY: Biblioteca de partidas, replay navegável e GIF

## 1. História de Usuário

**Como** jogador, **Quero** que minhas partidas terminadas fiquem salvas numa biblioteca, poder revê-las jogada a jogada, compartilhá-las como arquivo e baixar um GIF leve da partida, **Para que** eu estude lances, guarde partidas memoráveis e mostre pros amigos.

## 2. Contexto do Problema

O jogo já serializa toda partida como `{config, moves}` e reconstrói qualquer estado por replay determinístico do motor (base da retomada e do p2p). Hoje esse histórico é descartado quando a partida termina. Esta demanda o transforma em três recursos: biblioteca, player de replay e exportação (arquivo e GIF).

## 3. Dependências

- Motor e serialização da spec [[STT]] (já entregues).

## 4. Requisitos

- **REQ-REPLAY-01:** O sistema **deve** salvar automaticamente na biblioteca local toda partida terminada (qualquer modo: local, bot ou online), registrando data, modo, nomes, configuração de regras, jogadas e resultado.
- **REQ-REPLAY-02:** O sistema **deve** oferecer uma tela de biblioteca listando as partidas da mais recente pra mais antiga (data, jogadores, modo, resultado), com ações de abrir replay, exportar e excluir.
- **REQ-REPLAY-03:** O player de replay **deve** ter controles de primeira/anterior/próxima/última jogada e reprodução automática com pausa, exibir "jogada N de M" e renderizar o tabuleiro no estado exato de cada ponto, respeitando as regras da partida (variante de limpeza inclusive).
- **REQ-REPLAY-04:** O sistema **deve** exportar uma partida da biblioteca (ou recém-terminada) como arquivo JSON pequeno, com nome de arquivo contendo data e jogadores.
- **REQ-REPLAY-05:** O sistema **deve** importar um arquivo exportado, validá-lo reproduzindo-o no motor e, se válido, abrir o replay (e guardar na biblioteca); arquivo inválido é rejeitado com mensagem clara, sem quebrar nada.
- **REQ-REPLAY-06:** O sistema **deve** gerar no próprio navegador um GIF leve da partida: um frame por jogada mais um frame final demorado, com o visual do tema em uso, disponível pra download na tela de replay e na de fim de partida.
- **REQ-REPLAY-07:** O fim de partida **deve** oferecer atalhos "ver replay" e "baixar GIF"; a tela inicial **deve** dar acesso à biblioteca.
- **REQ-REPLAY-08:** Todos os textos novos seguem o i18n pt/en existente (REQ-STT-17).

## 5. Regras de Negócio

- **RN-REPLAY-01:** a partida entra na biblioteca no momento em que termina; se o fim for desfeito (desfazer reabre a partida), a entrada correspondente sai da biblioteca e volta quando houver novo fim.
- **RN-REPLAY-02:** a biblioteca armazena somente `{config, moves}` mais metadados (data, nomes, modo, resultado); todo estado exibido é derivado por replay do motor, nunca pré-computado.
- **RN-REPLAY-03:** importação só aceita partida que o motor reproduz sem erro (a mesma validação do sync p2p); tamanho máximo do arquivo: 64 KiB.
- **RN-REPLAY-04:** a biblioteca guarda no máximo 100 partidas; ao exceder, as mais antigas são descartadas.
- **RN-REPLAY-05:** o replay é somente leitura: não altera placar, preferências nem partidas em andamento.

## 6. Critérios de Aceite

**Cenário AC-REPLAY-01: salvamento automático**
**Dado que** uma partida (local, bot ou online) chega ao fim
**Quando** o resultado é anunciado
**Então** a partida aparece no topo da biblioteca com data, jogadores, modo e resultado corretos.

**Cenário AC-REPLAY-02: navegação do replay**
**Dado que** um replay está aberto na jogada 5 de 17
**Quando** o jogador usa próxima/anterior/última/primeira
**Então** o tabuleiro mostra exatamente o estado após a jogada correspondente e o contador acompanha.

**Cenário AC-REPLAY-03: replay respeita variantes**
**Dado que** a partida foi jogada com a variante de limpeza ligada
**Quando** o replay passa pela jogada que conquista um tabuleiro
**Então** os tabuleiros abertos aparecem limpos no frame seguinte, como na partida original.

**Cenário AC-REPLAY-04: reprodução automática**
**Dado que** um replay está aberto
**Quando** o jogador aciona reproduzir
**Então** as jogadas avançam sozinhas até o fim (com pausa disponível a qualquer momento).

**Cenário AC-REPLAY-05: exportar e importar**
**Dado que** uma partida está na biblioteca
**Quando** o jogador exporta, e o arquivo é importado (em outro navegador ou no mesmo)
**Então** o replay abre idêntico ao original e a partida entra na biblioteca de destino.

**Cenário AC-REPLAY-06: importação inválida**
**Dado que** um arquivo corrompido ou adulterado (jogada ilegal) é importado
**Quando** a validação roda
**Então** aparece mensagem de arquivo inválido e nada é salvo nem quebrado.

**Cenário AC-REPLAY-07: GIF da partida**
**Dado que** uma partida de M jogadas terminou
**Quando** o jogador baixa o GIF
**Então** o arquivo tem M mais 1 frames (estado após cada jogada e o final demorado), no visual do tema em uso.

**Cenário AC-REPLAY-08: desfazer o fim remove da biblioteca**
**Dado que** a partida terminou e entrou na biblioteca
**Quando** o jogador desfaz a última jogada (partida reabre)
**Então** a entrada sai da biblioteca; ao terminar de novo, volta.

**Cenário AC-REPLAY-09: limite da biblioteca**
**Dado que** a biblioteca tem 100 partidas
**Quando** a 101ª termina
**Então** a mais antiga é descartada e a nova entra.

## 7. Fora do Escopo

- PWA (demanda seguinte, já acordada).
- GIF com animação rica (traço sendo desenhado, destaques); esta entrega é um frame por jogada.
- Continuar partidas inacabadas a partir da biblioteca (a retomada automática atual permanece como está; a biblioteca só guarda partidas terminadas).
- Replay de partida em andamento, compartilhamento por link e replay embutido no p2p.
- Chat, espectador e ranking (backlog distante).

## 8. Notas Técnicas

- Armazenamento: `localStorage["stt.library"]` (array JSON; partidas são pequenas, 100 delas cabem folgado).
- GIF: codificador leve client-side (biblioteca `gifenc`); os frames são desenhados em canvas 2D reproduzindo o visual do tema (linhas, cores e fonte manuscrita), largura alvo 512px, ~2 frames/s.
- Exportação: download de Blob JSON; importação via `<input type="file">` com a validação de RN-REPLAY-03.
- O player reusa o `BoardView` com estados vindos de `replay({config, moves.slice(0, n)})`.
