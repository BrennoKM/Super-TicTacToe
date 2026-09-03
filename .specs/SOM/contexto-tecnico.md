# Guia de Contexto Técnico: RISCO, REPLAY2 e SOM

## 1. O que foi alterado

O motor ganhou `winningLines`, função pura que devolve as trincas fechadas de um tabuleiro, usada pela tela, pelo replay, pelo GIF e pela decisão de som. A tela desenha o risco como SVG sobreposto à grade. O gerador de GIF foi reescrito para reproduzir o visual do jogo (papel pautado, traço com tremor determinístico, fonte manuscrita carregada antes do desenho, riscos) e virou assíncrono, com aviso durante a geração. Os controles do replay foram reorganizados. Entrou o módulo `src/audio/`, com síntese em Web Audio e uma camada pura que decide quais sons cada jogada produz.

## 2. Referência da demanda

Specs `RISCO`, `REPLAY2` e `SOM`.
Entrega: REQ-RISCO-01..08, RN-RISCO-01..06, AC-RISCO-01..09; REQ-REPLAY2-01..07, RN-REPLAY2-01..04, AC-REPLAY2-01..08; REQ-SOM-01..10, RN-SOM-01..08, AC-SOM-01..10.

## 3. Mudanças de dados

- `stt.prefs` ganha `muted` (booleano, padrão falso). Preferências antigas sem o campo assumem o padrão, sem migração.
- Nada mais muda: o risco é derivado do estado, nunca gravado (RN-RISCO-05), então partidas salvas antes desta entrega também riscam.

## 4. Fluxo de chamadas e integrações

```
jogada aplicada (App#applyPath, OnlineGame#onChange, ReplayScreen autoplay)
  → audio/events#soundsForTransition   [novo] compara antes e depois: marca +
                                        riscos que surgiram (pequenos e grande)
  → audio/sound#playMark / playStrike  [novo] ruído filtrado com envelope;
                                        passa-baixa (caneta) ou passa-banda com
                                        modulação rápida (giz), conforme o tema

desenho do tabuleiro (BoardView)
  → engine#winningLines                [novo] trincas fechadas
  → StrikeLayer (SVG)                  [novo] path por linha, com barriga
                                        determinística e animação de dashoffset

GIF (replay/gif#generateGif)           [alterado] agora assíncrono
  → ensureFonts                        [novo] document.fonts.load antes do 1º quadro
  → drawState                          [alterado] pautado, handLine com jitter de
                                        semente fixa, pesos iguais aos da tela,
                                        drawStrikes nos dois níveis
```

Decisões que valem registro:

- O filtro SVG `#squiggle` não pôde ser reaproveitado no risco: ele é calibrado para pixels de HTML e, num SVG com sistema de coordenadas 3 por 3, deslocaria o traço para fora do tabuleiro. O tremor do risco vem de uma curva quadrática com barriga determinística.
- A semente do tremor do GIF é fixa por partida, então as linhas não vibram entre quadros (REQ-REPLAY2-02).
- O opacity de tabuleiro decidido subiu de 0,16 para 0,3, e o riscado usa 0,62, para as marcas continuarem visíveis sob o risco, como no papel.

## 5. Validações aplicadas

- RN-RISCO-01: `winningLines` devolve vazio quando o vencedor veio de maioria ou o resultado é empate
- RN-RISCO-02: a variante "conta pros dois" usa o mesmo critério de `resultOf`, então o risco atravessa o tabuleiro empatado
- RN-RISCO-03 e 05: risco derivado do estado, some ao desfazer e vale para partidas antigas
- RN-REPLAY2-01: paleta lida das variáveis de CSS no momento da geração
- RN-SOM-04: toda chamada de áudio é protegida; contexto indisponível resulta em silêncio, nunca em erro
- RN-SOM-05: `soundsForTransition` só produz som quando o histórico cresce, então desfazer é silencioso
- REQ-SOM-07: o `AudioContext` é criado sob demanda e retomado, o que só acontece após um gesto do jogador

## 6. Possíveis impactos colaterais

- **`generateGif` virou assíncrona:** quem chamar precisa aguardar. As três chamadas existentes foram ajustadas; código futuro que a use sem `await` baixaria um arquivo vazio.
- **Som na thread principal:** cada jogada cria alguns nós de áudio de vida curta. Em partidas normais é irrelevante; se algum dia houver reprodução muito acelerada, vale reaproveitar os nós.
- **Tremor do GIF depende do número de jogadas** (semente derivada dele), então dois GIFs da mesma partida saem idênticos, e de partidas diferentes saem com tremor diferente. É intencional.
- **Peso do GIF cresceu** com o fundo pautado e o tremor (mais cores e bordas): uma partida de 17 jogadas gerou cerca de 300 KB, ainda bem dentro do teto de 2 MB da RN-REPLAY2-03.
- O botão de silenciar entra no cabeçalho junto com biblioteca, tema e idioma; em telas bem estreitas a barra pode quebrar em duas linhas, o que o layout já suporta.

## 7. Correções após a primeira validação

- **Som soava como peça de xadrez:** a primeira versão usava rajada curta (100 ms) com ataque de poucos milissegundos e modulação por oscilador quadrado a 55 Hz, combinação que produz estalo com altura audível. Foi substituída por envelope em curva com granulado aleatório, ataque gradual, duração maior (200 a 660 ms) e varredura de banda. Medição em `OfflineAudioContext` confirma: duração acima de 20 por cento do pico entre 200 e 660 ms, taxa de cruzamento por zero perto de 4 kHz (ruído, não tom) e envelope com variação de cerca de 0,4 (fricção). O giz mede mais agudo que a caneta, como esperado.
- **Peso visual invertido:** a decisão original deixava o risco como protagonista também no tabuleiro pequeno. A validação mostrou que ali a marca de quem fechou é o que importa, então no tabuleirinho a marca ficou grande e nítida (dimensionada por container query, para não depender da largura da janela) e o risco discreto; no tabuleiro grande o risco continua sendo o elemento mais forte. O GIF acompanha os mesmos pesos.
- **`resetAudio` exportado:** permite descartar o contexto de áudio, tanto para recuperação quanto para medir os sons num contexto offline.

## 9. Revisão de 2026-09-03: gravação real substitui a síntese

Depois de três rodadas de ajuste na síntese (todas registradas no histórico do módulo), pesquisa ampla confirmou que nenhum projeto sintetiza esse som, todos usam gravação, e o fenômeno físico do giz é objeto de artigo científico. `src/audio/sound.ts` foi reescrito: em vez de gerar buffers via Web Audio, ele carrega 10 clipes mp3 curtos de `public/sounds/` (fetch + decodeAudioData, cacheados por AudioBuffer), 5 por tema (duas pernas do X, O, risco pequeno, risco grande). Fontes: "Fast Drawing" (Daniel Simion) para o lápis e "Scratching" (Lisa Redfern) para o giz, ambas do SoundBible, licença de atribuição: por isso o rodapé do jogo agora cita os dois autores (RN-SOM-09). RN-SOM-03 foi revista para permitir gravação licenciada com atribuição, no lugar da proibição original de arquivo de áudio. Detalhes completos (porquê, fontes, extração, limitações conhecidas do proxy de giz) estão na spec SOM, seção 8.

## 10. Revisão de 2026-09-03: fila de som (sons se atropelavam)

`playMark`/`playStrike` viraram uma única função pública, `playMoveSounds`, com fila serial (cursor de tempo avançado pela duração conhecida de cada clipe, reserva síncrona, sem depender do carregamento). Marca e riscos da mesma jogada são reservados juntos e nunca são cortados no meio (RN-SOM-10); jogada nova só é descartada por inteiro se a fila já estiver muito atrasada (RN-SOM-04, 07). RN-SOM-08 mudou de 'risco toca junto da marca' pra 'risco toca logo depois'. Detalhes e a razão da mudança na spec SOM, seção 8.

## 11. Desfecho de 2026-09-03: um clipe só por tema, esticado por evento

A extração original (5 clipes por tema, cada evento de uma janela diferente) foi rejeitada por inteiro: as gravações-fonte são rabisco contínuo ou raspagem repetida do início ao fim, então qualquer janela cortada carregava esse caráter de vaivém, não existia toque isolado nelas. A correção: isolar o menor toque distinto de cada gravação (`public/sounds/pencil.mp3`, 0,132s; `public/sounds/chalk.mp3`, 0,215s, volume reduzido) e construir X, O e os dois riscos variando só a velocidade de reprodução desse toque único (mais rápido pro X, mais devagar e grave pros riscos). `src/audio/sound.ts` ficou mais simples (2 arquivos em vez de 10, ~11KB no total) e a fila de som passou a calcular a duração de reserva como duração do clipe dividida pela taxa de reprodução do evento, não mais uma constante fixa por arquivo. Escolha feita por comparação numa página descartável com o usuário (protótipo fora do jogo), não parte do código do produto. Detalhes na spec SOM, seção 8.

## 12. Segunda revisão de 2026-09-03: folga maior entre sons, créditos num modal

Verificado numa jogada real contra o bot (hook em `AudioBufferSourceNode.prototype.start`): a fila já não deixava sons se sobreporem, mas a folga entre eles (`MIN_GAP_S`) era de 35ms, curta demais pro ouvido registrar como pausa. Subiu pra 150ms, com `MAX_BACKLOG_S` subindo proporcionalmente de 1,1s pra 2,0s (senão um único risco pequeno já deixaria a fila perto do limite antigo). A pausa entre as pernas do X foi recalculada pra continuar maior que a folga genérica.

Os créditos de som saíram do rodapé fixo e foram pro `App.tsx`: um botão ℹ️ no cabeçalho abre um modal (fecha com Esc, clique fora ou botão) com a descrição do projeto, link do repositório no GitHub e os créditos, RN-SOM-09 revista.
