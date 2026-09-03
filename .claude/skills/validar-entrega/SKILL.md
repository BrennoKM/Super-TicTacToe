---
name: validar-entrega
description: Gera um Guia de Validação a partir de trabalho feito por terceiro (PR sem roteiro de teste, branch alheia, entrega manual). Lê o diff, infere intenção a partir de testes/commits/contexto, e produz Guia pronto pra colar no PR ou enviar pra quem for validar. Sinaliza incertezas pra o autor confirmar.
---

# Skill: validar-entrega

Produzir um Guia de Validação a partir de trabalho feito por terceiro (outra pessoa, outro time, ou até trabalho próprio anterior sem guia). Útil pra receber PR sem roteiro de teste e produzir um.

## Quando usar

- "Valida pra mim essa PR" + link/branch/diff
- "O que eu testo nessa entrega?" + contexto do que foi feito
- "Faz um roteiro de teste pra essa branch"
- Alguém recebeu trabalho sem o Guia de Validação obrigatório e precisa produzir um

## Princípio operacional

Diferente do `implementar-demanda`, aqui você **não codou**. Você é detetive: lê o diff, lê o card original (se houver), lê os testes existentes, e infere o que precisa ser validado. O resultado tem o mesmo formato do Guia de Validação definido em [`.claude/templates/guia-validacao.md`](../../templates/guia-validacao.md).

Se ficar muito incerto sobre intenção, **pergunte** antes de produzir o guia — guia inventado é pior que sem guia.

---

## Passo 1 — Coletar contexto

Reúna o máximo de fontes disponíveis:

- **Diff** — `git diff main..branch` ou ler arquivos da PR
- **Demanda original** — se houver link de card/spec, leia
- **Mensagens de commit** — descrevem intenção do autor
- **Descrição da PR** — mesmo que vazia, vale checar
- **Testes adicionados/modificados** — revelam o que o autor considera "pronto"
- **Migrations/scripts** — sinalizam efeito em dados
- **Mudanças em config/env** — sinalizam pré-requisitos

Se acesso a algum desses é limitado, peça pro usuário colar/linkar.

---

## Passo 2 — Mapear o que foi entregue

Em 1 parágrafo, escreva: *"essa entrega faz X. Toca Y arquivos em Z áreas. Adiciona/remove A endpoints e B campos."*

Se você não consegue escrever esse parágrafo com certeza, **pause** e peça mais contexto. Não advinhe.

---

## Passo 3 — Identificar critérios verificáveis

Liste o que precisa funcionar pra entrega ser considerada correta. Fontes:

- **Se há demanda formal** (história/feature spec/etc.): AC e CS viram critérios
- **Se há testes novos**: cada teste é evidência de um critério
- **Se nada disso**: extraia do diff — quais comportamentos novos foram adicionados? Quais bugs foram corrigidos?

Codifique cada critério como cenário a ser testado.

---

## Passo 4 — Identificar bordas e cenários de erro

Pra cada cenário do Passo 3, pense:
- Qual entrada inválida quebra isso?
- Qual condição de borda foi tratada (ou não)?
- Qual cenário de permissão/autorização aplica?

Inclui no guia mesmo que o autor não tenha testado — se faltar, vira recomendação de teste manual.

---

## Passo 5 — Identificar pré-requisitos

Do diff e config, extraia:
- Migrations a rodar
- Env vars novas
- Feature flags
- Dados de seed/teste necessários
- Usuário/perfil pra logar

Se ambiguidade, perguntar.

---

## Passo 6 — Identificar fora do escopo

Se houver demanda formal com "Fora do Escopo", copie literalmente.
Se não houver, **liste explicitamente o que essa entrega NÃO faz**, mesmo que pareça óbvio — evita reportar bug-fantasma.

Exemplo: PR que adiciona endpoint de criação não necessariamente adiciona edição. Se não adicionou, declarar.

---

## Passo 7 — Identificar como reverter

Do diff, infira:
- Há migration destrutiva? → rollback específico
- Há mudança em dado existente? → script de reversão ou aviso
- Mudança puramente em código? → reverter merge basta

---

## Passo 8 — Gerar o guia

Use o mesmo formato definido em [`.claude/templates/guia-validacao.md`](../../templates/guia-validacao.md). As 8 seções obrigatórias:

1. O que foi entregue
2. Referência da demanda
3. Pré-requisitos
4. Como executar
5. Cenários a validar
6. Cenários de borda e erro
7. Fora do escopo (NÃO testar)
8. Como reverter

Entregue ao usuário como bloco markdown delimitado por separadores, pronto pra copiar e colar:

```
─────────────────────────────────────────────────────
GUIA DE VALIDAÇÃO (cole na descrição/comentário do PR):
<guia completo>
─────────────────────────────────────────────────────
```

**Não poste por conta própria** em PR/issue/comentário externo. Se a entrega está num PR e o usuário quer postar o guia como comentário, instrua:

- **Pelo navegador:** abrir a PR no GitHub → rolar até "Add a comment" → colar o guia → "Comment"
- **Pelo terminal (só se já usa `gh` CLI):** `gh pr comment <URL-ou-numero> --body-file guia.md` (salve o guia num arquivo primeiro)

> `gh` é o GitHub CLI, ferramenta opcional pra interagir com PRs/issues pelo terminal. Se não souber o que é, ignore e use o navegador.

Só rode `gh pr comment` se o usuário pedir explicitamente.

---

## Passo 9 — Sinalizar incertezas

Se durante a análise ficaram dúvidas que você não conseguiu resolver, liste no final do guia em uma seção `## ⚠ Incertezas pro autor confirmar`. Exemplos:
- "Não está claro se a mudança em `UserRepository.findByEmail` foi intencional — autor confirma?"
- "Pré-requisito de feature flag inferido do código, mas não vi documentação — confere?"

Isso **não desqualifica o guia** — sinaliza honestamente o que foi inferido vs confirmado.

---

## O que NÃO fazer

- Não inventar critérios que não estão no diff/spec/testes.
- Não produzir guia genérico ("testar a feature") — se não dá pra ser específico, peça mais contexto.
- Não pular o teste de qualidade do guia (mesmo checklist do PR template).
- Não esquecer de declarar "Fora do escopo" — é o que mais previne falso-positivo na validação.
- **Não postar o guia em PR/issue/comentário por iniciativa própria** — sempre entregar pra quem solicitou copiar.
