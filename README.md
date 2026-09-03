# Super TicTacToe

Jogo da velha em tabuleiros aninhados, jogável no navegador: nove tabuleiros pequenos dentro de um grande, onde cada jogada manda o adversário pro tabuleiro correspondente à célula jogada.

**Jogue agora: <https://brennokm.github.io/Super-TicTacToe/>**

## Modos de jogo

- **Dois jogadores (local):** alternando no mesmo dispositivo
- **Contra o bot:** três dificuldades (fácil, médio e difícil com busca minimax)
- **Multiplayer via web:** partidas p2p por código de sala (WebRTC), sem servidor próprio, com reconexão automática após queda de conexão

## Regras

Regras clássicas do Super TicTacToe, com opções configuráveis por partida:

- **Jogada direcionada:** a posição da célula jogada define o tabuleiro onde o adversário joga em seguida; se o destino já estiver decidido, a jogada é livre
- **Vitória:** linha de três tabuleiros pequenos conquistados no tabuleiro grande
- **Variante de limpeza** (opcional): conquistar um tabuleiro apaga as jogadas dos tabuleiros ainda em aberto
- **Desempate configurável:** maioria de tabuleiros vence (padrão), empatado não conta pra ninguém, ou empatado conta pros dois
- **Início configurável:** símbolo de cada jogador e quem começa

Também tem desfazer (com consentimento do adversário no online), revanche com iniciante alternado, placar da sessão, histórico de jogadas, interface em português e inglês, e dois temas: caderno (claro) e lousa (escuro).

## Rodando localmente

Requisitos: Node.js 22+.

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

## Testes

```bash
npm test           # unitários (Vitest): motor de regras, bot e protocolo p2p
npm run test:ui    # interface (Playwright); antes: npx playwright install chromium
npm run typecheck  # TypeScript
```

## Arquitetura

- `src/engine/`: motor de regras em TypeScript puro, recursivo (suporta profundidade N; a UI expõe o clássico de 2 níveis). Não depende de React nem de nada de UI.
- `src/bot/`: os três níveis do bot, consumindo só a API pública do motor
- `src/p2p/`: multiplayer online em três camadas: protocolo (mensagens e validação), sessão (agnóstica de transporte) e transportes (PeerJS em produção, BroadcastChannel nos testes)
- `src/ui/`: componentes React e temas CSS
- `src/i18n/` e `src/storage/`: textos pt/en e persistência em localStorage
- `tests/engine/`, `tests/p2p/`, `tests/e2e/`: unitários e ponta a ponta

O estado de uma partida é sempre redutível a `{configuração, jogadas}` e reconstruído por replay determinístico do motor. É isso que torna baratos o desfazer, a retomada após fechar o navegador e a reconexão p2p (os dois lados trocam históricos e o mais longo válido prevalece).

## Deploy

GitHub Actions roda typecheck, unitários e testes de interface em todo push; na `main`, com tudo verde, publica o build no GitHub Pages. Teste falhando bloqueia a publicação.

## Processo

O desenvolvimento segue a [Promptaria](https://github.com/BrennoKM/Promptaria): specs com códigos rastreáveis (REQ, RN, AC), implementação com rastreabilidade código a código e Guias de Validação e de Contexto Técnico a cada entrega.
