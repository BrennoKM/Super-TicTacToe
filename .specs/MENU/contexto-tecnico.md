# Guia de Contexto Técnico: MENU (redesenho da home e das configurações)

## 1. O que foi alterado

`SetupScreen.tsx` deixou de ser um formulário único com `<select>` de modo
e virou uma máquina de três estágios (`home` → `config`/`join-name`). O
cabeçalho (`App.tsx`) perdeu os controles soltos de idioma/tema/som, que
agora vivem num modal de configurações atrás do ícone ⚙️ (reaproveitando o
mesmo padrão de modal já usado pra informações). `themes.css` ganhou
tokens (`--radius`, `--control-h`, `--mode-h`, `--font-code`, `--accent`)
que centralizam raio de borda, altura de controle e a cor de destaque do
botão "primary", em vez de cada regra declarar seu próprio valor.

## 2. Referência da demanda

Sem card de tracker (pedido direto no chat). Códigos formais em
`.specs/MENU/spec.md`.

## 3. Mudanças de dados

Nenhuma. As chaves de `localStorage` (`stt.match`, `stt.online.*`,
`stt.prefs`, `stt.library`) e o protocolo p2p (`src/p2p/protocol.ts`,
`PROTOCOL_VERSION`) não mudaram de formato. Nada a migrar.

## 4. Fluxo de chamadas e integrações

- **Novo**: `src/ui/Ellipsis.tsx` — componente puro de apresentação, sem
  dependência externa, usado por `OnlineGame.tsx` e `ReplayScreen.tsx`.
- **Alterado**: `SetupScreen.tsx` — mesma interface pública de callbacks
  (`onStart`, `onStartOnline`), ganhou a prop opcional `initialJoinCode`.
  Internamente, o estágio `'join-name'` chama `onStartOnline` com
  `role: 'guest'` exatamente como o fluxo antigo de `modeType === 'online'
  && onlineAction === 'join'`; nada mudou do lado do `P2PSession`/
  transporte.
- **Alterado**: `App.tsx` — lê `?join=` uma vez via `useState` inicializador
  (evita reprocessar em re-renders) e limpa a URL num `useEffect` que roda
  só na montagem. `normalizeRoomCode` (já existente em
  `src/p2p/protocol.ts`) valida o parâmetro antes de repassá-lo.
- **Alterado**: `OnlineGame.tsx` — duas funções novas, `copyCode` (
  `navigator.clipboard.writeText`, com captura de exceção silenciosa se a
  permissão for negada) e `shareCode` (`navigator.share` quando disponível,
  senão cai pra copiar o link via `copyCode`). `inviteUrl` monta a URL
  a partir de `window.location.href`, preservando o `BASE_URL` do Vite
  porque parte da URL atual em vez de montar um caminho absoluto.
- **Alterado**: `ReplayScreen.tsx` — só trocou o texto de "Gerando GIF..."
  estático pelo componente `<Ellipsis />`; nenhuma mudança de lógica.
- **Removido**: o `<select data-testid="mode">` e o
  `<select data-testid="online-action">` não existem mais; suas seleções
  viraram os botões `mode-online`/`mode-bot`/`mode-local` (home) e o botão
  `join-go` (envia o código pro estágio de nome).

## 5. Validações aplicadas

- RN-MENU-03: `submitJoinCode` em `SetupScreen.tsx` só avança de estágio se
  `normalizeRoomCode` aceitar o valor digitado; senão marca `codeError`.
- RN-MENU-02: `.cell` recebeu `min-height: 0` explícito pra escapar da
  altura mínima global de controle (`--control-h: 3rem`), que quebrava o
  layout do tabuleiro em telas pequenas (achado durante a validação do
  teste `mobile.spec.ts`, corrigido antes da entrega).
- REQ-MENU-09: `button:focus { outline: none }` seguido de
  `button:focus-visible { outline: 2px solid var(--accent) }` em
  `themes.css`, aplicado globalmente (afeta todo botão, não só o do
  replay).

## 6. Possíveis impactos colaterais

- **Testes e2e reescritos**: `bot.spec.ts`, `local.spec.ts`,
  `mobile.spec.ts`, `online.spec.ts`, `persistence.spec.ts`,
  `replay.spec.ts` e `sound.spec.ts` tiveram pontos de interação
  atualizados (a seleção de modo por `<select>` virou clique em botão, e
  idioma/tema/som passaram a exigir abrir o modal de configurações
  primeiro). Nenhum teste testava comportamento novo por acidente, só
  seguiu a UI. Teste novo: `tests/e2e/menu.spec.ts`.
- **`.card` mudou de raio de borda** (`14px 6px 16px 8px` → `var(--radius)`,
  um valor único): afeta visualmente todo cartão do app (setup, modais,
  painéis do jogo), não só a home. Intencional (REQ-MENU-08), mas vale
  saber que não ficou isolado à home.
- **Todo `<button>`/`<select>`/`<input>` ganhou `min-height: var(--control-h)`
  por padrão**: qualquer botão pequeno futuro (ex.: ícones dentro de listas)
  deve considerar isso ou herdar involuntariamente 3rem de altura mínima,
  como aconteceu com `.cell` (já corrigido aqui, mas é um padrão a lembrar
  pra próximos componentes).
- **Sem mudança de protocolo p2p**: o link de convite é só um atalho de UI
  pro fluxo de "entrar" já existente; um peer rodando uma versão antiga do
  app (sem o parâmetro `?join=`) continua funcionando normalmente com o
  código digitado à mão.
