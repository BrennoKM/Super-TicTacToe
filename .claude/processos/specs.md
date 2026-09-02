# Formatos de Spec (Referência)

> Este documento define os 4 formatos de spec que a Promptaria reconhece, incluindo o significado de cada código (REQ, RN, AC, RT, HIP, CS, CF, CL, GAR).
> Consulte sob demanda quando precisar **reconhecer** uma spec colada OU **construir** uma do zero.

---

## Conceito central

**Spec é qualquer documento que alimenta implementação com precisão suficiente pra ninguém precisar chutar.**

Não é um formato fixo. O sujeito da spec muda o formato:

| Sujeito | Formato |
|---|---|
| Pessoa que usa o sistema | História de Usuário |
| Módulo/feature técnica interna (sem UX direta) | Feature Spec |
| Hipótese a validar (PoC, spike) | Experiment Plan |
| Contrato entre componentes (API, evento, schema) | Contract Spec |

Spec boa passa no teste: *"se eu implementar isso, alguém pode dizer que ficou errado por interpretação diferente?"*. Se a resposta é **não**, a spec é boa.

---

## Códigos comuns

| Código | Nome | Onde aparece | O que significa |
|---|---|---|---|
| **REQ** | Requisito | História, Feature Spec | Comportamento que o sistema/módulo **deve** ter. Verbos: criar, validar, retornar, calcular, emitir. |
| **RN** | Regra de Negócio | História | Restrição de domínio que sempre se aplica, independente de tela. Linguagem: "só pode", "não pode", "sempre que", "valor calculado como". |
| **AC** | Critério de Aceite | História, Feature Spec | Cenário verificável em formato BDD (Dado/Quando/Então). Um cenário isolado e testável. |
| **RT** | Restrição Técnica | Feature Spec | Equivalente a RN mas em domínio técnico: invariante, acoplamento proibido, limite arquitetural. Linguagem: "não pode importar", "sempre via", "nunca acessa direto". |
| **HIP** | Hipótese | Experiment Plan | Afirmação falsificável que o experimento valida ou refuta. Uma frase. |
| **CS** | Critério de Sucesso | Experiment Plan | Condição mensurável que confirma a hipótese. Definida ANTES da execução. |
| **CF** | Critério de Falha | Experiment Plan | Condição que mata a hipótese. Definida ANTES. Evita viés de confirmação. |
| **CL** | Cláusula | Contract Spec | Regra explícita sobre os dados ou protocolo. Ex: "campo `userId` é UUID v4". |
| **GAR** | Garantia | Contract Spec | Promessa do publisher sobre comportamento. Ex: entrega at-least-once, ordem garantida, idempotência. |

**Numeração:** os códigos têm formato `TIPO-NOME-NN`. O `NOME` é o identificador da spec (curto, em maiúsculas, ex: `RETRY`, `LOGIN`, `AGENDAMENTO`). O `NN` é sequencial dentro daquela spec.

Exemplos:
- `REQ-LOGIN-01`, `REQ-LOGIN-02`, `RN-LOGIN-01`, `AC-LOGIN-01` → todos pertencentes à spec `LOGIN`
- `REQ-RETRY-01`, `RT-RETRY-01`, `AC-RETRY-01` → todos pertencentes à Feature Spec `RETRY`

---

## Marcador `[DÚVIDA: ...]` (lacunas que travam o fluxo)

Toda vez que um campo da spec não tem informação suficiente e nenhuma resposta foi confirmada, o agente **não pode inventar**. Deve marcar com:

```
[DÚVIDA: <pergunta específica que precisa de resposta humana>]
```

Exemplo:

```
REQ-LOGIN-03: Após 5 tentativas falhas, o usuário deve ser
              [DÚVIDA: bloqueado temporariamente (quantos min?),
               bloqueado até reset manual, ou receber CAPTCHA?]
```

### Regras do marcador

- **Sempre com pergunta específica.** `[DÚVIDA: o que fazer aqui?]` é inútil. `[DÚVIDA: timeout em segundos ou em minutos?]` é acionável.
- **Spec com qualquer `[DÚVIDA: ...]` não pode ir pra implementação.** O fluxo trava. Quem solicita responde antes.
- **Diferença pra `[a definir]`:** `[a definir]` é placeholder passivo (vamos preencher depois, sem urgência). `[DÚVIDA: ...]` é bloqueio ativo, precisa resposta.

Esse mecanismo previne o erro mais comum do agente: preencher buracos com suposição plausível-mas-errada.

---

## Formato 1: História de Usuário

**Quando:** projeto tem usuário humano direto (recepcionista, médico, cliente, admin).

### Estrutura

```markdown
# {MODULO-ACAO}: {Título curto}

## 1. História de Usuário
**Como** {papel}, **Quero** {ação}, **Para que** {benefício}.

## 2. Contexto do Problema
{Por que essa demanda existe? Qual problema o usuário enfrenta hoje?}

## 3. Dependências
- Requer: [[outra-spec]] ({motivo})

## 4. Requisitos
- **REQ-{MODULO-ACAO}-01:** O sistema **deve** {comportamento 1}.
- **REQ-{MODULO-ACAO}-02:** O sistema **deve** {comportamento 2}.

## 5. Regras de Negócio
- **RN-{MODULO-ACAO}-01:** {restrição 1}.

## 6. Critérios de Aceite
**Cenário AC-{MODULO-ACAO}-01: {nome do cenário}**
**Dado que** {estado inicial}
**Quando** {ação}
**Então** {resultado esperado}

## 7. Fora do Escopo
- {O que NÃO faz parte desta entrega}

## 8. Notas Técnicas (opcional)
- {ex: endpoint POST /api/v1/agendamentos}
```

### Exemplo curto

```
# AGE-CRI: Criar agendamento

História: Como recepcionista, quero criar agendamento para paciente,
para que o paciente saiba quando virá ao consultório.

REQ-AGE-CRI-01: O sistema deve permitir criar agendamento com data,
                hora, paciente e médico.
RN-AGE-CRI-01:  Não pode haver dois agendamentos no mesmo horário
                para o mesmo médico.

AC-AGE-CRI-01: Criação com sucesso
  Dado paciente "João" e médico "Dr. Costa" cadastrados
  Quando criar agendamento para 20/05 14h
  Então mostrar "Agendamento criado" e listar na agenda do médico

AC-AGE-CRI-02: Conflito de horário
  Dado já existe agendamento para Dr. Costa em 20/05 14h
  Quando tentar criar outro nesse horário
  Então rejeitar com "horário indisponível"

Fora do escopo: notificação por email, agendamento recorrente.
```

### Spec Completeness Check (História)

Antes da spec sair pra implementação, ela DEVE passar neste checklist:

- [ ] Frase "Como X, Quero Y, Para Z" preenchida e clara
- [ ] Pelo menos 1 REQ descrevendo comportamento do sistema
- [ ] RNs descrevem restrições (não duplicam REQs)
- [ ] Cada AC é isolado, em BDD (Dado/Quando/Então), com resultado verificável
- [ ] Pelo menos 1 AC de caminho de erro ou borda (não só happy path)
- [ ] Fora do Escopo tem pelo menos 1 item
- [ ] Nenhum `[DÚVIDA: ...]` pendente
- [ ] Dependências verificadas contra specs existentes

---

## Formato 2: Feature Spec

**Quando:** módulo/feature técnica interna, sem UX direta. Ex: biblioteca, plugin, decorator, módulo plugável.

### Estrutura

```markdown
# {NOME}: {Título curto}

## 1. Propósito Técnico
{O que esse módulo faz do ponto de vista do sistema, sem referência a usuário final.}

## 2. Contrato Público
- **Expõe:** `{símbolo público}` ({propósito})
- **Não expõe:** {detalhes ocultados intencionalmente}

## 3. Integração
- **Consome:** `{dependência}` ({vem de qual módulo})
- **Publica eventos:** `{NomeDoEvento}` ({quando dispara})
- **Feature flag:** `{nome.da.flag}` (se plugável)

## 4. Requisitos Técnicos
- **REQ-{NOME}-01:** O módulo **deve** {comportamento técnico 1}.

## 5. Restrições Técnicas
- **RT-{NOME}-01:** {invariante 1}.

## 6. Critérios de Aceite Técnicos
**Cenário AC-{NOME}-01: {nome}**
**Dado** {estado técnico}
**Quando** {ação/chamada}
**Então** {resultado verificável}

## 7. Fora do Escopo
- {O que o módulo NÃO faz}

## 8. Dependências
- Requer: [[outro-modulo]]
```

### Exemplo curto

```
# RETRY: Retry com backoff exponencial

Propósito: adicionar retry automático em operações que falham com erro
transiente, sem caller implementar lógica própria.

Contrato Público:
- WithRetry(provider, policy) → Provider (decorator)
- RetryPolicy{ MaxAttempts, BaseDelay, RetryableErrors }

REQ-RETRY-01: O módulo deve aplicar backoff exponencial entre tentativas.
REQ-RETRY-02: O módulo deve lançar ErrRetryExhausted após esgotar tentativas.

RT-RETRY-01: O módulo não pode introduzir dependência externa.
RT-RETRY-02: O módulo não pode reentrar em erros não-transientes.

AC-RETRY-01: Retry com sucesso na 2ª tentativa
  Dado provider falha 1x e tem sucesso na 2ª
  Quando Publish(msg) for chamado
  Então retorno deve ser sucesso após o delay configurado
```

### Spec Completeness Check (Feature Spec)

- [ ] Propósito Técnico explica o **porquê técnico**, sem mencionar usuário final
- [ ] Contrato Público lista o que outros componentes podem assumir (interfaces/exports/decorators)
- [ ] Integração descreve consome/publica/eventos/feature flags relevantes
- [ ] REQs descrevem comportamentos do módulo (verbos: emitir, validar, retornar, persistir)
- [ ] RTs descrevem restrições/invariantes (não-comportamentos)
- [ ] Nenhum REQ duplica uma RT
- [ ] Cada AC é cenário técnico testável isolado
- [ ] Pelo menos 1 AC de borda ou erro
- [ ] Fora do Escopo preenchido
- [ ] Nenhum `[DÚVIDA: ...]` pendente

---

## Formato 3: Experiment Plan

**Quando:** validar uma hipótese arquitetural ou de produto. PoC, spike, A/B test, prova de padrão.

### Estrutura

```markdown
# {NOME}: {Título curto}

## 1. Hipótese
**HIP-{NOME}-01:** {afirmação falsificável em uma frase}

## 2. Contexto / Motivação
{Por que esse experimento agora. Que decisão maior depende dele.}

## 3. Procedimento
1. {passo de preparação}
2. {passo de execução}
3. {passo de coleta}

## 4. Critérios de Sucesso
- **CS-{NOME}-01:** {condição mensurável que confirma a hipótese}

## 5. Critérios de Falha
- **CF-{NOME}-01:** {condição que mata a hipótese}

## 6. Métricas Observadas
| Métrica | Como medir | Valor esperado |
|---|---|---|
| {métrica} | {instrumento} | {valor} |

## 7. Próximos Passos por Resultado
- Se confirmada: {ação}
- Se refutada: {ação}
- Se inconclusiva: {ação}
```

### Exemplo curto

```
# PLUGGABLE-BUILD: Build script suporta composição arbitrária de features

HIP-PLUGGABLE-BUILD-01: O build script consegue produzir artefato funcional
com qualquer subconjunto de features (0..N), sem código órfão.

Procedimento:
1. Build com features=[] → app só com core
2. Build com features=[auth] → endpoints de auth presentes
3. Build com features=[auth, billing] → ambos coexistem
4. Build com features=[billing] → nada de auth no bytecode final

CS-PLUGGABLE-BUILD-01: todos os 4 builds compilam
CS-PLUGGABLE-BUILD-02: build sem auth não tem classe auth.* no jar
CF-PLUGGABLE-BUILD-01: build com 2 features mostra efeito colateral entre elas
```

### Spec Completeness Check (Experiment Plan)

- [ ] Hipótese é uma frase **falsificável** (não "queremos explorar X")
- [ ] Procedimento é reproduzível por outra pessoa sem assistência
- [ ] CS (sucesso) são mensuráveis e definidos ANTES da execução
- [ ] CF (falha) são mensuráveis e definidos ANTES (evita viés de confirmação)
- [ ] Métricas têm coluna "como medir" preenchida
- [ ] Próximos passos cobrem 3 desfechos: confirmada / refutada / inconclusiva
- [ ] Nenhum `[DÚVIDA: ...]` pendente

---

## Formato 4: Contract Spec

**Quando:** definir contrato entre dois componentes (API, evento, schema, protocolo).

### Estrutura

```markdown
# {NOME}: {Título curto}

## 1. Partes
- **Publisher:** {módulo dono do contrato}
- **Consumidores:** {quem depende}

## 2. Schema
```json
{ "campo": "tipo" }
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|

## 3. Cláusulas
- **CL-{NOME}-01:** {regra sobre os dados}

## 4. Garantias
- **GAR-{NOME}-01:** **Entrega:** {at-least-once | at-most-once | exactly-once}
- **GAR-{NOME}-02:** **Ordem:** {garantida ou não}

## 5. Casos de Erro
| Cenário | Resposta esperada |
|---|---|

## 6. Versionamento
- Adições compatíveis: {ex: novo campo opcional}
- Quebras: {ex: remover campo}
```

### Exemplo curto

```
# USER-EVENTS: Eventos de domínio do módulo User

Publisher: módulo User
Consumidores: audit-log, notifications

Schema do evento UserLoggedIn:
{ userId: uuid, email: string, timestamp: iso8601, source: web|mobile|api }

CL-USER-EVENTS-01: userId é sempre UUID v4
CL-USER-EVENTS-02: timestamp em ISO-8601 UTC com timezone explícito

GAR-USER-EVENTS-01: Entrega at-least-once (consumidor deve ser idempotente)
GAR-USER-EVENTS-02: Ordem não garantida (use timestamp se precisar)
```

### Spec Completeness Check (Contract Spec)

- [ ] Publisher único identificado (sem ambiguidade de dono)
- [ ] Schema preenchido (ou aponta pra arquivo externo: OpenAPI, .proto, etc.)
- [ ] CLs descrevem regras dos dados (não comportamento do publisher)
- [ ] GARs são mensuráveis/observáveis (não promessa vaga)
- [ ] Pelo menos 3 casos de erro mapeados (validação, indisponibilidade, versão)
- [ ] Política de versionamento explícita
- [ ] Pelo menos 1 exemplo de sucesso e 1 de erro
- [ ] Nenhum `[DÚVIDA: ...]` pendente

---

## Como reconhecer o formato numa demanda colada

| Sinal no texto | Formato |
|---|---|
| "Como X, Quero Y, Para Z" + códigos REQ/RN/AC | História |
| "Propósito Técnico", "Contrato Público", códigos REQ + RT | Feature Spec |
| "Hipótese", códigos HIP/CS/CF, "Procedimento" | Experiment Plan |
| "Schema", "Publisher"/"Consumers", códigos CL/GAR | Contract Spec |
| Bullets soltos, sem códigos, sem estrutura | Texto livre, aplicar precisão antes de codar |

---

## Quando ajudar a construir uma spec

Se a demanda chegou como texto livre e está vaga, use a skill `formular-spec` pra construir uma spec interativamente antes de codar. Reduz alucinação e dá um artefato que o próprio dev pode anexar no card pra histórico.
