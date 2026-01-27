## Plano de Implementação

### 1. Renomear Aba "Evolução" para "Registro de Sessões"
- Alterar labels e textos no componente EvolucaoList
- Corrigir toast messages de "Evolução salva!" para "Registro de sessão salvo!"

### 2. Criar Nova Aba "Evolução Mensal"
- Adicionar nova aba com editor de texto rico
- Implementar seleção de mês/ano
- Criar funções para salvar/carregar evolução mensal

### 3. Criar Nova Aba "Observações"
- Lista de observações independentes
- Form para criar nova observação
- Opção de vincular ou não a uma sessão

### 4. Backend Necessário
- Criar funções server para evolução mensal
- Criar funções server para observações
- Manter compatibilidade com estrutura existente

### Ordem das Abas:
1. Anamnese
2. Registro de Sessões (renomeada)
3. Evolução Mensal (nova)
4. Observações (nova)
5. Financeiro
6. Dados Cadastrais