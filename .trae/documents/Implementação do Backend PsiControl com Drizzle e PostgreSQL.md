Vou implementar o backend do sistema utilizando **Drizzle ORM** com **PostgreSQL**, integrado ao **TanStack Start** (via server functions).

A implementação será dividida nas seguintes etapas:

1.  **Configuração do Banco de Dados**:
    - Instalação das dependências (`drizzle-orm`, `postgres`, `drizzle-kit`).
    - Criação do Schema do Drizzle (`src/db/schema.ts`) espelhando exatamente as tabelas SQL fornecidas (`pacientes`, `agendas`, `consultas`, `faturas`, etc.).
    - Configuração da conexão e do Drizzle Kit.

2.  **Implementação das Regras de Negócio (Services)**:
    Criarei uma camada de serviços em `src/server/services` para encapsular a lógica complexa:
    - **Pricing Service**: Implementação da **RN-01** (Prioridade) e **RN-02** (Vigência Histórica).
    - **Calendar Service**: Implementação da **RN-04** (Geração Dinâmica da Grade) e **RN-05**.
    - **Consultation Service**: Gestão do ciclo de vida (**RN-07** a **RN-10**) e Snapshot de Preço (**RN-03**).
    - **Billing Service**: Regras de faturamento e elegibilidade (**RN-11** a **RN-14**).

3.  **Server Functions**:
    - Exposição dessas funções para serem consumidas pelo Frontend.

**Nota Importante**: Como não tenho acesso a uma instância real do PostgreSQL rodando aqui, deixarei o código pronto e configurado. Você precisará apenas configurar a variável de ambiente `DATABASE_URL` no seu ambiente local (.env) para que o sistema funcione plenamente.
