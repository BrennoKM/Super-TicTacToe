# REPLAY2: GIF fiel ao jogo e controles de replay claros

## 1. História de Usuário

**Como** jogador que compartilha uma partida, **Quero** que o GIF tenha a mesma cara do jogo (papel ou lousa, traço à mão, letra manuscrita) e que os controles do replay deixem óbvio o que é reproduzir e o que é avançar uma jogada, **Para que** o replay seja agradável de usar e o GIF valha a pena mostrar pros outros.

## 2. Contexto do Problema

O GIF não é uma captura de tela: o gerador redesenha o tabuleiro em canvas e hoje reproduz apenas as cores do tema. Ficam de fora o fundo de papel pautado, o tremor de traço à mão (que na tela vem de um filtro SVG) e a fonte manuscrita, que no canvas cai para a fonte padrão porque não é carregada antes do desenho. O resultado é um esquema geometricamente correto, mas sem a identidade visual do jogo.

Nos controles do replay, `▶` (reproduzir e pausar) e `▶▶` (avançar uma jogada) ficam lado a lado e são lidos como variações da mesma ação, o que quebra o padrão esperado de um player.

## 3. Dependências

- Spec [[REPLAY]] (player e geração de GIF), já entregue.

## 4. Requisitos

- **REQ-REPLAY2-01:** Cada quadro do GIF **deve** reproduzir o fundo do tema em uso: papel pautado no tema caderno e lousa no tema escuro, com as mesmas cores da tela.
- **REQ-REPLAY2-02:** As linhas do tabuleiro no GIF **devem** ter tremor de traço à mão, com a mesma hierarquia da tela (traço grosso no jogo grande, fino nos pequenos), e o tremor **deve** ser estável entre quadros, para o tabuleiro não vibrar durante a animação.
- **REQ-REPLAY2-03:** As marcas X e O e as marcas de tabuleiro conquistado **devem** usar a mesma fonte manuscrita da tela, garantindo que ela esteja carregada antes do primeiro quadro ser desenhado.
- **REQ-REPLAY2-04:** Tabuleiro decidido **deve** aparecer no GIF como aparece na tela: marca grande sobreposta e jogadas internas esmaecidas.
- **REQ-REPLAY2-05:** A última jogada de cada quadro **deve** ter o mesmo destaque que a tela usa, para o olho acompanhar a sequência.
- **REQ-REPLAY2-06:** Os controles do replay **devem** distinguir claramente reproduzir/pausar de avançar e voltar uma jogada, sem dois botões de aparência parecida com funções diferentes.
- **REQ-REPLAY2-07:** Todo controle do replay **deve** ter rótulo acessível descrevendo sua função, no idioma em uso.

## 5. Regras de Negócio

- **RN-REPLAY2-01:** o GIF segue o tema ativo no momento em que é gerado; trocar de tema depois não altera um GIF já baixado.
- **RN-REPLAY2-02:** o conteúdo do GIF continua derivado apenas de `{config, moves}` pelo motor (RN-REPLAY-02); a fidelidade é só de desenho.
- **RN-REPLAY2-03:** o arquivo continua leve: no máximo 2 MB para uma partida de até 81 jogadas.
- **RN-REPLAY2-04:** o tempo de geração no celular continua tolerável: no máximo 5 segundos para uma partida de 40 jogadas, com aviso visual enquanto gera.

## 6. Critérios de Aceite

**Cenário AC-REPLAY2-01: GIF no tema caderno**
**Dado que** o jogo está no tema claro
**Quando** o jogador baixa o GIF de uma partida
**Então** os quadros têm fundo de papel pautado, linhas com tremor e marcas em letra manuscrita, iguais às da tela.

**Cenário AC-REPLAY2-02: GIF no tema lousa**
**Dado que** o jogo está no tema escuro
**Quando** o jogador baixa o GIF
**Então** os quadros têm fundo de lousa e traço claro de giz, com as mesmas cores da tela.

**Cenário AC-REPLAY2-03: tabuleiro estável**
**Dado que** um GIF com várias jogadas foi gerado
**Quando** ele é reproduzido
**Então** as linhas do tabuleiro permanecem no mesmo lugar quadro a quadro; só as marcas aparecem.

**Cenário AC-REPLAY2-04: fonte carregada**
**Dado que** o jogador abre o site e baixa o GIF imediatamente, antes de qualquer outra ação
**Quando** o arquivo é aberto
**Então** as marcas estão na fonte manuscrita, não na fonte padrão do sistema.

**Cenário AC-REPLAY2-05: tabuleiro conquistado**
**Dado que** a partida teve tabuleiros conquistados
**Quando** o GIF chega no quadro correspondente
**Então** o tabuleiro aparece com a marca grande sobreposta e as jogadas internas esmaecidas.

**Cenário AC-REPLAY2-06: peso e tempo**
**Dado que** uma partida de 40 jogadas terminou
**Quando** o jogador baixa o GIF no celular
**Então** o arquivo tem no máximo 2 MB e a geração leva no máximo 5 segundos, com aviso visual durante o processo.

**Cenário AC-REPLAY2-07: controles inequívocos**
**Dado que** o replay está aberto
**Quando** o jogador olha a barra de controles
**Então** o botão de reproduzir/pausar é visualmente distinto dos de passo a passo, e cada botão tem rótulo acessível ("reproduzir", "pausar", "próxima jogada", "jogada anterior", "início", "fim").

**Cenário AC-REPLAY2-08: avançar não confunde com reproduzir**
**Dado que** o replay está pausado no meio da partida
**Quando** o jogador aciona o controle de avançar
**Então** o replay anda exatamente uma jogada e permanece pausado.

## 7. Fora do Escopo

- Captura literal da tela (renderizar o DOM em imagem): custo e fragilidade altos para o mesmo resultado.
- Animação do traço sendo desenhado, som no replay e exportação em vídeo.
- Controle de velocidade da reprodução e barra de progresso arrastável.
- Alterar o visual do jogo em si; esta demanda faz o GIF acompanhar a tela, não o contrário.

## 8. Notas Técnicas

- O tremor de traço no canvas sai de deslocamentos pseudoaleatórios com semente fixa por partida (mesma semente em todos os quadros, atendendo REQ-REPLAY2-02), imitando o que o filtro SVG faz na tela.
- O fundo pautado é desenhado com linhas horizontais na cor `--ruled-line`, como no CSS.
- Carregamento da fonte: `await document.fonts.load('bold 40px "Patrick Hand"')` (e a de título) antes do primeiro quadro; se a fonte não estiver disponível, o desenho segue com a reserva, sem travar o download.
- A geração passa a ser assíncrona para permitir o aviso visual de RN-REPLAY2-04.
- Controles: manter reproduzir/pausar como botão destacado e separado do grupo de passo a passo, com `aria-label` em todos.
