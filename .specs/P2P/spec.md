# P2P: Protocolo de partida via WebRTC do Super TicTacToe

## 1. Partes

- **Publisher (dono do contrato):** módulo `src/p2p/` do Super TicTacToe. Os dois lados rodam o mesmo código; os papéis são **host** (criou a sala) e **guest** (entrou com o código).
- **Consumidores:** os dois clientes da partida. Não há servidor próprio: o broker público do PeerJS só faz a sinalização inicial; todo o jogo trafega no DataChannel WebRTC direto entre os navegadores.

## 2. Schema

Toda mensagem é um objeto JSON num DataChannel **confiável e ordenado**:

```json
{ "t": "tipo", "...campos": "por tipo" }
```

| Tipo | Direção | Campos | Quando |
|---|---|---|---|
| `hello` | ambos | `v` (versão do protocolo), `name` (apelido) | ao conectar ou reconectar |
| `config` | host → guest | `config` (GameConfig), `hostSymbol`, `names` | após o hello inicial |
| `accept` | guest → host | vazio | aceite da configuração; a partida começa |
| `move` | ambos | `seq` (índice da jogada, 0-base), `path` | jogada do remetente |
| `sync` | ambos | `config`, `hostSymbol`, `names`, `moves`, `score` | reconexão ou dessincronia |
| `undoReq` | ambos | `toSeq` (tamanho do histórico após o desfazer) | pedido de desfazer |
| `undoRes` | ambos | `toSeq`, `ok` (booleano) | resposta ao pedido |
| `rematch` | ambos | vazio | proposta de revanche |
| `rematchOk` | ambos | vazio | aceite; nova partida com iniciante alternado |
| `ping` | ambos | vazio | heartbeat, a cada 5 s |
| `pong` | ambos | vazio | resposta imediata ao `ping` |
| `leave` | ambos | vazio | encerramento deliberado da sala |

Sala: o host registra no broker o peer id `stt-<código>`, onde `<código>` tem 6 caracteres de `A-Z2-9` gerados aleatoriamente. O guest só precisa do código.

## 3. Cláusulas

- **CL-P2P-01:** toda mensagem é JSON UTF-8 com no máximo 4 KiB; o campo `t` é obrigatório.
- **CL-P2P-02:** `v` é um inteiro; esta spec define `v = 1`. `hello` com `v` diferente do local encerra a conexão com aviso claro de versão incompatível.
- **CL-P2P-03:** `seq` de `move` é o índice da jogada no histórico global (0-base) e deve ser exatamente o tamanho atual do histórico do receptor; o jogador da jogada é derivado da paridade de `seq` + `startingPlayer`, nunca declarado na mensagem.
- **CL-P2P-04:** `path` segue o motor: array de inteiros 0..8 com comprimento igual a `config.depth`. Toda jogada recebida passa pelo `validateMove` local antes de aplicar.
- **CL-P2P-05:** `config` é imutável após o `accept` (RN-STT-08); revanche reusa a config com `startingPlayer` alternado.
- **CL-P2P-06:** mensagem com `t` desconhecido é ignorada em silêncio (compatibilidade com versões futuras).
- **CL-P2P-07:** `name` tem no máximo 24 caracteres; excedente é truncado no receptor.
- **CL-P2P-08:** o estado completo da partida é sempre redutível a `{config, moves}`; `sync` carrega exatamente essa forma (mais nomes e placar), e o receptor reconstrói por replay determinístico do motor.

## 4. Garantias

- **GAR-P2P-01 (entrega):** confiável e ordenada, delegada ao DataChannel WebRTC em modo reliable/ordered. A aplicação não implementa retransmissão própria.
- **GAR-P2P-02 (idempotência):** `move` com `seq` menor que o tamanho do histórico local e `path` idêntico ao registrado é reconhecido como duplicata e ignorado sem erro.
- **GAR-P2P-03 (autocorreção):** qualquer anomalia (`seq` fora do esperado, jogada que falha na validação, duplicata divergente) dispara troca de `sync`; prevalece o histórico **válido** mais longo. Nunca se responde anomalia com crash nem com estado corrompido.
- **GAR-P2P-04 (turno):** cada lado só emite `move` quando o motor local confirma que é sua vez (RN-STT-07); jogada recebida fora do turno cai na GAR-P2P-03.
- **GAR-P2P-05 (reconexão, REQ-STT-15):** cada lado persiste `{código da sala, papel, config, moves, names, score}` em localStorage a cada jogada. Ao reabrir com o mesmo código: o host re-registra `stt-<código>`, o guest redisca, ambos trocam `hello` + `sync` e a partida segue do ponto exato. Não há limite de tempo automático: quem ficou vê "aguardando reconexão" e pode encerrar manualmente.
- **GAR-P2P-06 (detecção de queda):** fechamento do DataChannel ou do peer marca a partida como desconectada de imediato; rede que congela sem fechar o canal é detectada pelo heartbeat (`ping` a cada 5 s; 12 s sem tráfego marca a queda). O estado local fica intacto nos dois casos.
- **GAR-P2P-07 (consentimento de desfazer, REQ-STT-07):** nenhum desfazer é aplicado sem `undoRes` com `ok: true`; o pedido expira ao ser recusado ou quando qualquer jogada nova chega antes da resposta.
- **GAR-P2P-08 (leveza):** o protocolo não tem dependência além de PeerJS; mensagens de jogo normais (`move`) têm um único dígito de campos e dezenas de bytes.

## 5. Casos de Erro

| Cenário | Resposta esperada |
|---|---|
| Código de sala inexistente ou host offline | Erro "sala não encontrada" na tela de entrada; opção de tentar de novo |
| Código já em uso ao criar sala | Gerar outro código automaticamente e tentar de novo (até 3 vezes) |
| Broker PeerJS indisponível | Erro claro de conexão com opção de repetir; nada de tela branca |
| `hello` com versão incompatível (CL-P2P-02) | Mensagem "versões diferentes do jogo" nos dois lados; conexão encerrada |
| `move` inválido ou `seq` inesperado | Troca de `sync` (GAR-P2P-03); partida continua do estado válido |
| Queda de conexão no meio da partida | "Aguardando reconexão" pra quem ficou; retomada via mesmo código (GAR-P2P-05) |
| Desfazer recusado ou ignorado | Nada muda; quem pediu é informado da recusa |
| `leave` recebido | Partida encerrada com aviso; placar da sessão preservado localmente |
| Segundo guest tentando entrar na sala ocupada | Conexão recusada pelo host com aviso "sala cheia" |

## 5.1 Exemplos

Fluxo de sucesso (partida clássica, host é X e começa):

```json
guest → host  { "t": "hello", "v": 1, "name": "Bia" }
host  → guest { "t": "hello", "v": 1, "name": "Ana" }
host  → guest { "t": "config", "config": { "depth": 2, "clearVariant": false,
                "tiebreak": "majority", "startingPlayer": "X" },
                "hostSymbol": "X", "names": ["Ana", "Bia"] }
guest → host  { "t": "accept" }
host  → guest { "t": "move", "seq": 0, "path": [4, 0] }
guest → host  { "t": "move", "seq": 1, "path": [0, 4] }
```

Erro com autocorreção (guest recebeu `seq` inesperado após reconectar):

```json
host  → guest { "t": "move", "seq": 7, "path": [3, 5] }   // guest só tem 5 jogadas
guest → host  { "t": "sync", "config": { "...": "..." }, "hostSymbol": "X",
                "names": ["Ana", "Bia"], "moves": ["...5 jogadas..."], "score": { "X": 0, "O": 0, "draws": 0 } }
host  → guest { "t": "sync", "config": { "...": "..." }, "hostSymbol": "X",
                "names": ["Ana", "Bia"], "moves": ["...7 jogadas..."], "score": { "X": 0, "O": 0, "draws": 0 } }
// histórico válido mais longo (7) prevalece nos dois lados
```

## 6. Versionamento

- **Adições compatíveis:** novos tipos de mensagem (ignorados por versões antigas via CL-P2P-06) e novos campos opcionais em mensagens existentes.
- **Quebras:** mudar semântica de campo existente, remover tipo, ou alterar a forma serializada `{config, moves}`. Exigem `v + 1`; a incompatibilidade é detectada no `hello` (CL-P2P-02) e comunicada com clareza, nunca com comportamento indefinido.
- A versão do protocolo é independente da versão do app; só muda quando o contrato muda.
