# Melhoria no CRUD de Agendamentos (Histórico e Soft Delete)

O objetivo desta tarefa é aprimorar o gerenciamento das agendas (recorrências), permitindo edições e exclusões que preservem o histórico de atendimentos passados ou removam a configuração completamente (via soft delete), conforme a escolha do usuário.

## Alterações Propostas

### 1. Camada de Serviço e Funções
- **AgendaService ([agenda.ts](file:///c:/Users/Administrador/workspace/psi-controll/src/server/services/agenda.ts))**:
    - Garantir que os métodos suportem a lógica de "Manter Histórico" vs "Sobrescrever/Excluir Tudo".
    - No modo **Manter Histórico** ao atualizar, a agenda antiga terá uma `dataFim` definida e uma nova agenda será criada.
    - No modo **Excluir Tudo**, será aplicado o **Soft Delete** (definindo `ativa = false`), ocultando a agenda mas preservando os dados no banco.
- **Server Functions ([agenda.ts](file:///c:/Users/Administrador/workspace/psi-controll/src/server/functions/agenda.ts))**:
    - Atualizar schemas Zod para incluir o campo `mode` ('history' | 'overwrite' ou 'history' | 'soft').
    - Adaptar as funções para chamar os serviços com o modo correto.

### 2. Interface do Usuário (UI)
- **Agenda Dashboard ([agenda.tsx](file:///c:/Users/Administrador/workspace/psi-controll/src/routes/dashboard/agenda.tsx))**:
    - **Gerenciar Agendas**: Adicionar botões de **Editar** e **Excluir** na tabela de gerenciamento.
    - **Diálogo de Confirmação**: Implementar perguntas claras ao usuário:
        - "Deseja manter o histórico?" ao editar ou excluir.
    - **Formulário de Edição**: Permitir alterar campos como dia, hora, frequência e valor.

### 3. Consistência de Dados
- Validar que consultas passadas continuam vinculadas às suas agendas originais.
- Garantir que o `CalendarService` não gere slots futuros para agendas encerradas ou desativadas.

Deseja que eu prossiga com a implementação?