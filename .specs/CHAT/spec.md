# CHAT: Mensagens e emotes na partida online

## 1. História de Usuário

**Como** jogador numa partida online, **Quero** trocar mensagens curtas e reações rápidas com o adversário, **Para que** a partida à distância tenha o mesmo clima de quando se joga lado a lado (provocar, comemorar, combinar revanche).

## 2. Contexto do Problema

Hoje a partida online é muda: os jogadores só veem as jogadas do outro. Combinar qualquer coisa (pedir revanche, avisar que vai voltar, comemorar) exige outro aplicativo em paralelo. O canal p2p já existe, é confiável e ordenado, e o contrato prevê adições compatíveis de mensagens, então o custo é baixo.

## 3. Dependências

- Spec [[P2P]] (contrato do protocolo), já entregue: esta demanda adiciona os tipos `chat` e `emote`, que versões antigas ignoram sem quebrar (CL-P2P-06).

## 4. Requisitos

- **REQ-CHAT-01:** A partida online **deve** ter um painel de conversa com o histórico de mensagens e emotes da sessão, aberto e fechado por um controle visível.
- **REQ-CHAT-02:** O jogador **deve** poder enviar mensagens de texto de até 200 caracteres.
- **REQ-CHAT-03:** O jogador **deve** poder enviar reações rápidas de um conjunto fixo de emotes, sem digitar.
- **REQ-CHAT-04:** Um emote recebido **deve** aparecer também como balão temporário sobre o tabuleiro, para ser visto sem abrir o painel.
- **REQ-CHAT-05:** Com o painel fechado, mensagem nova **deve** gerar indicador de não lida no controle de abrir.
- **REQ-CHAT-06:** O jogador **deve** poder silenciar o adversário, o que oculta as mensagens dele até o fim da partida, sem interromper o jogo.
- **REQ-CHAT-07:** Todos os textos novos seguem o i18n pt/en (REQ-STT-17).

## 5. Regras de Negócio

- **RN-CHAT-01:** mensagem é sempre exibida como texto puro, nunca interpretada como HTML, markdown ou link clicável.
- **RN-CHAT-02:** limite de 200 caracteres no envio e no recebimento (excedente é truncado), e no máximo 5 mensagens a cada 10 segundos por jogador; excedente é descartado silenciosamente pelo receptor.
- **RN-CHAT-03:** a conversa existe apenas no modo online e apenas entre os dois jogadores da sala.
- **RN-CHAT-04:** mensagens e emotes são efêmeros: não entram no estado de jogo, não são salvos na partida em andamento, não vão pra biblioteca, pro replay nem pro GIF, e somem ao sair da partida.
- **RN-CHAT-05:** a adição é compatível com o contrato P2P: tipos novos, versão do protocolo mantida; quem estiver numa versão antiga do jogo simplesmente não vê as mensagens, e a partida segue normal.
- **RN-CHAT-06:** silenciar é decisão local de quem silencia e não é comunicado ao outro lado.

## 6. Critérios de Aceite

**Cenário AC-CHAT-01: enviar e receber texto**
**Dado que** dois jogadores estão numa partida online
**Quando** um envia "boa jogada"
**Então** a mensagem aparece no painel dos dois, identificada pelo autor, sem afetar o tabuleiro.

**Cenário AC-CHAT-02: emote aparece sobre o tabuleiro**
**Dado que** o painel de conversa está fechado no lado do adversário
**Quando** um jogador envia um emote
**Então** o adversário vê o balão temporário sobre o tabuleiro e o indicador de não lida no controle.

**Cenário AC-CHAT-03: limite de caracteres**
**Dado que** o campo de mensagem está aberto
**Quando** o jogador tenta digitar mais de 200 caracteres
**Então** o texto é limitado a 200, com contador visível.

**Cenário AC-CHAT-04: proteção contra flood**
**Dado que** um jogador envia 10 mensagens em menos de 10 segundos
**Quando** o adversário recebe
**Então** no máximo 5 são exibidas e o restante é descartado, sem travar a partida.

**Cenário AC-CHAT-05: texto com marcação aparece literal**
**Dado que** um jogador envia `<b>oi</b>`
**Quando** a mensagem chega
**Então** aparece exatamente `<b>oi</b>` como texto, sem formatação nem execução.

**Cenário AC-CHAT-06: silenciar**
**Dado que** o adversário está incomodando
**Quando** o jogador silencia
**Então** as mensagens seguintes dele não aparecem, o jogo continua normal, e as jogadas seguem chegando.

**Cenário AC-CHAT-07: mensagens não persistem**
**Dado que** houve conversa durante a partida
**Quando** a partida termina e o jogador abre o replay, o GIF e a biblioteca
**Então** nenhuma mensagem aparece em nenhum dos três.

**Cenário AC-CHAT-08: compatibilidade com versão antiga**
**Dado que** um dos lados está numa versão sem conversa
**Quando** o outro envia mensagem
**Então** a partida segue sem erro dos dois lados; apenas a mensagem não é exibida no lado antigo.

## 7. Fora do Escopo

- Chat fora da partida (lobby, salas de espera, mensagens offline).
- Modo espectador e chat com mais de dois participantes.
- Histórico de conversa entre sessões, denúncia e moderação automática de conteúdo.
- Áudio, imagens, GIFs e emotes personalizados enviados pelo jogador.
- Tradução automática das mensagens.

## 8. Notas Técnicas

- Contrato: acrescentar à Contract Spec P2P os tipos `{t: 'chat', text}` e `{t: 'emote', id}`, com cláusulas de tamanho e taxa, mantendo `v = 1` (adição compatível, seção 6 daquela spec).
- O conjunto fixo de emotes fica em código como lista de identificadores curtos, para o receptor renderizar o emoji correspondente na própria versão (não trafega emoji arbitrário).
- Renderização com texto puro em React já escapa por padrão; a regra RN-CHAT-01 é garantida por não usar `dangerouslySetInnerHTML` e verificada por teste com marcação (AC-CHAT-05).
- O controle de taxa (RN-CHAT-02) é aplicado no receptor, que é quem se protege, e também no emissor para dar retorno imediato ao jogador.
