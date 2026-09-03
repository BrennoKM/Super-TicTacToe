# Guia de Validação: RISCO, REPLAY2 e SOM

## 1. O que foi entregue

Três acabamentos ligados entre si: o risco clássico cortando a linha vencedora (no tabuleiro pequeno e no grande), o GIF passando a ter a mesma cara do jogo (papel pautado ou lousa, traço à mão, letra manuscrita e os riscos) com controles de replay redesenhados, e som de escrita sintetizado a cada marca e a cada risco, com caneta no tema caderno e giz no tema lousa, além de um botão de silenciar.

## 2. Referência da demanda

Specs `RISCO`, `REPLAY2` e `SOM` (em `.specs/`). Códigos entregues: REQ-RISCO-01..08, RN-RISCO-01..06, AC-RISCO-01..09; REQ-REPLAY2-01..07, RN-REPLAY2-01..04, AC-REPLAY2-01..08; REQ-SOM-01..10, RN-SOM-01..08, AC-SOM-01..10.

## 3. Pré-requisitos

- `npm install` (sem dependências novas)
- Aparelho com som para os cenários de áudio; fone ajuda a ouvir o timbre

## 4. Como executar

```
npm run dev
```

Abrir http://localhost:5173, ou o site publicado após o deploy.

## 5. Cenários a validar

### 5.1 Risco no tabuleiro pequeno (AC-RISCO-01)

Passos: iniciar partida local e jogar até X fechar uma linha num tabuleiro pequeno (sequência do guia da STT serve).
Esperado: um traço na cor de X corta as três casas, desenhado de ponta a ponta, extrapolando um pouco as bordas; os três X continuam visíveis sob o risco.

### 5.2 Risco no tabuleiro grande (AC-RISCO-02, 03)

Passos: terminar a partida com três tabuleiros conquistados em linha.
Esperado: risco grosso atravessando os três tabuleiros, na cor do vencedor. Repetir com uma vitória na diagonal e conferir que o traço vai de canto a canto.

### 5.3 Desfazer remove o risco (AC-RISCO-06)

Passos: logo após um risco aparecer, clicar "Desfazer".
Esperado: o risco some junto com a marca; refazer a jogada traz o risco de volta.

### 5.4 Vitória por maioria não risca (AC-RISCO-05)

Passos: jogar com desempate "maioria de tabuleiros vence" até o tabuleiro grande encher sem linha.
Esperado: vencedor anunciado, sem risco grande (não existe linha para riscar).

### 5.5 GIF com a cara do jogo (AC-REPLAY2-01, 02, 05)

Passos: terminar uma partida, clicar "Baixar GIF" e abrir o arquivo; repetir no tema lousa.
Esperado: fundo de papel pautado (claro) ou lousa (escuro), linhas tortas de traço à mão, marcas em letra manuscrita, tabuleiros conquistados com a marca grande esmaecida e o risco por cima. O visual deve ser reconhecível como o mesmo jogo da tela.

### 5.6 Tabuleiro estável no GIF (AC-REPLAY2-03)

Passos: reproduzir o GIF gerado.
Esperado: as linhas do tabuleiro ficam paradas quadro a quadro; só as marcas e os riscos aparecem.

### 5.7 Controles do replay (AC-REPLAY2-07, 08)

Passos: abrir "Ver replay" e observar a barra de controles.
Esperado: reproduzir/pausar é um botão redondo destacado no centro, separado dos grupos de passo a passo (início e anterior à esquerda, próxima e fim à direita). Acionar "próxima" anda uma jogada e não inicia a reprodução.

### 5.8 Som do X e do O (AC-SOM-01)

Passos: com som ligado no tema caderno, marcar um X e depois um O.
Esperado: X soa como dois riscos rápidos em sequência; O soa como um traço único, um pouco mais longo. O timbre lembra caneta ou lápis no papel.

### 5.9 Timbre segue o tema (AC-SOM-02)

Passos: trocar para o tema lousa e jogar de novo.
Esperado: o som passa a lembrar giz no quadro, mais áspero e granulado, sem recarregar a página.

### 5.10 Som do risco (AC-SOM-09, 10)

Passos: fechar um tabuleiro pequeno e, depois, terminar a partida com linha no grande.
Esperado: além da marca, ouve-se um traço contínuo mais longo; o risco do tabuleiro grande soa perceptivelmente mais longo que o do pequeno.

### 5.11 Silenciar (AC-SOM-04)

Passos: clicar no botão de som no cabeçalho, jogar, recarregar a página.
Esperado: nenhum som enquanto silenciado, e o estado continua silenciado depois de recarregar.

### 5.12 Som do adversário e do replay (AC-SOM-03, 05)

Passos: jogar contra o bot e, depois, abrir um replay e acionar a reprodução automática.
Esperado: as jogadas do bot soam; no replay, cada jogada soa conforme a marca, e silenciar interrompe na hora.

### 5.13 Peso visual do tabuleiro conquistado (REQ-RISCO-08, 10)

Passos: fechar um tabuleiro pequeno e observar; depois terminar a partida e observar o tabuleiro grande. Repetir no celular e no desktop.
Esperado: no tabuleirinho, a marca de quem fechou aparece grande e nítida, com o risco e as jogadas de fundo; no tabuleiro grande, o risco da vitória é o elemento mais forte. A marca de conquista tem o mesmo tamanho relativo nas duas telas.

### 5.14 O som parece risco, não batida (REQ-SOM-01, 02)

Passos: com som ligado, jogar algumas marcas nos dois temas.
Esperado: o som lembra arrastar caneta ou giz, com atrito, e não um estalo seco ou peça batendo na mesa. Se ainda soar percussivo, os parâmetros a ajustar são o tempo de ataque, a duração e a intensidade do granulado.

## 6. Cenários de borda e erro

### 6.1 Primeira interação (AC-SOM-06)

Passos: abrir o site e fazer a primeira jogada da sessão com o console aberto.
Esperado: som normal, sem erro de áudio no console e sem pedido de permissão.

### 6.2 Desfazer é silencioso (AC-SOM-07)

Passos: clicar "Desfazer" com som ligado.
Esperado: nenhum som de escrita.

### 6.3 Sequência rápida (AC-SOM-08)

Passos: reproduzir automaticamente um replay longo.
Esperado: volume estável, sem estouro nem distorção quando as jogadas se sucedem.

### 6.4 Peso e tempo do GIF (AC-REPLAY2-06)

Passos: baixar o GIF de uma partida longa no celular.
Esperado: enquanto gera, o botão mostra "Gerando GIF..." e fica desabilitado; o arquivo sai em poucos segundos e com poucos MB.

### 6.5 Replay de partida antiga (AC-RISCO-08)

Passos: abrir o replay de uma partida salva antes desta entrega.
Esperado: o risco aparece normalmente, porque é derivado do estado.

## 7. Fora do escopo (NÃO testar)

- Profundidade 3 na interface, chat, espectador, ranking e estatísticas
- PWA e jogo offline (spec OFFLINE, ainda não implementada)
- Sons de comemoração, controle de volume e amostras gravadas
- Animação do traço sendo desenhado dentro do GIF

## 8. Como reverter

Sem efeito colateral: reverter os commits. A única preferência nova é `muted` dentro de `stt.prefs`, ignorada por versões antigas.

### 5.15 Créditos das gravações visíveis (RN-SOM-09)

Passos: abrir o rodapé da página (rolar até o fim).
Esperado: uma linha citando os autores e a fonte das gravações de som (soundbible.com), no idioma em uso.

### 5.16 Timbre real, não mais sintetizado (revisão de 2026-09-03)

Passos: repetir os cenários 5.8 a 5.10 (som do X e do O, timbre por tema, som do risco).
Esperado: o som agora vem de gravação real (lápis genuíno no tema caderno; raspagem abrasiva como aproximação de giz no tema lousa), não mais de síntese; a diferença de caráter entre os dois temas deve ser bem mais clara que nas versões anteriores.

### 5.17 Bot não atropela seu som (AC-SOM-11)

Passos: jogar contra o bot no nível fácil, marcar uma célula.
Esperado: o som do bot só começa depois que o seu terminou; nunca soam por cima um do outro.

### 5.18 Vitória com risco duplo não corta (AC-SOM-12)

Passos: jogar até que a mesma jogada final feche um tabuleiro pequeno e vença a partida.
Esperado: ouvem-se a marca, o risco pequeno e o risco grande, em sequência, sem nenhum cortado.

### 5.19 O som ficou suave, um toque só (revisão de 2026-09-03)

Passos: repetir os cenários 5.8 a 5.10 (som do X e do O, timbre por tema, som do risco), com atenção especial ao volume e ao caráter.
Esperado: um único toque suave e baixo por jogada, nunca a sensação de raspar repetidamente de um lado pro outro. O risco soa como o mesmo toque, só mais lento e mais grave (maior peso pro tabuleiro grande).

### 5.20 Folga perceptível entre sons (revisão de 2026-09-03, segunda validação)

Passos: jogar contra o bot; fechar um tabuleiro pequeno.
Esperado: uma pausa clara entre a sua jogada e a do bot, e entre a marca e o risco, não mais uma sequência colada.

### 5.21 Créditos pelo modal de informações

Passos: clicar no ícone ℹ️ no cabeçalho.
Esperado: modal com descrição do jogo, link do repositório no GitHub e créditos de som; fecha com Esc, clicando fora, ou pelo botão "Fechar".
