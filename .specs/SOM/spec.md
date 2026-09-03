# SOM: Som de escrita nas jogadas

## 1. História de Usuário

**Como** jogador, **Quero** ouvir o som da marca sendo escrita a cada jogada, caneta no papel quando estou no tema caderno e giz quando estou na lousa, **Para que** o jogo tenha a mesma sensação tátil de jogar no papel ou no quadro, com a opção de silenciar quando eu quiser.

## 2. Contexto do Problema

O jogo é silencioso. Todo o resto da identidade (traço à mão, papel pautado, lousa de giz) aponta para uma experiência física, e o som é a peça que falta para completar. O som também dá retorno imediato quando o adversário joga do outro lado da rede ou quando o bot responde, sem exigir que o jogador esteja olhando fixamente para o tabuleiro.

## 3. Dependências

- Spec [[STT]] (temas caderno e lousa, modos de jogo), já entregue.
- Spec [[REPLAY]] (reprodução automática do replay), já entregue.

## 4. Requisitos

- **REQ-SOM-01:** O sistema **deve** tocar um som curto de escrita a cada marca colocada no tabuleiro.
- **REQ-SOM-02:** O som **deve** distinguir as duas marcas: X soa como dois riscos rápidos em sequência, e O soa como um único traço contínuo levemente mais longo.
- **REQ-SOM-03:** O timbre **deve** seguir o tema em uso: caneta ou lápis sobre papel no tema caderno, giz sobre lousa no tema escuro.
- **REQ-SOM-04:** O sistema **deve** ter um controle de silenciar sempre visível no cabeçalho, cujo estado persiste entre sessões.
- **REQ-SOM-05:** O som **deve** tocar para qualquer marca que apareça no tabuleiro: jogada própria, do adversário local, do bot e do adversário online.
- **REQ-SOM-06:** Durante a reprodução automática do replay, cada jogada **deve** soar como soou na partida.
- **REQ-SOM-07:** O áudio **deve** respeitar a política dos navegadores, iniciando apenas após a primeira interação do jogador, sem erro no console nem aviso na tela.
- **REQ-SOM-08:** Os textos e rótulos novos seguem o i18n pt/en (REQ-STT-17).
- **REQ-SOM-09:** O risco que corta a linha vencedora (spec [[RISCO]]) **deve** ter som próprio: um traço contínuo, mais longo que o de uma marca, no mesmo timbre do tema.
- **REQ-SOM-10:** O risco do tabuleiro grande **deve** soar mais longo e mais presente que o de um tabuleiro pequeno, porque o traço é maior.

## 5. Regras de Negócio

- **RN-SOM-01:** o padrão é com som ligado, porque o som faz parte da identidade do jogo; silenciar é decisão do jogador e fica guardada com as demais preferências.
- **RN-SOM-02:** só marcas e riscos no tabuleiro produzem som; ações de interface (abrir menus, trocar tema, navegar na biblioteca) permanecem silenciosas, para o som não virar poluição.
- **RN-SOM-08 (revista em 2026-09-03):** o risco entra na fila de som logo depois da marca que fechou a linha, não mais simultâneo a ela: tocar os dois ao mesmo tempo virou uma pilha confusa na prática, ao contrário do que a redação original supunha.
- **RN-SOM-03 (revista em 2026-09-03):** os sons vêm de gravações reais curtas, e não de síntese (motivo na seção 8). Fontes com licença de atribuição são aceitas, desde que o crédito apareça de forma visível no jogo; nenhum arquivo isolado pode passar de ~30 KB, e a pasta inteira de sons deve caber folgada em algumas centenas de KB.
- **RN-SOM-09 (revista em 2026-09-03):** todo clipe de terceiro usado tem a licença conferida e o crédito exibido no jogo (nome do autor e fonte), atendendo a exigência de atribuição. Vivia num rodapé fixo; passou a morar no modal de informações (botão ℹ️ no cabeçalho), junto com a descrição do projeto e o link do repositório, porque um rodapé permanente competia com o tabuleiro pela atenção.
- **RN-SOM-04:** o som nunca atrasa nem bloqueia a jogada; falha de áudio (aparelho sem saída, contexto bloqueado) é ignorada em silêncio e o jogo segue normal.
- **RN-SOM-05:** desfazer uma jogada não toca som de escrita.
- **RN-SOM-06:** silenciar vale para o jogo e para o replay.
- **RN-SOM-07 (revista em 2026-09-03):** jogadas em sequência rápida (o bot respondendo logo após o jogador, réplica imediata online, reprodução automática do replay) não tocam por cima umas das outras: os sons entram numa fila serial e cada um só começa quando o anterior termina. Se a fila acumular atraso demais em relação ao jogo real, a jogada nova é descartada por inteiro (nunca cortada no meio) em vez de empilhar.
- **RN-SOM-10:** a marca de uma jogada e os riscos que ela abre (spec [[RISCO]]) formam um pacote só na fila: ou tocam todos, ou (fila cheia) nenhum toca. Isso evita que uma jogada que fecha um tabuleiro pequeno e vence a partida no mesmo lance perca o risco grande, o som mais importante daquele momento, por causa do limite de atraso.

## 6. Critérios de Aceite

**Cenário AC-SOM-01: som do X e do O**
**Dado que** o som está ligado e o tema é caderno
**Quando** o jogador marca um X e depois um O
**Então** o X soa como dois riscos rápidos e o O como um traço único, um pouco mais longo.

**Cenário AC-SOM-02: timbre segue o tema**
**Dado que** o jogador está no tema caderno
**Quando** ele alterna para o tema lousa e faz uma jogada
**Então** o som passa de caneta sobre papel para giz sobre lousa, sem recarregar a página.

**Cenário AC-SOM-03: jogadas do adversário soam**
**Dado que** uma partida contra o bot ou online está em andamento
**Quando** o adversário joga
**Então** a marca dele também soa, com o timbre do tema local.

**Cenário AC-SOM-04: silenciar e persistir**
**Dado que** o som está ligado
**Quando** o jogador silencia e recarrega a página
**Então** o jogo continua silencioso, e o controle mostra o estado de silenciado.

**Cenário AC-SOM-05: replay soa**
**Dado que** o som está ligado e um replay está aberto
**Quando** o jogador aciona a reprodução automática
**Então** cada jogada soa conforme a marca, e silenciar interrompe imediatamente.

**Cenário AC-SOM-06: primeira interação**
**Dado que** o jogador acabou de abrir o site
**Quando** ele faz a primeira jogada da sessão
**Então** o som toca normalmente, sem erro no console e sem pedir permissão.

**Cenário AC-SOM-09: risco de vitória soa**
**Dado que** o som está ligado
**Quando** uma jogada fecha a linha de um tabuleiro pequeno e o risco é traçado
**Então** ouve-se a marca e, em seguida imediata, um traço contínuo mais longo, no timbre do tema.

**Cenário AC-SOM-10: risco do tabuleiro grande é maior**
**Dado que** a partida termina com linha no tabuleiro grande
**Quando** o risco grande é traçado
**Então** o som é perceptivelmente mais longo que o do risco de um tabuleiro pequeno.

**Cenário AC-SOM-07: desfazer é silencioso**
**Dado que** existe uma jogada no tabuleiro
**Quando** o jogador desfaz
**Então** nenhum som de escrita é emitido.

**Cenário AC-SOM-08: sequência rápida não estoura (revisto em 2026-09-03)**
**Dado que** um replay de 40 jogadas está em reprodução automática
**Quando** as jogadas se sucedem
**Então** cada som toca só depois que o anterior termina, em fila, sem sobrepor nem distorcer.

**Cenário AC-SOM-11: bot rápido não atropela a jogada do jogador**
**Dado que** o jogador acabou de marcar (som ainda tocando)
**Quando** o bot responde poucos milissegundos depois
**Então** o som do bot espera o som do jogador terminar antes de começar.

**Cenário AC-SOM-12: fechar um tabuleiro e vencer no mesmo lance não corta o risco**
**Dado que** uma jogada fecha um tabuleiro pequeno e vence a partida ao mesmo tempo
**Quando** os sons dessa jogada tocam
**Então** marca, risco pequeno e risco grande tocam todos, em sequência, nenhum cortado.

**Cenário AC-SOM-13: pausa perceptível entre sons (revisão de 2026-09-03)**
**Dado que** uma jogada termina e outra começa logo em seguida (por exemplo o bot respondendo)
**Quando** os dois sons tocam
**Então** há uma pausa clara entre eles (150ms ou mais), não uma sequência colada.

**Cenário AC-SOM-14: créditos acessíveis pelo modal de informações (revisão de 2026-09-03)**
**Dado que** o jogador clica no ícone de informações (ℹ️) no cabeçalho
**Quando** o modal abre
**Então** aparecem a descrição do jogo, o link do repositório e os créditos de som, com um jeito de fechar (tecla Esc, clique fora do modal ou botão).

## 7. Fora do Escopo

- Sons de comemoração de vitória, derrota, empate, entrada na sala e mensagens: esta demanda cobre a marca sendo escrita e o risco da linha vencedora, nada além disso.
- Controle de volume, equalização e escolha de timbre independente do tema.
- Amostras longas ou várias variações por evento (um clipe fixo por marca/tema/escala é suficiente; variação de altura e volume fica por conta de código, não de gravar alternativas).
- Vibração no celular e trilha sonora de fundo.
- Som no GIF exportado (formato não suporta áudio).

## 8. Notas Técnicas

### Por que gravação, e não síntese (decisão de 2026-09-03)

Três rodadas de síntese via Web Audio (ruído filtrado com envelope, trem de grãos com ressonância de material, variações de ataque e banda) foram tentadas e nenhuma convenceu ao ouvido: a primeira soou como peça de xadrez batendo, a segunda como explosão, a terceira ficou correta no formato de amplitude mas ainda não convincente como giz nem lápis. Uma pesquisa ampla (repositórios de jogos, bibliotecas de áudio procedural, fóruns de sound design, literatura acadêmica) confirmou que **nenhum projeto encontrado sintetiza esse som**: todos usam gravação. O guincho do giz em quadro-negro é inclusive tema de artigo científico sério (fenômeno *stick-slip*, Patitsas, "Squeal vibrations, glass sounds, and the stick-slip effect"), modelagem física de verdade, não um preset de sintetizador. A decisão, tomada com o usuário, foi trocar síntese por clipes curtos gravados.

### Fontes e licenciamento

Os clipes vêm de duas gravações de domínio livre do SoundBible, baixáveis sem login:

- **Lápis (tema caderno):** "Fast Drawing" de Daniel Simion, esboço/escrita real a lápis. Licença Attribution 3.0.
- **Giz (tema lousa):** "Scratching" de Lisa Redfern, material abrasivo raspando em superfície dura. Licença Attribution. É uma aproximação honesta, não uma gravação de giz-em-quadro-negro confirmada: as fontes mais específicas de chalk-on-blackboard encontradas (Freesound) exigem login para baixar mesmo sendo CC0, e não houve acesso a elas nesta implementação. Se uma fonte melhor aparecer, é só trocar o arquivo mantendo o mesmo contrato de nomes.

Como as duas exigem atribuição, o modal de informações do jogo cita os dois autores e a fonte (RN-SOM-09). Nenhuma licença aqui permite remover a atribuição.

### Como os clipes foram extraídos (revisão de 2026-09-03: um clipe só por tema)

A primeira extração cortou 5 trechos por tema (duas pernas do X, um O, dois riscos), cada um de uma janela diferente da gravação original. O usuário rejeitou o resultado inteiro: soava como raspar sem parar de um lado pro outro, muito barulhento. A causa era estrutural, não de escolha de trecho: as duas gravações são, do início ao fim, rabisco contínuo ou raspagem repetida, então **qualquer** janela cortada carregava esse caráter de vaivém, porque nunca existiu um toque isolado dentro delas.

A correção foi isolar o **menor toque distinto** de cada gravação (um só, não cinco) e construir todos os eventos variando a velocidade de reprodução desse único toque, em vez de cortar clipes diferentes para cada evento:

- `public/sounds/pencil.mp3`: 0,132 s, de "Fast Drawing" (0,428 s a 0,560 s).
- `public/sounds/chalk.mp3`: 0,215 s, de "Scratching" (0,871 s a 1,086 s).

Corte com `ffmpeg` (`atrim` + `asetpts`, o mesmo cuidado de sempre com timestamp absoluto ao aplicar fade num trecho recortado), fade de poucos milissegundos e volume reduzido (`volume=0.4`), porque o pedido era som suave, não só curto. Os dois arquivos somados pesam menos de 11 KB, contra 108 KB da tentativa anterior.

### Reprodução: um toque, esticado por evento

- Os dois clipes ficam em `public/sounds/` e são carregados por `fetch` + `decodeAudioData`, em cache por `AudioBuffer`, na primeira vez que cada um é necessário.
- A URL usa `import.meta.env.BASE_URL`, porque o site é publicado numa subpasta do GitHub Pages; um caminho absoluto fixo quebraria em produção.
- Cada evento (X, O, risco pequeno, risco grande) é o **mesmo** clipe tocado numa velocidade diferente (`playbackRate`), com jitter aleatório pra jogadas seguidas não soarem idênticas: mais rápido e agudo pro toque curto do X (~0,90 a 1,04), um pouco mais devagar pro O (~0,76 a 0,88), bem mais devagar pro risco pequeno (~0,50 a 0,60) e mais devagar ainda pro risco grande (~0,34 a 0,42), como um gesto maior. A duração efetiva de cada evento é a duração do clipe dividida pela taxa, e é essa duração que a fila de som (abaixo) usa pra reservar vaga.
- X: as duas pernas tocam com uma pausa real entre elas (~0,14 s depois que a primeira termina), reproduzindo o gesto de tirar o giz ou o lápis da superfície entre os dois traços.
- O `AudioContext` é criado sob demanda, no primeiro gesto do jogador (REQ-SOM-07), e reaproveitado; falha de rede ou de decodificação em qualquer clipe é ignorada em silêncio (RN-SOM-04), nunca trava a jogada.
- A preferência de silenciar entra no mesmo objeto de preferências já persistido (`stt.prefs`).
- Verificação automatizada: a decisão de quando tocar (marca colocada, silenciado, desfazer) segue coberta por testes unitários numa camada pura; os testes de interface conferem que os clipes carregam sem erro de rede/decodificação nos dois temas, que desfazer não dispara pedido novo, e que a fila de som (abaixo) não sobrepõe nem corta jogadas, já contando a duração esticada por `playbackRate`. O timbre em si é avaliado por escuta, no guia de validação.
- A comparação que levou a essa escolha foi feita numa página só pra isso (protótipo descartável, não faz parte do jogo), com seis candidatos numa primeira rodada (todos rejeitados) e quatro numa segunda rodada (sintetizado versus micro-gravação, por tema); o usuário escolheu a micro-gravação nos dois casos.

### Fila de som (revisão de 2026-09-03: sons se atropelavam)

A validação mostrou o problema na prática: o bot responde rápido demais pro som da jogada humana terminar, e o risco tocava em cima da marca que fechou a linha (era assim que RN-SOM-08 pedia originalmente). O resultado era uma pilha confusa de sons.

A correção foi uma fila serial dentro de `src/audio/sound.ts` (`playMoveSounds`, a única função pública agora, substituindo `playMark`/`playStrike` separados):

- Um cursor (`queueFreeAt`, em tempo do `AudioContext`) marca a próxima vaga livre. Cada som reserva sua vaga avançando esse cursor pela **duração efetiva do evento** (duração do clipe dividida pela `playbackRate` daquele evento, calculada na hora, sem depender do carregamento): a reserva é síncrona, não espera o `fetch`/`decodeAudioData` terminar, então a ordem de início nunca depende de qual arquivo carrega primeiro.
- Marca e riscos de **uma mesma jogada** são reservados juntos, na mesma chamada síncrona (`playMoveSounds`), então nunca ficam sujeitos ao corte de atraso um no meio do outro: RN-SOM-10.
- Se, no início de uma jogada nova, a fila já estiver mais de `MAX_BACKLOG_S` atrasada em relação ao tempo real, a jogada inteira é pulada, silenciosamente, em vez de empilhar (RN-SOM-04, RN-SOM-07). Esse é o único ponto de descarte: uma vez que uma jogada começa a tocar, ela toca inteira.
- As duas pernas do X usam a mesma fila, com uma pausa adicional (`extraGap`) entre elas maior que a folga mínima entre sons distintos.

**Revisão de 2026-09-03 (segunda validação): a folga era curta demais pro ouvido.** Verificado numa jogada real contra o bot, capturando o horário de cada `.start()`: a fila já não deixava nenhum som começar antes do anterior terminar (sem sobreposição de fato), mas a folga entre eles (`MIN_GAP_S`) era de 0,035s, que o ouvido não registra como pausa, então o efeito percebido continuava sendo de atropelo. `MIN_GAP_S` subiu de 0,035s pra 0,15s (150ms, uma pausa clara sem parecer travado), e `MAX_BACKLOG_S` subiu proporcionalmente de 1,1s pra 2,0s, senão um único risco pequeno já deixaria a fila perto do limite antigo e derrubaria a próxima jogada com mais frequência. A pausa entre as pernas do X (`extraGap`) foi recalculada pra continuar maior que a folga genérica nova (~0,2s no total, já contando o `MIN_GAP_S` que a reserva do primeiro toque sempre adiciona).
