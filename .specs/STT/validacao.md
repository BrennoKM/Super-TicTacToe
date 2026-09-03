# Guia de Validação: STT etapas E1 + E2 + E3 (motor, local, bot e online)

## 1. O que foi entregue

O jogo Super TicTacToe completo no navegador: modo local (dois jogadores no mesmo dispositivo), contra o bot em três dificuldades, e multiplayer via web p2p por código de sala (WebRTC + PeerJS, sem servidor próprio), com reconexão após queda. Regras configuráveis (variante de limpeza, três critérios de desempate, símbolo e quem começa), desfazer (com consentimento no online), revanche, placar, histórico, interface em português e inglês, temas caderno (claro) e lousa (escuro), retomada de partida ao reabrir o navegador e CI que publica no GitHub Pages.

## 2. Referência da demanda

Specs `STT` (`.specs/STT/spec.md`, etapas E1..E3) e `P2P` (`.specs/P2P/spec.md`, contrato do protocolo). Códigos entregues: REQ-STT-01..17 completos; RN-STT-01..08; AC-STT-01..14; CL-P2P-01..08 e GAR-P2P-01..08 do contrato.

## 3. Pré-requisitos

- Node.js 22+ e npm instalados
- `npm install` na raiz do projeto (primeira vez)
- Nenhum dado, variável de ambiente ou serviço externo é necessário

## 4. Como executar

```
npm run dev
```

Abrir http://localhost:5173 no navegador.

## 5. Cenários a validar

### 5.1 Jogada direcionada e destaque (AC-STT-01, REQ-STT-12)

Passos:
1. Na tela inicial, preencher Jogador 1 = "Ana", Jogador 2 = "Bia" e clicar em "Começar"
2. Clicar na célula superior esquerda do tabuleiro central

Resultado esperado:
- O X aparece na célula clicada
- Apenas o tabuleiro do canto superior esquerdo fica destacado, tingido e com tracejado na cor de quem está na vez (a cor de O)
- O status mostra "Vez de Bia (O)"

### 5.2 Destino decidido libera escolha (AC-STT-03)

Passos:
1. Iniciar partida e jogar até algum tabuleiro pequeno ser conquistado (ex: X nas células 7, 8 e 9 do tabuleiro 1, veja a sequência do cenário 5.3)
2. Fazer o adversário jogar numa célula que aponte pro tabuleiro conquistado

Resultado esperado:
- Todos os tabuleiros ainda abertos ficam destacados como jogáveis; o conquistado não

### 5.3 Vitória, placar e revanche (AC-STT-04, REQ-STT-08, 09)

Passos:
1. Iniciar partida com Ana (X) e Bia (O), X começa
2. Reproduzir a sequência (tabuleiro/célula, numerados de 1 a 9 da esquerda pra direita, de cima pra baixo): X 1/7, O 7/1, X 1/8, O 8/1, X 1/9, O 9/2, X 2/7, O 7/2, X 2/8, O 8/2, X 2/9, O 9/3, X 3/7, O 7/3, X 3/8, O 8/3, X 3/9

Resultado esperado:
- Ao fim: "Ana (X) venceu!" no status
- Placar mostra "Ana (X): 1"
- Botão "Revanche" aparece; ao clicar, o tabuleiro limpa, o placar permanece e agora Bia começa

### 5.4 Critério de desempate "maioria vence" (AC-STT-05)

Passos:
1. Na configuração, manter desempate "maioria de tabuleiros vence"
2. Jogar até encher o tabuleiro grande sem linha de 3 (partida longa; alternativa: validar pelo teste unitário `variants.test.ts`, que cobre os três critérios)

Resultado esperado:
- Vence quem tiver conquistado mais tabuleiros pequenos; empate real se a contagem igualar

### 5.5 Variante de limpeza (AC-STT-06)

Passos:
1. Na configuração, marcar "Variante de limpeza" e começar
2. Reproduzir as 5 primeiras jogadas do cenário 5.3 (X conquista o tabuleiro 1)

Resultado esperado:
- Ao X conquistar o tabuleiro 1, as marcas de O nos tabuleiros 7 e 8 desaparecem
- O tabuleiro 1 conquistado permanece com as marcas de X

### 5.6 Desfazer (REQ-STT-07)

Passos:
1. Iniciar partida e fazer uma jogada com X
2. Clicar em "Desfazer"

Resultado esperado:
- A jogada some e a vez volta pro X

### 5.7 Retomada de partida (AC-STT-10, REQ-STT-14)

Passos:
1. Iniciar partida, fazer 2 jogadas e fechar a aba
2. Reabrir http://localhost:5173

Resultado esperado:
- Diálogo "Partida em andamento encontrada" com "Retomar" e "Descartar"
- "Retomar" devolve o tabuleiro exato, com histórico e placar preservados

### 5.8 Idioma (AC-STT-14, REQ-STT-17)

Passos:
1. No seletor "PT/EN" do topo, escolher EN
2. Recarregar a página

Resultado esperado:
- Todos os textos mudam pra inglês na hora e a escolha persiste após recarregar

### 5.9 Temas e celular (AC-STT-13, REQ-STT-11)

Passos:
1. Acionar o toggle de tema (☀️/🌙) no topo
2. Abrir o site num celular (ou DevTools, viewport 375px) e iniciar uma partida

Resultado esperado:
- Toggle desligado: caderno (papel pautado, traço de caneta); ligado: lousa (fundo escuro, traço de giz); a escolha persiste
- O tabuleiro é uma grade única desenhada à mão: linhas grossas do jogo grande, finas nos pequenos
- No celular: sem rolagem horizontal, tabuleiro inteiro visível e células tocáveis sem zoom

### 5.10 Bot responde e respeita as regras (AC-STT-07, REQ-STT-05)

Passos:
1. Na configuração, Modo = "Contra o bot", Dificuldade = "fácil", Jogador 1 = "Ana", começar
2. Fazer uma jogada qualquer

Resultado esperado:
- O bot responde sozinho em menos de 1 segundo, sempre numa célula permitida
- O histórico mostra a jogada humana e a do bot; o status volta pra "Vez de Ana"

### 5.11 Desfazer contra o bot desfaz o par (AC-STT-08)

Passos:
1. Em partida contra o bot, fazer uma jogada e aguardar a resposta
2. Clicar em "Desfazer"

Resultado esperado:
- As duas jogadas (do bot e a sua) somem e a vez volta pra você

### 5.12 Níveis de dificuldade (REQ-STT-05)

Passos:
1. Jogar uma partida no fácil e outra no difícil

Resultado esperado:
- Fácil: joga espalhado, sem estratégia perceptível
- Difícil: bloqueia suas ameaças de conquista e monta linhas; ganhar dele exige esforço real
- Em qualquer nível a resposta permanece fluida (difícil pode levar até ~1 segundo no início da partida)

### 5.13 Retomada de partida contra o bot (REQ-STT-14)

Passos:
1. Em partida contra o bot, fazer 1 jogada, aguardar a resposta e fechar a aba
2. Reabrir e clicar em "Retomar"

Resultado esperado:
- Partida volta no ponto exato, o placar mostra "Bot (fácil)" como adversário e o bot continua respondendo

### 5.14 Sala p2p: criar, compartilhar e jogar (AC-STT-12)

Pré-requisito: dois navegadores (ou dois dispositivos; pra teste rápido, uma janela normal e uma anônima).

Passos:
1. Navegador A: Modo = "Multiplayer via web", "Criar sala", nome "Ana", começar; anotar o código de 6 caracteres exibido
2. Navegador B: Modo = "Multiplayer via web", "Entrar numa sala", nome "Bia", digitar o código, começar

Resultado esperado:
- Conexão estabelecida; os dois veem o tabuleiro com "Ana (você)" de um lado e "Bia (você)" do outro
- Jogada feita em A aparece em B em menos de 1 segundo e o turno alterna
- Clique fora da própria vez é ignorado

### 5.15 Desfazer online exige consentimento (AC-STT-09)

Passos:
1. Em partida online, A faz uma jogada e clica "Desfazer"
2. Em B, aparece o pedido; clicar "Recusar"
3. A pede de novo; B clica "Aceitar"

Resultado esperado:
- Na recusa: nada muda e A vê "Pedido de desfazer recusado"
- No aceite: a jogada some nos dois lados e a vez volta

### 5.16 Reconexão (AC-STT-11, REQ-STT-15)

Passos:
1. Em partida online com 2+ jogadas, fechar (ou recarregar) a página de B
2. Reabrir; aparece "Partida online em andamento" com o código; clicar "Retomar"

Resultado esperado:
- B volta pro ponto exato da partida (mesmas jogadas, mesma vez) e o jogo continua
- Se a conexão cair no meio (ex: desligar o wi-fi), quem ficou vê "Conexão perdida. Aguardando reconexão..." com opções "Reconectar" e "Encerrar partida"

### 5.17 Revanche online

Passos: terminar uma partida online; A clica "Revanche"; B aceita no diálogo.
Esperado: novo tabuleiro nos dois lados, placar preservado, iniciante alternado.

## 6. Cenários de borda e erro

### 6.1 Jogada inválida (AC-STT-02)

Passos: após uma jogada que direciona pro tabuleiro 1, tentar clicar numa célula de outro tabuleiro e numa célula já ocupada.
Esperado: nada acontece (células fora do permitido ficam desabilitadas), a vez não muda.

### 6.2 Fim de partida

Passos: após a vitória do cenário 5.3, tentar clicar em qualquer célula.
Esperado: nenhuma jogada é aceita; só "Desfazer", "Revanche" e "Mudar configuração" respondem.

### 6.3 Desfazer após o fim

Passos: após a vitória, clicar em "Desfazer".
Esperado: a última jogada volta, a partida reabre e o ponto sai do placar.

### 6.4 Clicar durante a vez do bot

Passos: em partida contra o bot, tentar clicar numa célula antes de o bot responder.
Esperado: o clique é ignorado; só o bot faz a jogada dele.

### 6.5 Código de sala errado

Passos: tentar entrar com um código inexistente (ex: "ZZZZZZ").
Esperado: "Sala não encontrada" com opção de tentar de novo; código malformado (ex: "ABC") é barrado ainda no formulário.

### 6.6 Adversário sai da sala

Passos: em partida online, B clica "Encerrar partida".
Esperado: A vê "O adversário saiu da sala"; nada trava.

### 6.7 Armazenamento bloqueado

Passos: abrir em janela anônima com bloqueio de dados de site, se disponível.
Esperado: o jogo funciona normalmente, apenas sem persistir preferências.

## 7. Fora do escopo (NÃO testar)

- Profundidade 3 jogável na UI (motor suporta, interface não expõe)
- Contas de usuário, ranking, chat, modo espectador, replay navegável
- Refinamento visual fino dos temas (a direção giz/caderno está aplicada; polimento é demanda futura)

## 8. Como reverter

Sem efeito colateral: site estático sem banco e sem serviço externo. Basta reverter os commits da entrega. Dados locais de teste podem ser limpos com "Limpar dados do site" do navegador (chaves `stt.prefs` e `stt.match` do localStorage).
