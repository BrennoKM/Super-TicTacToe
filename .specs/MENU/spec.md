# Feature Spec: MENU (redesenho da home e das configurações)

## Propósito técnico

A tela inicial (`SetupScreen`) misturava seleção de modo, configuração de
regras e entrada de sala num único formulário com `<select>`, e as
preferências globais (idioma, tema, som) ficavam soltas no cabeçalho. O
código da sala usava a mesma fonte manuscrita dos títulos, ambígua pra
dígitos que precisam ser digitados certos por outra pessoa. Este módulo
reformula a home pra: código de convite em destaque, os três modos de
partida como ações de mesmo peso, e configurações atrás de um único ícone.

Decidido interativamente com o usuário através de três rodadas de esboço
(artefato comparativo publicado durante a sessão), não a partir de uma
demanda formal pré-existente.

## Contrato público

- `SetupScreen` ganha a prop opcional `initialJoinCode?: string | null`: se
  presente, a tela abre direto no estágio de escolher nome (pula a home).
- `App.tsx` lê `?join=CODIGO` da URL uma vez no carregamento, valida com
  `normalizeRoomCode`, repassa como `initialJoinCode` e limpa o parâmetro da
  URL (`history.replaceState`) pra um F5 no meio da partida não tentar
  entrar de novo.
- Componente novo `src/ui/Ellipsis.tsx`: reticências animadas
  (`"..." → "." → ".."`, ciclo de 450ms cada quadro), respeitando
  `prefers-reduced-motion`.

## Requisitos (REQ)

- REQ-MENU-01: a home mostra, como primeiro elemento, um campo pra código de
  sala com botão de colar e botão de entrar.
- REQ-MENU-02: abaixo do campo de código, a home mostra três ações de
  iniciar partida com o mesmo padrão visual entre si: "Criar sala" (sozinha,
  largura total), "1 jogador" e "2 jogadores" (lado a lado).
- REQ-MENU-03: as configurações globais (idioma, tema, som) ficam atrás de
  um único botão de engrenagem no cabeçalho, num modal; o botão de
  informações continua separado, sempre visível.
- REQ-MENU-04: o código da sala (campo de digitar e exibição no host) usa
  fonte monoespaçada (JetBrains Mono), não a fonte manuscrita dos títulos.
- REQ-MENU-05: a tela do host mostra um botão de copiar o código e um botão
  de compartilhar (Web Share API com globalidade de reserva pra copiar o
  link, quando a API não existe).
- REQ-MENU-06: um link de convite (`?join=CODIGO`) abre a aplicação já na
  etapa de escolher o nome pra entrar na sala daquele código, sem passar
  pela home.
- REQ-MENU-07: todo texto de espera/carregamento (conectando, aguardando
  adversário, reconectando, gerando GIF, pedido de desfazer/revanche
  enviado) mostra reticências animadas em vez de "..." estático.
- REQ-MENU-08: botão, campo, seletor e cartão usam um raio de borda único e
  uma altura mínima única por categoria de controle (controles de linha
  única compartilham a mesma altura), em vez de valores variando por
  elemento.
- REQ-MENU-09: nenhum botão mostra o anel de foco do navegador depois de um
  clique de mouse; o anel continua aparecendo na navegação por teclado
  (`:focus-visible`).

## Regras de negócio (RN)

- RN-MENU-01: "primary" nunca muda a espessura da borda pra se destacar,
  só ganha um preenchimento com a cor de destaque e peso de fonte.
- RN-MENU-02: o campo de célula do tabuleiro (`.cell`) é excluído da altura
  mínima padronizada de controle, por não ser um controle de linha única.
- RN-MENU-03: um código de convite com formato inválido (não bate com o
  alfabeto de 6 caracteres) mostra erro embaixo do campo e não avança de
  etapa.
- RN-MENU-04: a página não é responsável por avisar, na interface, que
  quem abre o link de convite vai direto pra escolha de nome, esse
  comportamento não tem texto explicativo na UI.

## Critérios de aceite (AC)

- AC-MENU-01: ao abrir a home, o campo de código, os botões "Criar sala",
  "1 jogador" e "2 jogadores" estão visíveis, sem precisar de rolagem em
  telas comuns.
- AC-MENU-02: preencher um código com formato inválido e clicar em "Entrar"
  mostra a mensagem de erro e mantém a home visível.
- AC-MENU-03: abrir `/?join=ABCDEF` (formato válido) mostra direto o campo
  de nome e o código preenchido, sem os botões de modo da home.
- AC-MENU-04: na tela de espera do host, os botões de copiar e compartilhar
  o código estão visíveis.
- AC-MENU-05: o texto de espera muda de conteúdo ao longo do tempo (as
  reticências animam).
- AC-MENU-06: depois de um clique de mouse no botão de reproduzir do
  replay, `outline-style` computado é `none`.

## Fora do escopo

- Expiração de sala ou limite de vagas pro link de convite (o link só
  encurta o passo de digitar o código; a sala em si já se comporta como
  antes: fecha quando o host sai, RN-CONEXAO-02).
- SVG desenhado a traço sincronizado com o som (parte 2 da ideia de
  animação, adiada por decisão do usuário).
- Especificações OFFLINE, ESTAT e CHAT (backlog, não tocadas aqui).

## Dependências

- Reaproveita `normalizeRoomCode`/`generateRoomCode` (`src/p2p/protocol.ts`)
  e o padrão de modal já existente (`modal-backdrop`/`modal-card`, spec SOM).
