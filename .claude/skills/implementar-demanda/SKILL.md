---
name: implementar-demanda
description: Fluxo completo pra transformar uma demanda colada em código mergeado. Reconhece o formato da spec (História/Feature/Experimento/Contrato ou texto livre), planeja com rastreabilidade obrigatória, implementa, testa, gera Guia de Validação, e entrega bloco copy-paste pra quem solicitou abrir o PR. Usa portões nomeados (Gates 1-4) entre fases — não avança se a fase anterior não passou.
---

# Skill: implementar-demanda

Fluxo completo pra transformar uma demanda colada em código mergeado, respeitando o nível de precisão da spec recebida.

## Quando usar

Quando alguém colar texto de uma demanda (vindo de ClickUp/Jira/Linear/etc.) e pedir pra implementar.

## Princípio operacional

A demanda pode chegar como **spec formal** (com códigos rastreáveis: REQ, RN, AC, RT, HIP, CS, CF, CL, GAR) ou como **texto livre**. O fluxo abaixo se adapta — mas o teste final é o mesmo: *"toda afirmação de comportamento na demanda está atendida pelo código e validada por teste?"*.

## Estrutura do fluxo

```
Passo 1 — Reconhecer formato
   🚪 Gate 1: Spec entendida + sem [DÚVIDA] pendente
Passo 2 — Planejar (com tabela de rastreabilidade)
   🚪 Gate 2: Plano aprovado por quem solicitou
Passo 3 — Implementar
Passo 4 — Testar
   🚪 Gate 3: Todos AC/CS cobertos por testes passando
Passo 5 — Gerar Guia de Validação + Guia de Contexto Técnico
   🚪 Gate 4: Ambos os guias passam no auto-checklist de qualidade
Passo 6 — Entregar bloco copy-paste do PR
Passo 7 — Cobertura final
```

Os **gates** (🚪) são portões obrigatórios entre fases. Se um gate falhar, o fluxo **trava**: o agente não avança até resolver. Cada gate tem critérios explícitos abaixo.

---

## Passo 1 — Reconhecer o formato

Antes de planejar, identifique qual tipo de spec foi colada. Veja a tabela em `CLAUDE.md` na seção "Como receber uma demanda".

### 1a. Se for spec formal (tem códigos REQ/RN/AC/RT/HIP/CS/CF/CL/GAR)

- Extraia todos os códigos presentes
- Cada código é um **contrato verificável** — ele deve aparecer no plano, no código (via comentário ou referência), e no teste
- Confira se a spec tem todos os elementos esperados pro formato:
  - **História:** REQ + RN + AC (BDD) + Fora do Escopo
  - **Feature Spec:** Propósito + Contrato Público + REQ + RT + AC + Fora do Escopo
  - **Experiment Plan:** Hipótese (HIP) + Procedimento + CS + CF + Métricas
  - **Contract Spec:** Schema + CL + GAR + Casos de Erro + Versionamento
- Se algum elemento essencial faltar, pergunte antes de seguir
- **Procure por marcadores `[DÚVIDA: ...]` na spec.** Se houver qualquer um, PARE imediatamente: liste todos pra quem solicita e peça resposta antes de seguir. Spec com `[DÚVIDA: ...]` não pode virar código (ver `.claude/processos/specs.md` seção do marcador)

### 1b. Se for texto livre

Extraia os mesmos campos manualmente:

- **Objetivo:** o que precisa ser feito (uma frase)
- **Critérios de aceite:** condições mensuráveis de "pronto"
- **Escopo:** o que ESTÁ e o que NÃO ESTÁ incluso
- **Restrições:** regras técnicas, dependências, prazos

Aplique o **teste de precisão**: *"se eu implementar isso, alguém pode dizer que ficou errado por interpretação diferente?"*. Se a resposta é sim:

- Se forem 1-2 perguntas pontuais → pergunte antes de codar
- Se faltar precisão em vários eixos (objetivo, escopo, critérios, etc.) → ofereça acionar a skill [`formular-spec`](../formular-spec/SKILL.md) pra construir a spec interativamente antes de codar. O resultado vira o input formal de volta pra este fluxo.

Nunca invente requisito pra preencher lacuna.

---

### 🚪 Gate 1 — Spec entendida

Não avance pro Passo 2 sem:
- [ ] Formato da spec identificado (formal ou texto livre)
- [ ] Se spec formal: todos os elementos esperados pro formato presentes
- [ ] Nenhum `[DÚVIDA: ...]` pendente na spec
- [ ] Se texto livre vago: ou foi clarificado, ou foi convertido em spec via `formular-spec`

Se algum item falha: PARE, peça resposta, **não avance**.

---

## Passo 2 — Salvar a spec localmente e planejar

### 2a. Salvar a spec em `.specs/` (OBRIGATÓRIO)

Antes de planejar qualquer coisa, garanta que a spec está salva localmente em:

```
.specs/{NOME-DA-DEMANDA}/spec.md
```

Onde `{NOME-DA-DEMANDA}` é o código da spec (ex: `RETRY`, `AGE-CRI`) ou, se não havia código formal, um slug derivado do título (ex: `corrigir-bug-login`).

- Se veio de `formular-spec`: o arquivo já existe, confirme o caminho e siga.
- Se a spec foi colada no chat: salve o conteúdo exato colado em `.specs/{NOME}/spec.md`. Crie a pasta se não existir. Se já existir arquivo, sobrescreva.
- Confirme ao usuário: *"Spec salva em `.specs/{NOME}/spec.md` como referência local (não vai pro git). Cole-a no card do tracker se ainda não estiver lá, pra o time ter acesso."*

> Esse passo existe pra que, ao final da entrega, `.specs/{NOME}/` tenha os três artefatos: `spec.md`, `validacao.md` e `contexto-tecnico.md` — tudo centralizado pra repassar pro time.

### 2b. Planejar

Apresente um plano curto contendo:

- Arquivos que serão criados/modificados
- Mudanças em banco (se houver)
- Testes que serão escritos
- Ordem de execução

### Tabela de Rastreabilidade (OBRIGATÓRIO se spec formal)

Pra cada código da spec (REQ, RN, AC, RT, HIP, CS, CF, CL, GAR), monte uma tabela explícita mapeando **código → onde será implementado → como será verificado**:

```
| Código             | Implementação                              | Verificação                                       |
|--------------------|--------------------------------------------|---------------------------------------------------|
| REQ-RETRY-01       | src/retry/policy.go (linhas 23-45)         | test/retry/policy_test.go::TestExponentialBackoff |
| REQ-RETRY-02       | src/retry/jitter.go                        | test/retry/jitter_test.go::TestJitterRange        |
| RT-RETRY-01        | (verificado por: linter custom-no-external)| go vet + script check-deps.sh                     |
| AC-RETRY-01        | (cenário coberto pela integração)          | test/retry/integration_test.go::TestSecondAttempt |
| AC-RETRY-02        | (cenário coberto pela integração)          | test/retry/integration_test.go::TestDLQOnExhaust  |
```

Regras da tabela:
- **Todo código formal precisa aparecer.** Se algum código não tem destino na tabela, o plano tá incompleto.
- **Toda linha da implementação volta pra um código.** Se aparece arquivo novo sem código associado, é especulação — vai pra Fora do Escopo ou vira spec separada.
- Restrições (RT, RN) podem ter "verificado por:" ao invés de arquivo (ex: ausência de import, regra de lint, code review manual).

Espere aprovação antes de começar a codar.

---

### 🚪 Gate 2 — Plano aprovado

Não avance pro Passo 3 sem:
- [ ] Spec salva em `.specs/{NOME}/spec.md`
- [ ] Tabela de rastreabilidade completa (se spec formal): todo código tem destino
- [ ] Lista de arquivos/mudanças concreta (sem "talvez", "provavelmente")
- [ ] Quem solicitou disse "OK, pode codar"

Se algum item falha: PARE, refine o plano, **não avance**.

---

## Passo 3 — Implementar

- Faça commits pequenos e atômicos seguindo o padrão de commit configurado em `CLAUDE.md → Padrão de commit`.
- **Sempre apresente o plano de commit e espere OK antes de rodar `git commit`.**
- Se a spec é formal, referencie os códigos na mensagem de commit quando aplicável (ex: `feat(auth): implementar REQ-LOGIN-01 e REQ-LOGIN-02`).
- Não pule etapas; se travar, pergunte.

---

## Passo 4 — Testar

- Rode os testes usando os comandos descritos em `CLAUDE.md → Como testar`.
- **Se spec formal:** garanta que cada AC/CS tem ao menos um teste correspondente. Cenário BDD da história/feature spec vira teste BDD; CS de experimento vira asserção mensurável.
- Se algum teste falhar, investigue o motivo real antes de mudar o teste.
- Não declare "pronto" se houver AC/CS sem teste correspondente.

---

### 🚪 Gate 3 — Testes cobrem a spec

Não avance pro Passo 5 sem:
- [ ] Todos os testes rodando passam (suíte limpa)
- [ ] Cada AC/CS tem ao menos um teste correspondente
- [ ] Cada restrição (RN/RT/CL) verificada (por teste, lint ou observação clara)

Se algum item falha: PARE, complete cobertura, **não avance**.

---

## Passo 5 — Gerar Guia de Validação + Guia de Contexto Técnico (OBRIGATÓRIO)

> Sem ambos os guias, a tarefa NÃO está pronta. Esse passo não é opcional.
>
> O **Guia de Validação** fala com quem valida comportamento (QA, PM, cliente).
> O **Guia de Contexto Técnico** fala com quem revisa código ou faz manutenção depois.
> Os dois se complementam, nenhum substitui o outro.

### 5a. Guia de Validação

Produza um Guia de Validação seguindo a estrutura definida em [`.claude/templates/guia-validacao.md`](../../templates/guia-validacao.md). Ele responde 8 seções obrigatórias:

1. **O que foi entregue** — 2-3 linhas, direto.
2. **Referência da demanda** — link do card ou código da spec.
3. **Pré-requisitos** — usuário a logar, dados cadastrados antes, env vars, migrations, feature flags.
4. **Como executar** — URL exata, comando, rota, tela, fluxo de UI.
5. **Cenários a validar** — um por AC/CS (numere). Passos + resultado esperado verificável.
6. **Cenários de borda/erro** — o que tentar pra quebrar, como o erro deve aparecer.
7. **Fora do escopo (NÃO testar)** — copie da seção "Fora do Escopo" da spec.
8. **Como reverter** — rollback se aplicável; "sem efeito colateral" caso contrário.

Detalhes completos de cada seção (com exemplos): veja [`.claude/templates/guia-validacao.md`](../../templates/guia-validacao.md).

### Teste de qualidade do guia (auto-checklist)

Antes de declarar o guia pronto, valide:

- [ ] Alguém que NUNCA viu essa demanda consegue executar todos os cenários só com o guia?
- [ ] Os passos são reproduzíveis (dados específicos, não "um paciente qualquer")?
- [ ] Cada cenário tem resultado esperado mensurável (não "deve funcionar")?
- [ ] "Fora do escopo" tá explícito pra não gerar bug-fantasma?

Se algum item falhar, o guia ainda não está pronto.

### 5b. Guia de Contexto Técnico

Produza também um Guia de Contexto Técnico seguindo a estrutura definida em [`.claude/templates/guia-contexto-tecnico.md`](../../templates/guia-contexto-tecnico.md). Ele responde 6 seções obrigatórias:

1. **O que foi alterado** — efeito técnico, antes vs depois.
2. **Referência da demanda** — link do card + códigos formais entregues.
3. **Mudanças de dados** — migrations/schemas com efeito em dados existentes.
4. **Fluxo de chamadas e integrações** — rota/evento/job marcando novo/alterado/removido.
5. **Validações aplicadas** — RN, RT, guards, permissões, tratamento de erro.
6. **Possíveis impactos colaterais** — features, jobs, índices, caches afetados indiretamente.

Detalhes completos com exemplos: veja [`.claude/templates/guia-contexto-tecnico.md`](../../templates/guia-contexto-tecnico.md).

### Teste de qualidade dos guias (auto-checklist)

Antes de declarar os guias prontos, valide ambos:

**Guia de Validação:**
- [ ] Alguém que NUNCA viu essa demanda consegue executar todos os cenários só com o guia?
- [ ] Os passos são reproduzíveis (dados específicos, não "um qualquer")?
- [ ] Cada cenário tem resultado esperado mensurável (não "deve funcionar")?
- [ ] "Fora do escopo" tá explícito pra não gerar bug-fantasma?

**Guia de Contexto Técnico:**
- [ ] Alguém sem contexto entende em 1 minuto o que mudou tecnicamente?
- [ ] Migrations/schemas têm o efeito em dados existentes descrito?
- [ ] O fluxo de chamadas marca o que foi criado, alterado ou removido?
- [ ] Todas as validações implementadas estão listadas?
- [ ] Impactos colaterais foram investigados (mesmo que "nenhum")?

Se algum item falhar, o guia ainda não está pronto.

### Backup local automático (OBRIGATÓRIO)

Depois dos guias passarem no auto-checklist, **salve cópias locais** em:

```
.specs/{NOME-DA-DEMANDA}/validacao.md
.specs/{NOME-DA-DEMANDA}/contexto-tecnico.md
```

Onde `{NOME-DA-DEMANDA}` é o código da spec (ex: `RETRY`, `AGE-CRI`) ou, se a demanda não tinha código formal, um slug derivado do título (ex: `corrigir-bug-login`).

- Se a pasta `.specs/{NOME}/` não existir, crie.
- Se já existir arquivo no destino (re-execução), sobrescreva, esta versão é a mais recente.
- Confirme ao usuário: *"Guias salvos em `.specs/{NOME}/validacao.md` e `.specs/{NOME}/contexto-tecnico.md`. Junto com a `spec.md` (salva no Passo 2), os três artefatos estão em `.specs/{NOME}/`. Cole os três no card do tracker e no PR pra o time ter acesso: a spec pra quem vai fazer code review, o de Validação pra quem vai testar, e o de Contexto Técnico pra quem for revisar código ou fazer manutenção depois."*

---

### 🚪 Gate 4 — Guias completos

Não avance pro Passo 6 sem:
- [ ] Todas as 8 seções do Guia de Validação preenchidas (sem "TBD" ou placeholder)
- [ ] Todas as 6 seções do Guia de Contexto Técnico preenchidas
- [ ] Auto-checklist de qualidade dos dois guias 100%
- [ ] Cenários de validação têm dados específicos
- [ ] Fora do escopo explícito no Guia de Validação
- [ ] Backups locais salvos em `.specs/{NOME}/validacao.md` e `.specs/{NOME}/contexto-tecnico.md`

Se algum item falha: PARE, refine, **não avance**.

---

## Passo 6 — Entregar o PR (o agente prepara, quem solicitou executa)

**Princípio:** o agente NÃO faz `git push` nem cria PR sozinho. Operações que publicam algo externo são responsabilidade de quem solicitou. O agente **prepara tudo prontinho pra copiar/colar** e instrui passo a passo.

### 6a. Preparar artefatos

Monte localmente:
- **Nome da branch** seguindo o padrão descrito em `CLAUDE.md → Padrão de branch` (criar a branch local com `git checkout -b` é OK, é local)
- **Título do PR** — curto, descreve a entrega (não copie título do card; resuma o que mudou)
- **Corpo do PR** — o Guia de Validação + Guia de Contexto Técnico do Passo 5, concatenados (Validação primeiro, Contexto Técnico abaixo, com separador). Seguir [`.claude/templates/guia-validacao.md`](../../templates/guia-validacao.md) e [`.claude/templates/guia-contexto-tecnico.md`](../../templates/guia-contexto-tecnico.md)

### 6b. Entregar como bloco copy-paste

Apresente ao usuário, em um único bloco escaneável:

```
─────────────────────────────────────────────────────
✓ Tudo pronto pra abrir o PR. Faça assim:

1. Push da branch (rode no terminal):

   git push -u origin <nome-da-branch>

2. Abrir o PR — escolha um caminho:

   CAMINHO A — Pelo navegador (mais comum):
   - Acesse: https://github.com/<org>/<repo>/compare/<branch-base>...<nome-da-branch>
   - Cole o TÍTULO abaixo
   - Cole o CORPO abaixo na descrição
   - Clique "Create pull request"

   CAMINHO B — Pelo terminal (só se já usa `gh` CLI):
   gh pr create --base <branch-base> --head <nome-da-branch> \
     --title "<título>" --body-file pr-body.md
   (salve o corpo num arquivo pr-body.md antes)

3. RECOMENDADO — postar os Guias também no comentário do card original
   (ClickUp/Jira/Linear). Quem for validar/revisar consegue acompanhar
   sem precisar abrir a PR. Cole o CORPO abaixo como comentário no card.
   Se o tracker tiver campo personalizado pra "prova de desenvolvimento"
   ou "contexto técnico", cole a parte de Contexto Técnico lá separada.

─────────────────────────────────────────────────────
TÍTULO:
<título sugerido>

─────────────────────────────────────────────────────
CORPO (Guia de Validação + Guia de Contexto Técnico, concatenados):
<corpo do PR, pronto pra colar>
─────────────────────────────────────────────────────

📁 Artefatos locais salvos em .specs/<NOME>/:
   spec.md             (a spec de origem)
   validacao.md        (guia pra quem testa)
   contexto-tecnico.md (guia pra quem revisa código)
   Cole os três no card do tracker e no PR pra o time enxergar.
   (esses arquivos não vão pro git, são só backup local)
```

> Sobre `gh`: é o GitHub CLI, ferramenta opcional que cria PR pelo terminal. Se não souber o que é, ignore e use o caminho A (navegador).

### 6c. Aguardar e confirmar

Após entregar o bloco, espere o usuário fazer o push + criar o PR. Quando ele retornar com a URL do PR (ou disser "feito"), confirme que o fluxo terminou.

### 6d. (Opcional) Auxiliar o push

Se o usuário pedir explicitamente *"faz o push pra mim"* ou *"roda o git push"*, o agente pode rodar — mas **NUNCA por iniciativa própria**. Push é decisão de quem solicitou.

---

## Passo 7 — Cobertura final (checklist antes de declarar "pronto")

Independente do formato da spec:

- [ ] Cada item mensurável da spec (AC, CS, garantia) tem teste correspondente passando
- [ ] Cada restrição (RN, RT, CL) está respeitada no código (não há violação visível)
- [ ] Itens de "Fora do Escopo" não foram tocados
- [ ] **Guia de Validação produzido no Passo 5 e entregue no Passo 6**
- [ ] **Guia de Contexto Técnico produzido no Passo 5 e entregue no Passo 6**
- [ ] **Três artefatos salvos em `.specs/{NOME}/`: `spec.md`, `validacao.md`, `contexto-tecnico.md`**
- [ ] Bloco copy-paste do PR (título + corpo + instruções) entregue
- [ ] Instrução pra postar spec + guias no card do tracker (não só no PR) foi dada
- [ ] Nenhum hook foi pulado sem permissão
- [ ] Nenhum `git push` foi rodado pelo agente sem pedido explícito do usuário

---

## O que NÃO fazer

- **Não especular features.** Se você se pegou pensando "talvez precise de X", "vai ser útil ter Y", "já que tô aqui vou adicionar Z" — PARE. Toda linha de código produzida deve rastrear de volta a um REQ/AC/RT da spec. Sugestão extra vai pra Fora do Escopo OU vira proposta de spec separada. Especulação é a forma mais comum de scope creep e bug.
- Não adicionar funcionalidades fora do escopo da demanda.
- Não refatorar código não relacionado "de quebra".
- Não commitar arquivos sensíveis (.env, credenciais).
- Não fazer force push em branches compartilhadas.
- Não tratar texto livre como spec completa — sempre aplicar teste de precisão antes.
- Não ignorar códigos formais da spec — eles são contrato, não decoração.
- **Não declarar "pronto" sem Guia de Validação E Guia de Contexto Técnico produzidos e entregues.**
- Não escrever guia genérico tipo "testar a funcionalidade" ou "mudei o controller", guia ruim é igual a não ter guia.
- **Não rodar `git push` por iniciativa própria.** Push é decisão de quem solicitou; o agente entrega o comando pronto pra copiar.
- **Não criar PR via `gh` ou API por iniciativa própria.** O agente entrega o título + corpo + URL de criação manual.
- **Não codar com `[DÚVIDA: ...]` pendente na spec.** Lacuna marcada = bloqueio ativo; resolver antes.
