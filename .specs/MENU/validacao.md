# Guia de Validação: MENU (redesenho da home e das configurações)

## 1. O que foi entregue

Home com código de convite em destaque, três modos de partida em 1x2
(Criar sala / 1 jogador / 2 jogadores), configurações globais atrás de um
único ícone de engrenagem, link de convite, fonte sem ambiguidade pro
código, reticências animadas nos textos de espera, e componentes de botão
padronizados em todo o app (inclusive replay).

## 2. Referência da demanda

Sem card de tracker: pedido direto no chat, refinado por três rodadas de
esboço num artefato comparativo. Códigos formais em `.specs/MENU/spec.md`.

## 3. Pré-requisitos

Nenhum. `npm run dev` e abrir `http://localhost:5173/` (ou a porta que o
Vite escolher).

## 4. Como executar

- Home: `/`
- Sala do host: clicar "Criar sala" na home, preencher nome, clicar
  "Criar sala" de novo na tela de configuração.
- Link de convite: copiar a URL que aparece com "Compartilhar" (ou montar
  manualmente `http://localhost:5173/?join=<CODIGO>`) e abrir numa aba
  anônima/outro navegador.
- Configurações: ícone ⚙️ no cabeçalho, em qualquer tela.

## 5. Cenários a validar

1. **AC-MENU-01**: abrir a home. Esperado: campo "Tem um código de sala?"
   com botão de colar e "Entrar", divisor, e os três botões (Criar sala
   sozinho em cima, 1 jogador / 2 jogadores lado a lado embaixo), tudo
   visível sem rolar em uma tela de notebook comum.
2. **AC-MENU-02**: digitar `AB` no campo de código e clicar "Entrar".
   Esperado: mensagem de erro aparece embaixo do campo, a home continua
   na tela (não avança pra escolha de nome).
3. **AC-MENU-03**: com o servidor rodando, abrir
   `http://localhost:5173/?join=ABCDEF` numa aba nova. Esperado: a tela
   já abre em "escolha seu nome", com o código `ABCDEF` mostrado (fonte
   monoespaçada) e sem os botões de modo da home. Recarregar a mesma aba
   depois: a URL não deve mais conter `?join=`.
4. **AC-MENU-04**: criar uma sala. Esperado: na tela de espera aparecem
   os botões "Copiar código" e "Compartilhar" ao lado do código.
   Clicar em "Copiar código": o texto do botão muda pra "Copiado!" por
   alguns segundos e o código vai pra área de transferência (colar em
   outro campo pra confirmar).
5. **AC-MENU-05**: na mesma tela de espera, observar o texto "Aguardando o
   adversário entrar na sala": as reticências depois do texto mudam de
   comprimento sozinhas a cada meio segundo (não ficam paradas em "...").
6. **AC-MENU-06**: jogar uma partida local até o fim, abrir o replay,
   clicar no botão redondo de reproduzir com o mouse. Esperado: nenhum
   contorno azul/anel de foco aparece ao redor do botão depois do clique.
   Pressionar Tab até focar o mesmo botão pelo teclado: aí sim o anel de
   foco aparece.
7. **Configurações**: clicar no ícone ⚙️ em qualquer tela. Esperado: modal
   com idioma, tema (barrinha sol/lua) e som (barrinha alto-falante), sem
   texto de nenhum tipo sobre "em andamento" ou funcionalidade incompleta.
8. **1 jogador / 2 jogadores**: clicar em "1 jogador" leva à configuração
   com campo de dificuldade; clicar em "2 jogadores" leva à configuração
   com campo do nome do segundo jogador. Um botão "Voltar" em cada uma
   retorna pra home.

## 6. Cenários de borda/erro

- Colar um código com espaços ou minúsculas no campo: o campo normaliza
  pra maiúsculas ao digitar; "Entrar" com um código de formato inválido
  (não 6 caracteres do alfabeto sem I/O/0/1) mostra o mesmo erro do
  cenário 2.
- Negar a permissão de área de transferência do navegador (se solicitado)
  ao clicar em "Colar código" ou "Copiar código": nenhum dos dois deve
  quebrar a tela, apenas não preencher/copiar (o código já está visível
  pra copiar manualmente).
- Abrir `?join=` com um código de formato inválido (ex.: `?join=AB`):
  como o parâmetro não normaliza, o comportamento cai pra home normal
  (RN-MENU-03 se aplica só depois de um clique explícito em "Entrar";
  aqui a home é o resultado esperado por não haver como confirmar via
  clique).

## 7. Fora do escopo (NÃO testar)

- Sala expirar sozinha por tempo, ou recusar entrada por estar "cheia": a
  sala se comporta exatamente como antes (RN-CONEXAO-02).
- Animação do traço de X/O sincronizada com o som (parte 2, adiada).
- Specs OFFLINE, ESTAT, CHAT.

## 8. Como reverter

Sem migração de dados nem mudança de schema; é só código de interface.
Reverter os commits desta entrega (ou `git revert`) volta ao formulário
único anterior sem efeito colateral em partidas salvas ou preferências
(as chaves de `localStorage` usadas não mudaram de formato).
