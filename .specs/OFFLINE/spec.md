# OFFLINE: Jogar sem internet nos modos local e bot

## 1. História de Usuário

**Como** jogador, **Quero** abrir o jogo e jogar contra alguém no mesmo aparelho ou contra o bot mesmo sem internet, **Para que** eu possa jogar no metrô, no avião ou com sinal ruim, sem depender de conexão.

## 2. Contexto do Problema

O jogo é um site estático: hoje, sem rede, a página simplesmente não abre, mesmo que nada além do multiplayer online precise de internet. O motor, o bot, a biblioteca e o replay são todos locais. Falta apenas a camada que guarda o aplicativo no aparelho.

## 3. Dependências

- Specs [[STT]] (modos local e bot) e [[REPLAY]] (biblioteca), já entregues.

## 4. Requisitos

- **REQ-OFFLINE-01:** O sistema **deve** registrar um service worker que guarda o aplicativo (HTML, JavaScript, CSS, fontes e ícone) no aparelho na primeira visita com rede.
- **REQ-OFFLINE-02:** Com o aplicativo já guardado e sem rede, abrir o endereço **deve** carregar o jogo normalmente e permitir jogar os modos local e contra o bot do início ao fim.
- **REQ-OFFLINE-03:** Sem rede, as ações que dependem de internet (criar sala e entrar em sala) **devem** ser bloqueadas com aviso claro de que precisam de conexão, em vez de falhar por tempo esgotado.
- **REQ-OFFLINE-04:** Publicada uma versão nova, o jogador **deve** recebê-la automaticamente ao reabrir o jogo com rede, no máximo na segunda abertura, sem precisar limpar cache.
- **REQ-OFFLINE-05:** As fontes manuscritas **devem** ser servidas pelo próprio site (hoje vêm de CDN externa), para que o visual offline seja idêntico ao online.
- **REQ-OFFLINE-06:** O service worker **deve** ficar ativo apenas no site publicado, sem interferir no ambiente de desenvolvimento.

## 5. Regras de Negócio

- **RN-OFFLINE-01:** o documento principal é sempre revalidado quando há rede (busca na rede primeiro, cache como reserva) e os arquivos versionados vêm do cache; assim ninguém fica preso numa versão antiga.
- **RN-OFFLINE-02:** o service worker guarda apenas os arquivos do aplicativo; dados do jogador (preferências, partidas, biblioteca) continuam exclusivamente no armazenamento do navegador.
- **RN-OFFLINE-03:** estar offline não altera regras, placar nem comportamento do bot.
- **RN-OFFLINE-04:** o cache antigo é descartado quando uma versão nova assume, sem acumular no aparelho.

## 6. Critérios de Aceite

**Cenário AC-OFFLINE-01: abrir sem rede**
**Dado que** o jogador já abriu o site uma vez com internet
**Quando** ele ativa o modo avião e recarrega a página
**Então** o jogo carrega normalmente, com o visual completo.

**Cenário AC-OFFLINE-02: partida local offline**
**Dado que** o jogador está sem internet com o jogo aberto
**Quando** ele inicia uma partida local e joga até o fim
**Então** a partida funciona por inteiro, incluindo desfazer, placar e histórico.

**Cenário AC-OFFLINE-03: partida contra o bot offline**
**Dado que** o jogador está sem internet
**Quando** ele joga contra o bot em cada uma das três dificuldades
**Então** o bot responde normalmente em todas.

**Cenário AC-OFFLINE-04: online avisa que precisa de rede**
**Dado que** o jogador está sem internet
**Quando** ele escolhe o modo multiplayer via web e tenta criar ou entrar numa sala
**Então** aparece aviso de que o modo online precisa de conexão, sem espera de 20 segundos.

**Cenário AC-OFFLINE-05: atualização automática**
**Dado que** uma versão nova foi publicada e o jogador tem a antiga guardada
**Quando** ele reabre o jogo com rede
**Então** passa a usar a versão nova em no máximo duas aberturas, sem limpar cache.

**Cenário AC-OFFLINE-06: biblioteca e replay offline**
**Dado que** o jogador tem partidas salvas e está sem internet
**Quando** ele abre a biblioteca, assiste a um replay e baixa o GIF
**Então** tudo funciona, porque nada disso depende de rede.

**Cenário AC-OFFLINE-07: desenvolvimento não afetado**
**Dado que** o desenvolvedor roda `npm run dev`
**Quando** ele altera um arquivo
**Então** a atualização aparece na hora, sem service worker segurando versão antiga.

## 7. Fora do Escopo

- Instalação como aplicativo (manifest, ícones de instalação e convite de "adicionar à tela inicial"): fica pra uma demanda seguinte, pequena, em cima desta base.
- Aviso visual de "nova versão disponível" com botão de recarregar (a atualização é automática, RN-OFFLINE-01).
- Notificações push e sincronização em segundo plano.
- Qualquer forma de jogo online offline (por definição, exige rede).

## 8. Notas Técnicas

- Service worker escrito à mão (poucas dezenas de linhas), sem dependência nova: precache dos arquivos gerados pelo build, busca na rede primeiro para o documento e cache primeiro para os arquivos com hash no nome.
- Fontes: baixar Patrick Hand e Caveat para `public/fonts/` e declarar com `@font-face`, removendo o link para a CDN do `index.html` (REQ-OFFLINE-05).
- Detecção de rede para REQ-OFFLINE-03: `navigator.onLine` mais o evento `offline`, aplicados na tela de configuração do modo online.
- O registro do service worker acontece apenas quando `import.meta.env.PROD`.
