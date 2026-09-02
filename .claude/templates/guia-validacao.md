# Guia de Validação (Estrutura Obrigatória)

> Formato canônico do Guia de Validação que toda entrega da Promptaria deve produzir.
> Usado por `implementar-demanda` (gera) e `validar-entrega` (infere a partir de trabalho de terceiro).

---

## Por que existe

O Guia de Validação resolve um problema comum: alguém recebe trabalho pra validar (em PR, branch ou entrega manual) sem saber **o que testar**, **como executar**, ou **o que NÃO testar**. Vira detetive, perde tempo, e frequentemente deixa passar coisa.

Toda entrega da Promptaria inclui esse Guia no corpo do PR (ou enviado pra quem for validar). Sem ele, a tarefa NÃO está pronta.

---

## As 8 seções obrigatórias

### 1. O que foi entregue
2-3 linhas. Quem ler em 30 segundos entende o que mudou.

### 2. Referência da demanda
Link do card no ClickUp/Jira/Linear OU código da spec (ex: `ASS-CRI`, `RETRY`, `PLUGGABLE-BUILD`).

### 3. Pré-requisitos
O que precisa estar configurado/cadastrado pra rodar o teste:
- Usuário a logar (com perfil/permissão)
- Dados a cadastrar antes (paciente X, plano Y, etc.)
- Variáveis de ambiente novas
- Migrations a rodar
- Feature flags a ligar

### 4. Como executar
URL exata, comando, rota, tela ou fluxo de UI. Evite "vá na tela de X". Diga o caminho clicável.

### 5. Cenários a validar
Um cenário por critério de aceite (AC/CS). Numere. Cada cenário tem passos numerados + resultado esperado verificável.

Modelo:

```
### 5.1 [Nome do cenário, ex: criar agendamento com sucesso]
Mapeia: AC-ASS-CRI-01 (se houver código formal)

Passos:
1. Logar como recepcionista (usuario-teste-01)
2. Clicar em "Novo agendamento"
3. Preencher: paciente "João Silva", médico "Dr. Costa", data "20/05 14h"
4. Clicar em "Salvar"

Resultado esperado:
- Mensagem "Agendamento criado com sucesso"
- Agendamento aparece na agenda do Dr. Costa na data
- Notificação enviada por email pro paciente
```

### 6. Cenários de borda e erro
O que tentar pra quebrar e como o erro DEVE aparecer. Inclui validações, conflitos, dados inválidos, permissão negada.

Modelo:

```
### 6.1 Conflito de horário
Passos: repetir cenário 5.1 com mesmo médico e horário
Esperado: erro "horário indisponível", agendamento NÃO criado

### 6.2 Sem permissão
Passos: logar como paciente e tentar acessar /agendamentos/novo
Esperado: redirect pra /login OU mensagem "acesso negado"
```

### 7. Fora do escopo (NÃO testar)
Itens explicitamente fora da entrega. Copie literalmente da seção "Fora do Escopo" da spec. Evita reportar como bug algo que era intencional.

Exemplo:
- Não foi feito: notificação por WhatsApp (próxima sprint)
- Não foi feito: agendamento recorrente

### 8. Como reverter
Se afeta dados, deploy ou config, descreva o rollback. Se não afeta, escreva "sem efeito colateral, basta reverter o merge".

Exemplos:
- "Reverter o merge desta PR. Migration X é não-destrutiva, pode ficar."
- "Reverter o merge + rodar `migration:rollback 20260521120000`."
- "Sem efeito colateral, basta reverter o merge."

---

## Checklist de qualidade do guia

Antes de declarar o guia pronto:

- [ ] Alguém que nunca viu a demanda consegue executar todos os cenários só com este guia?
- [ ] Os passos são reproduzíveis (dados específicos, não "um qualquer")?
- [ ] Cada cenário tem resultado esperado mensurável?
- [ ] "Fora do escopo" tá explícito?

Se algum falha, o guia ainda não está pronto.
