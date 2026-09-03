# Guia de Validação: REPLAY (biblioteca, replay navegável e GIF)

## 1. O que foi entregue

Toda partida terminada (local, bot ou online) agora é salva numa biblioteca local, de onde se abre um replay navegável jogada a jogada (com reprodução automática), exporta-se a partida como arquivo JSON, importa-se arquivo de outra pessoa e baixa-se um GIF leve da partida no visual do tema em uso. O fim de partida ganhou atalhos "Ver replay" e "Baixar GIF".

## 2. Referência da demanda

Spec `REPLAY` (`.specs/REPLAY/spec.md`). Códigos entregues: REQ-REPLAY-01..08; RN-REPLAY-01..05; AC-REPLAY-01..09.

## 3. Pré-requisitos

- `npm install` (nova dependência: `gifenc`)
- Nada mais: sem servidor, sem dado externo

## 4. Como executar

```
npm run dev
```

Abrir http://localhost:5173. O botão "Biblioteca" fica no topo da tela.

## 5. Cenários a validar

### 5.1 Salvamento automático (AC-REPLAY-01)

Passos: jogar uma partida local (Ana x Bia) até o fim (a sequência do guia da STT, cenário 5.3, serve); abrir "Biblioteca".
Esperado: a partida no topo da lista com data/hora, "Ana vs Bia" e o resultado.

### 5.2 Replay navegável (AC-REPLAY-02)

Passos: no fim da partida, clicar "Ver replay"; usar os botões ⏮ ◀ ▶▶ ⏭.
Esperado: o contador "jogada N / M" acompanha, e o tabuleiro mostra exatamente o estado após cada jogada (a última tem contorno tracejado).

### 5.3 Replay com variante de limpeza (AC-REPLAY-03)

Passos: jogar uma partida com a variante ligada até alguém conquistar um tabuleiro; terminar a partida; no replay, passar pela jogada da conquista.
Esperado: no frame seguinte à conquista, os tabuleiros abertos aparecem limpos, como aconteceu na partida.

### 5.4 Reprodução automática (AC-REPLAY-04)

Passos: no replay, voltar ao início (⏮) e clicar ▶.
Esperado: as jogadas avançam sozinhas (~1 por segundo) até o fim; ⏸ pausa a qualquer momento.

### 5.5 Exportar e importar (AC-REPLAY-05)

Passos: na biblioteca, "Exportar" numa partida (baixa um .json); "Excluir" a partida; "Importar partida" com o arquivo baixado.
Esperado: o replay abre idêntico e a partida volta pra biblioteca. O arquivo tem nome como `super-tictactoe-2026-09-02-Ana-vs-Bia.json`.

### 5.6 GIF da partida (AC-REPLAY-07)

Passos: no fim de partida (ou no replay), clicar "Baixar GIF"; abrir o arquivo.
Esperado: um GIF (~alguns KB a poucos MB) mostrando o tabuleiro após cada jogada, com pausa maior no quadro final, nas cores do tema em uso (repetir no tema lousa e conferir o visual escuro).

### 5.7 Partida online também salva

Passos: terminar uma partida online (dois navegadores) e abrir a biblioteca em cada um.
Esperado: a partida aparece na biblioteca dos dois lados, com os nomes corretos.

## 6. Cenários de borda e erro

### 6.1 Desfazer o fim (AC-REPLAY-08)

Passos: terminar a partida, conferir que entrou na biblioteca, clicar "Desfazer", conferir a biblioteca de novo; refazer a jogada final.
Esperado: a entrada some com o desfazer e volta com o novo fim (sem duplicar).

### 6.2 Importação inválida (AC-REPLAY-06)

Passos: importar um arquivo de texto qualquer, e um export adulterado (trocar uma jogada por `[9,9]` no editor).
Esperado: "Arquivo inválido..." nos dois casos; nada é salvo, nada quebra.

### 6.3 Limite da biblioteca (AC-REPLAY-09)

Cobertura: teste unitário (`tests/replay/replay.test.ts`) verifica que a 101ª partida descarta a mais antiga. Validação manual é impraticável (101 partidas).

### 6.4 Replay é somente leitura (RN-REPLAY-05)

Passos: abrir um replay, navegar, voltar; conferir placar e partida em andamento.
Esperado: nada mudou; clicar em células do replay não faz nada.

## 7. Fora do escopo (NÃO testar)

- PWA (próxima demanda)
- GIF com animação rica (traço sendo desenhado)
- Continuar partidas inacabadas a partir da biblioteca
- Replay de partida em andamento, link compartilhável, chat/espectador/ranking

## 8. Como reverter

Sem efeito colateral: reverter os commits. Dados locais de teste saem com "Limpar dados do site" (chave nova: `stt.library`).
