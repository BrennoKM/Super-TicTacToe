# Guia de Contexto Técnico (Estrutura Obrigatória)

> Formato canônico do Guia de Contexto Técnico que toda entrega da Promptaria deve produzir.
> Usado por `implementar-demanda` (gera junto com o Guia de Validação) e colado no PR, no card e/ou repassado ao time.

---

## Por que existe

O Guia de Contexto Técnico resolve um problema diferente do Guia de Validação: enquanto o Guia de Validação fala com quem **valida comportamento** (QA, PM, cliente), este fala com quem **revisa código, investiga bug ou faz manutenção meses depois**. Sem ele, o revisor vira arqueólogo, precisa abrir migration, rastrear fluxo de chamada e adivinhar o que era intencional.

Toda entrega da Promptaria inclui este Guia, repassado junto com o de Validação. Vai pro corpo do PR, pro comentário do card no tracker (ClickUp/Jira/Linear) e/ou direto pra quem for revisar. Sem ele, a tarefa NÃO está pronta.

---

## As 6 seções obrigatórias

### 1. O que foi alterado
2-3 linhas. O que mudou no sistema. Não repita o título da task. Foque no **efeito técnico**: o que existia antes e o que existe agora.

Exemplo:
> "Adicionada coluna `scheduled_at` na tabela `appointments`. O `AppointmentsController` agora delega a validação de conflito de horário pro `SchedulingService`, que antes ficava espalhada em callbacks no model."

### 2. Referência da demanda
Link do card no tracker (ClickUp/Jira/Linear/GitHub Issues/etc.) OU código da spec (ex: `ASS-CRI`, `RETRY`, `PLUGGABLE-BUILD`).

Se a entrega rastreia critérios formais (REQ, RN, AC, RT, HIP, CS, CF, CL, GAR), liste os códigos entregues:

```
Card: <link do tracker>
Entrega: AC-ASS-CRI-01, AC-ASS-CRI-02, RN-ASS-CRI-01
```

### 3. Mudanças de dados (banco / migrations / schemas)

Pra cada migration ou alteração de schema criada, descreva:
- **Nome/identificador** (timestamp + slug, número da migration, etc.)
- **Operação** (ADD COLUMN, CREATE TABLE, ADD INDEX, DROP COLUMN, alteração de schema de evento, etc.)
- **Efeito em dados existentes**: destrutiva, não-destrutiva, ou requer backfill

Modelo:
```
Migration: 20260521120000_add_scheduled_at_to_appointments
  - ADD COLUMN scheduled_at TIMESTAMP NULL
  - Não-destrutiva. Registros existentes ficam com NULL.

Migration: 20260521120001_add_index_on_appointments_scheduled_at
  - ADD INDEX appointments_scheduled_at_idx
  - Não-destrutiva. Considerar executar fora do horário de pico em produção (LOCK TABLE).
```

Se não houver alteração: `sem alteração de schema`.

### 4. Fluxo de chamadas e integrações

Descreva o caminho técnico percorrido pela requisição, evento ou processo. Marque explicitamente o que foi **criado**, **alterado** ou **removido**. Use a notação que fizer sentido pra stack (rota HTTP, comando CLI, handler de evento, job, etc.).

Modelo (HTTP):
```
POST /api/v1/appointments
  → AppointmentsController#create   [alterado]
  → SchedulingService#book          [novo]
  → AppointmentRepository#create    [sem alteração]
  → NotificationJob (fila async)    [novo, dispara email]
```

Modelo (evento):
```
Evento: UserSignedUp
  → SignupHandler.handle             [alterado]
  → SendWelcomeEmailUseCase          [novo]
  → AnalyticsTracker.track           [sem alteração]
```

Se não houve alteração no fluxo: descreva o fluxo atual e marque `[sem alteração]` em cada etapa.

### 5. Validações aplicadas

Liste todas as regras de negócio, guards, checks de permissão e tratamento de erro implementados. Uma linha por regra. Se mapeia um código formal (RN, RT, CL), cite-o.

Modelo:
```
- RN-ASS-CRI-01: conflito de horário → 422 com mensagem "horário indisponível"
- Permissão: apenas perfil "recepcionista" pode criar agendamentos
- Guard: médico deve estar ativo; inativo → 422 "médico não disponível"
- Erro de persistência: captura exceção de constraint → 422 com erros serializados
```

Se não há validação nova: `sem validação nova, regras preexistentes não foram alteradas`.

### 6. Possíveis impactos colaterais

O que mais pode ser afetado **indiretamente**. Inclui: outras features que usam as mesmas classes/tabelas, jobs que podem ser disparados, índices que afetam queries existentes, caches que precisam ser invalidados, contratos públicos que outros consumidores leem.

Modelo:
```
- AppointmentsController#index: usa a mesma tabela. Index não afetado, mas considerar adicionar scheduled_at no serializer se necessário.
- RelatorioMensalJob: lê appointments. A nova coluna não quebra, mas pode ser usada futuramente.
- Cache de disponibilidade de médicos: não é invalidado por esta entrega. Se houver cache em camada superior, revisar.
```

Se nenhum: `sem impacto colateral identificado`.

---

## Checklist de qualidade do contexto técnico

Antes de declarar o guia pronto:

- [ ] Alguém sem contexto entende em 1 minuto o que mudou tecnicamente?
- [ ] Migrations/schemas têm o efeito em dados existentes descrito (destrutiva / não-destrutiva / backfill)?
- [ ] O fluxo de chamadas marca o que foi criado, alterado ou removido?
- [ ] Todas as validações e regras de negócio implementadas estão listadas?
- [ ] Impactos colaterais foram investigados (mesmo que a conclusão seja "nenhum")?

Se algum falha, o guia ainda não está pronto.
