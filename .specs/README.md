# Specs (histórico de decisões do projeto)

Diretório de specs e guias de validação/contexto técnico gerados durante o trabalho. **Versionado** (decisão específica deste projeto, revertendo a convenção padrão da Promptaria abaixo): não existe spec "oficial" em outro lugar (vault SDLC, tracker), então esta é a única cópia, e fica versionada pra quem for ajudar no projeto enxergar o histórico de decisões e specs sem precisar pedir contexto.

## Organização

Uma pasta por demanda, nome em maiúsculas (mesmo código usado na spec):

```
.specs/
├── RETRY/
│   ├── spec.md           ← rascunho da spec (gerado por formular-spec)
│   └── validacao.md      ← backup do Guia de Validação (gerado por implementar-demanda)
├── AGE-CRI/
│   ├── spec.md
│   └── validacao.md
└── USER-EVENTS/
    └── spec.md           ← (só spec, sem validação salva ainda)
```

Não tem subpastas obrigatórias. Se a demanda só gerou spec, só `spec.md`. Se só gerou validação, só `validacao.md`. Se gerou ambos, ambos.

## Pra quê serve cada arquivo

| Arquivo | Origem | Pra quê |
|---|---|---|
| `spec.md` | skill `formular-spec` quando você optou por salvar | Consultar a spec depois sem precisar voltar no card/vault |
| `validacao.md` | skill `implementar-demanda` (salvamento automático no Passo 5) | Backup local do Guia de Validação caso esqueça de colar no PR; recupera o histórico do trabalho |

## Quando usar

- Construir uma spec via skill `formular-spec` e querer guardar localmente
- O agente automaticamente salva `validacao.md` toda vez que gera um Guia de Validação. Você não precisa fazer nada, é backup
- Rascunhar variações de uma spec antes de levar pra discussão
- Anotar contexto local sobre uma demanda em andamento

## Convenção padrão da Promptaria (não aplicada aqui)

Por padrão, a Promptaria trata este diretório como rascunho local, gitignorado: a spec "oficial" mora upstream (vault SDLC, ClickUp/Jira/Linear) e o Guia de Validação vai no corpo do PR. Esse projeto não tem vault nem tracker externo, então essa premissa não vale: aqui, `.specs/` **é** o lugar oficial das specs, versionado de propósito.
