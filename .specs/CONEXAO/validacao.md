# Guia de Validação: CONEXAO (robustez do online e saída de partida)

## 1. O que foi entregue

Correção do multiplayer online: salas agora são liberadas de verdade quando o criador sai (antes viravam salas fantasma que aceitavam conexões sem ninguém do outro lado), a tentativa de conexão tem prazo de 20 segundos com erro explicativo em vez de "Conectando..." infinito, a reconexão automática é limitada e não fica criando conexões sem parar, e foram adicionados servidores TURN para funcionar entre redes diferentes. Além disso, agora dá pra sair de qualquer partida em andamento (local, bot ou online), com confirmação.

## 2. Referência da demanda

Spec `CONEXAO` (`.specs/CONEXAO/spec.md`). Códigos entregues: REQ-CONEXAO-01..07; RN-CONEXAO-01..05, 08; AC-CONEXAO-01..08.

## 3. Pré-requisitos

- `npm install` (sem dependências novas)
- Para o cenário 5.4: dois dispositivos em redes diferentes (por exemplo, um no wifi e outro no 4G)

## 4. Como executar

```
npm run dev
```

Abrir http://localhost:5173, ou usar o site publicado após o deploy.

## 5. Cenários a validar

### 5.1 Sala liberada ao sair (AC-CONEXAO-01)

Passos: criar uma sala online (anotar o código), clicar "Voltar"; em outro navegador, tentar entrar com esse código.
Esperado: "Sala não encontrada..." em até poucos segundos. Antes, o segundo jogador entrava numa sala fantasma e ficava jogando sozinho.

### 5.2 Código reutilizável (AC-CONEXAO-02)

Passos: criar sala, voltar, criar sala de novo (repetir 3 vezes).
Esperado: cada criação mostra um código e a sala funciona; sem erro de código em uso.

### 5.3 Timeout de conexão (AC-CONEXAO-03)

Passos: entrar num código válido em formato mas inexistente (ex: ZZZZZZ).
Esperado: em no máximo 20 segundos aparece erro explicando a falha, com "Tentar de novo" e "Voltar". A tela nunca fica presa em "Conectando...".

### 5.4 Conexão entre redes diferentes (REQ-CONEXAO-04)

Passos: um jogador no wifi e outro no 4G (ou em provedores diferentes); criar sala num, entrar com o código no outro; jogar algumas jogadas.
Esperado: a partida conecta e as jogadas aparecem dos dois lados. Este era o caso que falhava com frequência (só STUN, sem TURN).

### 5.5 Sair de partida em andamento (AC-CONEXAO-05, 06)

Passos: iniciar partida local, fazer uma jogada, clicar "Sair da partida"; cancelar ("Continuar jogando"); clicar de novo e confirmar ("Sair"); recarregar a página.
Esperado: cancelar mantém a partida intacta; confirmar volta pra tela de configuração; após recarregar, não aparece diálogo de retomar partida.

### 5.6 Sair de partida online avisa o adversário (AC-CONEXAO-07)

Passos: com dois navegadores numa partida, um clica "Sair da partida" e confirma.
Esperado: o outro vê "O adversário saiu da sala"; o código fica livre pra uma sala nova.

### 5.7 Reconexão limitada (AC-CONEXAO-04)

Passos: numa partida online, desligar a rede de um dos lados (ou fechar a aba do adversário) e observar por alguns minutos.
Esperado: aparece "Conexão perdida. Aguardando reconexão..."; o jogo tenta reconectar 5 vezes com intervalos crescentes (4, 8, 16, 32 e 60 segundos) e depois para de tentar sozinho, mantendo "Reconectar" e "Sair da partida" disponíveis.

### 5.8 Pedido de desfazer visível e invalidado por jogada nova (AC-CONEXAO-08, revisão)

Passos: numa partida online, um jogador pede pra desfazer; do lado de quem recebe o pedido, jogue uma jogada nova antes de responder.
Esperado: o aviso aparece fixo no topo da tela (não é preciso rolar pra ver), e some sozinho assim que a jogada nova acontece, sem que dê pra clicar "Aceitar" nele depois disso. As duas jogadas (a original e a nova) continuam de pé nos dois lados.

## 6. Cenários de borda e erro

### 6.1 Sair de partida encerrada não pede confirmação

Passos: terminar uma partida e clicar "Mudar configuração".
Esperado: volta direto pra configuração, sem diálogo.

### 6.2 Tentar de novo após erro

Passos: na tela de erro de conexão, clicar "Tentar de novo".
Esperado: nova tentativa começa (volta pra "Conectando..."), com o mesmo prazo de 20 segundos.

### 6.3 Fechar a aba durante a partida

Passos: numa partida online, fechar a aba de um dos lados.
Esperado: o outro entra em "Conexão perdida"; o código do que fechou fica livre.

## 7. Fora do escopo (NÃO testar)

- Servidor de sinalização ou TURN próprios (usa serviços públicos gratuitos)
- Reconexão entre dispositivos diferentes (segue por código de sala)
- PWA, profundidade 3 na UI, chat, espectador, ranking
- Diagnóstico de rede exibido ao usuário

## 8. Como reverter

Sem efeito colateral: reverter os commits. Nenhuma mudança de formato de dados salvos.
