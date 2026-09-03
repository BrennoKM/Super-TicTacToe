---
name: gerenciar-memoria
description: Salva, atualiza e consulta conhecimento acumulado do projeto em dois lugares — memória LOCAL (.claude/memory/, gitignorada, pessoal do dev) e APRENDIZADOS COLETIVOS (seção no CLAUDE.md, versionada, compartilhada com o time). Use quando descobrir convenção, decisão, gotcha ou contexto não-óbvio que será útil em sessões futuras.
---

# Skill: gerenciar-memoria

Manter o conhecimento acumulado do projeto em dois lugares com propósitos distintos:

| Destino | Quem vê | Pra quê |
|---|---|---|
| `.claude/memory/` (gitignorado) | só você na sua máquina | preferências pessoais, notas de quem te explicou algo, contexto seu |
| Seção "Aprendizados do projeto" no `CLAUDE.md` (versionado) | todo o time | conhecimento que TODO dev/agente deveria saber pra não repetir erro |

A skill ajuda a decidir qual destino faz sentido pra cada descoberta.

## Quando usar

- Você descobriu algo durante a tarefa que será útil em sessões futuras (decisão, gotcha, convenção, contexto de domínio).
- O usuário disse: "salva isso pra lembrar depois", "memoriza essa decisão", "lembra que X funciona assim".
- O usuário disse: "esquece isso" ou "isso mudou" — atualizar/remover memória existente.
- O usuário disse: "o que a gente já sabe sobre X?" — consultar memórias relevantes.
- No início de uma tarefa, vale ler `MEMORY.md` (índice) pra checar se há memória relevante.

## Princípio operacional

Memória existe pra **reduzir alucinação em sessões futuras**, não pra documentar tudo. Critério pra salvar: *"se eu (ou outro agente) começasse uma sessão amanhã, isso seria útil saber sem precisar redescobrir?"*. Se sim, salva. Se for óbvio do código, não salva.

---

## Passo 1 — Identificar a operação

| Sinal | Operação |
|---|---|
| Descobriu algo durante a tarefa | Salvar |
| Usuário pediu "salva isso" | Salvar |
| Algo conhecido mudou (decisão, gotcha resolvido) | Atualizar |
| Algo deixou de ser verdade | Remover |
| Início de tarefa relevante | Ler (`MEMORY.md` + memórias pertinentes) |
| Usuário perguntou "o que sabemos sobre X" | Ler |

---

## Passo 2 — Salvar: escolher destino primeiro

Antes de classificar tipo ou criar arquivo, decida onde a informação mora. Pergunta ao usuário:

> *Essa informação é:*
> 1. **Específica de mim/desta máquina** (preferência minha, contexto que alguém me explicou, anotação pessoal) → vai pra `.claude/memory/` local
> 2. **Útil pra todo dev do projeto** (todo mundo deveria saber, evita o agente errar de novo) → vai pra seção "Aprendizados do projeto" no `CLAUDE.md` versionado

Sinais úteis pra decidir:

| Sinal | Destino sugerido |
|---|---|
| "Eu prefiro X" / "lembra de me explicar Y antes de fazer Z" | Local (`memory/`) |
| Termo do cliente que o agente confundiu | Coletivo (`CLAUDE.md`) |
| Padrão do código que não tá em ADR mas todo mundo segue | Coletivo (`CLAUDE.md`) |
| Pegadinha técnica do projeto que custou tempo | Coletivo (`CLAUDE.md`) |
| Senha, token, dado sensível | NUNCA salva (nem local nem coletivo) |

Confirme a escolha antes de prosseguir. Se a pessoa não souber, sugira coletivo (mais útil pro time).

---

## Passo 3 — Se destino LOCAL: salvar em `.claude/memory/`

### 3a. Classificar tipo

Use um dos 5 tipos definidos em `.claude/memory/README.md`:
- `decisao` — escolha técnica/arquitetural
- `gotcha` — pegadinha/armadilha
- `convencao` — padrão informal do time
- `dominio` — termo/regra do domínio do cliente
- `referencia` — onde achar coisa externa

### 3b. Escolher nome do arquivo

Formato: `{tipo}-{slug-curto}.md`. Exemplos:
- `gotcha-cache-invalida.md`
- `decisao-paginacao-cursor.md`
- `dominio-beneficiario-paciente.md`

Evite nomes vagos. `gotcha-erro.md` ❌ vs `gotcha-cache-invalida.md` ✓.

### 3c. Criar arquivo

Estrutura obrigatória:

```markdown
---
nome: {slug do arquivo}
tipo: {decisao | gotcha | convencao | dominio | referencia}
descricao: {uma linha, vai aparecer no índice}
criada_em: {YYYY-MM-DD}
atualizada_em: {YYYY-MM-DD}
---

{conteúdo direto ao ponto. Sem firula. Inclua:
- O que é
- Por quê (quando aplicável)
- Exemplo concreto (quando aplicável)
- Quando NÃO se aplica (se relevante)}
```

Salve em `.claude/memory/{nome-arquivo}.md`.

### 3d. Atualizar índice `MEMORY.md`

Adicione uma linha na seção apropriada do `MEMORY.md`:

```
- [Descrição curta da memória](nome-arquivo.md) — {tipo}
```

Se `MEMORY.md` não existir, crie com a estrutura:

```markdown
# Índice de Memórias — {{NOME_DO_PROJETO}}

Carregado pelo agente no início de toda tarefa relevante. Mantenha conciso (uma linha por memória).

## Decisões
- ...

## Gotchas
- ...

## Convenções
- ...

## Domínio
- ...

## Referências
- ...
```

---

## Passo 4 — Se destino COLETIVO: salvar em `CLAUDE.md` (seção "Aprendizados do projeto")

### 4a. Classificar tipo

Use uma das 3 subseções da seção "Aprendizados do projeto" no `CLAUDE.md`:

- **Domínio** — termo, jargão, regra de negócio do cliente que o agente costuma confundir
- **Convenção implícita** — padrão do código que não tá documentado em ADR mas todo mundo segue
- **Gotcha técnico** — pegadinha do projeto que custa tempo descobrir sozinho

Se não encaixar em nenhuma, talvez vire **regra inegociável de projeto** (em `.claude/regras-projeto.md`) ou seja contexto pessoal (vai pra memory/ local).

### 4b. Redigir o aprendizado

Formato:

```markdown
- **{título curto em negrito}** — {descrição prática em 1-2 frases, com exemplo concreto e/ou aviso "agente já errou isso antes"}
```

Exemplos bons:

```markdown
- **"Beneficiário" ≠ titular** — no jargão do cliente, "beneficiário" é o paciente que usa o plano, não quem assinou o contrato. Agente já errou esse termo várias vezes.
- **Endpoints de admin sempre `/admin/v1/`** — não documentado em ADR, mas padrão do código existente. Agente já criou `/api/v1/admin/` errado antes.
- **Cache invalida só em deploy, não em restart** — reiniciar o serviço local NÃO limpa cache. Use `make cache:clear` antes de testar.
```

### 4c. Adicionar ao CLAUDE.md

Abra o `CLAUDE.md`, vá na seção "Aprendizados do projeto", encontre a subseção apropriada (Domínio / Convenção implícita / Gotcha técnico), e adicione o item na lista.

Se a subseção tinha "_(nenhum aprendizado registrado ainda)_", remova esse texto e coloque o item no lugar.

### 4d. Confirmar e alertar sobre versionamento

Avisa quem solicita: *"Aprendizado adicionado ao `CLAUDE.md`. Esse arquivo **é versionado** — vai pro git e fica visível pra todo o time quando você commitar. Confere se tá tudo OK antes de commitar."*

---

## Passo 5 — Atualizar memória existente

**Se local (`.claude/memory/`):**
- Edite o arquivo `.md` diretamente
- Atualize o campo `atualizada_em`
- Se a descrição mudou, atualize o `descricao` no frontmatter E o texto do índice no `MEMORY.md`

**Se coletivo (CLAUDE.md):**
- Edite o item na seção "Aprendizados do projeto" diretamente
- Avise que `CLAUDE.md` mudou e vai pro git no próximo commit

---

## Passo 6 — Remover memória

**Se local:**
- Apague o arquivo `.md`
- Remova a linha correspondente do `MEMORY.md`
- Não deixe link quebrado no índice

**Se coletivo:**
- Remova o item da subseção em `CLAUDE.md`
- Se foi o último item da subseção, recolocar `_(nenhum aprendizado registrado ainda)_`

---

## Passo 7 — Ler memória (sob demanda)

**Coletivo (CLAUDE.md):** já carregado automaticamente em toda invocação. Releia a seção "Aprendizados do projeto" antes de tarefas relevantes.

**Local (`.claude/memory/`):**

No início de tarefa relevante:
1. Ler `MEMORY.md` (índice) — barato, sempre vale.
2. Identificar memórias possivelmente relevantes pela descrição.
3. Ler apenas as memórias que se aplicam ao contexto atual.

Quando o usuário perguntar "o que sabemos sobre X":
1. Procure no índice por entradas com X **e** na seção "Aprendizados do projeto" do CLAUDE.md.
2. Leia as memórias relevantes.
3. Sintetize a resposta. Se memórias se contradizem, sinalize e peça desempate.

---

## O que NÃO fazer

- **Não salvar o óbvio do código.** Se grep + leitura do arquivo responde, não vira memória.
- **Não duplicar.** Antes de salvar, conferir se já existe entrada sobre o mesmo tema (local OU coletivo).
- **Não salvar informação sensível** (senhas, tokens, dados de cliente identificáveis). Local mora no disco da máquina; coletivo vai pro git.
- **Não criar memória local sem entrada no índice.** Memória órfã não existe — o agente não vai achar na próxima sessão.
- **Não escrever memória vaga** ("X é importante"). Sempre concreto: o que, por quê, exemplo.
- **Não escolher destino errado.** Preferência pessoal NÃO vai pro CLAUDE.md (poluiria). Termo de domínio do projeto NÃO vai pra memory/ (perdia compartilhamento). Em dúvida, perguntar.
- **Não despejar aprendizados em massa no CLAUDE.md.** Cada item lá deve ser realmente útil pra todo mundo. Se virar lista de 30 itens, sinal pra refatorar (virar regra, virar comentário no código, ou ser ignorado por irrelevância).

---

## Notas sobre versionamento

A pasta `.claude/memory/` **não vai pro git** por padrão (é ignorada pelo `.gitignore` de `.claude/`). Decisão deliberada:

- **Privacidade:** evita que contexto de domínio (clientes, dados, decisões internas) vaze pro repo.
- **Personalização:** cada dev acumula sua própria leitura do projeto sem brigar em merge.
- **Simplicidade:** zero overhead de PR review pra mudanças de memória.

Quando o usuário quer **compartilhar conhecimento entre devs**, o canal correto é a seção "Aprendizados do projeto" no `CLAUDE.md` (versionada). Não tente reverter o gitignore pra "compartilhar memory/" — o `CLAUDE.md` existe exatamente pra isso e força a curadoria (cada item lá precisa valer a pena pra todos).
