import {
  boolean,
  date,
  decimal,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Enums
export const frequenciaEnum = pgEnum('frequencia', [
  'unica',
  'semanal',
  'quinzenal',
  'mensal',
])
export const statusConsultaEnum = pgEnum('status_consulta', [
  'agendada',
  'confirmada',
  'realizada',
  'cancelada',
  'falta',
])
export const statusFaturaEnum = pgEnum('status_fatura', [
  'aberta',
  'paga',
  'cancelada',
])

// 1. Configurações
export const configuracoes = pgTable('configuracoes', {
  id: integer('id').primaryKey().default(1),
  nomePsicologo: varchar('nome_psicologo', { length: 100 }),
  crp: varchar('crp', { length: 20 }),
  contatoClinica: varchar('contato_clinica', { length: 100 }),
})

// 2. Pacientes
export const pacientes = pgTable('pacientes', {
  id: serial('id').primaryKey(),
  nomeCompleto: varchar('nome_completo', { length: 100 }).notNull(),
  cpf: varchar('cpf', { length: 14 }).unique(),
  telefone: varchar('telefone', { length: 20 }).notNull(),
  email: varchar('email', { length: 100 }),
  dataNascimento: date('data_nascimento'),
  endereco: text('endereco'),
  contatoEmergencia: varchar('contato_emergencia', { length: 100 }),
  telefoneEmergencia: varchar('telefone_emergencia', { length: 20 }),
  profissao: varchar('profissao', { length: 100 }),
  estadoCivil: varchar('estado_civil', { length: 50 }),
  genero: varchar('genero', { length: 50 }),
  observacoes: text('observacoes'),
  dataCadastro: timestamp('data_cadastro').defaultNow(),
})

export const responsaveis = pgTable('responsaveis', {
  id: serial('id').primaryKey(),
  pacienteId: integer('paciente_id')
    .notNull()
    .references(() => pacientes.id, { onDelete: 'cascade' }),
  nome: varchar('nome', { length: 100 }).notNull(),
  cpf: varchar('cpf', { length: 14 }),
  telefone: varchar('telefone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  endereco: text('endereco'),
  financeiro: boolean('financeiro').default(false),
})

// 3. Sistema de Preços
export const categoriasPreco = pgTable('categorias_preco', {
  id: serial('id').primaryKey(),
  nome: varchar('nome', { length: 50 }).notNull(),
  descricao: varchar('descricao', { length: 100 }),
  ativo: boolean('ativo').default(true),
})

export const valoresPreco = pgTable('valores_preco', {
  id: serial('id').primaryKey(),
  categoriaId: integer('categoria_id')
    .notNull()
    .references(() => categoriasPreco.id),
  valor: decimal('valor', { precision: 10, scale: 2 }).notNull(),
  dataInicio: date('data_inicio').notNull(),
  dataFim: date('data_fim'),
  criadoEm: timestamp('criado_em').defaultNow(),
})

// 4. Agendas
export const agendas = pgTable(
  'agendas',
  {
    id: serial('id').primaryKey(),
    pacienteId: integer('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    frequencia: frequenciaEnum('frequencia').default('semanal'),
    diaSemana: integer('dia_semana'), // 0=Dom...6=Sab
    hora: time('hora').notNull(),
    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim'),
    valorFixo: decimal('valor_fixo', { precision: 10, scale: 2 }),
    categoriaPrecoId: integer('categoria_preco_id').references(
      () => categoriasPreco.id,
    ),
    ativa: boolean('ativa').default(true),
    observacoes: text('observacoes'),
  },
  (table) => ({
    // uniqueActiveSchedule constraint removed to allow history (multiple active rows with different date ranges)
    // Overlaps are handled by application logic in AgendaService.checkConflict
  }),
)

// 5. Prontuário
export const anamnese = pgTable('anamnese', {
  id: serial('id').primaryKey(),
  pacienteId: integer('paciente_id')
    .notNull()
    .references(() => pacientes.id, { onDelete: 'cascade' }),
  dataPreenchimento: timestamp('data_preenchimento').defaultNow(),
  queixaPrincipal: text('queixa_principal'),
  historicoMedico: text('historico_medico'),
  medicamentos: text('medicamentos'),
})

export const evolucaoAtendimento = pgTable('evolucao_atendimento', {
  id: serial('id_evolucao').primaryKey(),
  prontuarioId: integer('id_prontuario')
    .notNull()
    .references(() => pacientes.id, { onDelete: 'cascade' }),
  dataAtendimento: timestamp('data_atendimento').notNull(),
  procedimentosUtilizados: text('procedimentos_utilizados').notNull(),
  intervencoesRealizadas: text('intervencoes_realizadas').notNull(),
  informacoesRelevantes: text('informacoes_relevantes').notNull(),
  criadoEm: timestamp('criado_em').defaultNow(),
})

// 6. Consultas
export const consultas = pgTable(
  'consultas',
  {
    id: serial('id').primaryKey(),
    agendaId: integer('agenda_id')
      .notNull()
      .references(() => agendas.id),
    dataPrevista: timestamp('data_prevista').notNull(),
    dataRealizacao: timestamp('data_realizacao'),
    valorCobrado: decimal('valor_cobrado', {
      precision: 10,
      scale: 2,
    }).notNull(),
    status: statusConsultaEnum('status').default('agendada'),
    cobrarFalta: boolean('cobrar_falta').default(false),
    historico: json('historico').$type<Array<string>>(),
    observacoes: text('observacoes'),
  },
  (table) => ({
    agendaDataIdx: index('consultas_agenda_data_idx').on(
      table.agendaId,
      table.dataPrevista,
    ),
  }),
)

// 7. Faturamento
export const faturas = pgTable('faturas', {
  id: serial('id').primaryKey(),
  pacienteId: integer('paciente_id')
    .notNull()
    .references(() => pacientes.id),
  dataEmissao: date('data_emissao').notNull(),
  dataVencimento: date('data_vencimento'),
  valorTotal: decimal('valor_total', { precision: 10, scale: 2 }).notNull(),
  desconto: decimal('desconto', { precision: 10, scale: 2 }).default('0'),
  status: statusFaturaEnum('status').default('aberta'),
  observacoes: text('observacoes'),
})

export const faturaItens = pgTable('fatura_itens', {
  id: serial('id').primaryKey(),
  faturaId: integer('fatura_id')
    .notNull()
    .references(() => faturas.id),
  consultaId: integer('consulta_id')
    .notNull()
    .unique()
    .references(() => consultas.id),
  valorItem: decimal('valor_item', { precision: 10, scale: 2 }).notNull(),
})

// 8. Auth (Better Auth)
export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull()
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(()=> user.id)
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(()=> user.id),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull()
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at")
});

// 9. Evolução Mensal
export const evolucaoMensal = pgTable('evolucao_mensal', {
  id: serial('id').primaryKey(),
  pacienteId: integer('paciente_id')
    .notNull()
    .references(() => pacientes.id, { onDelete: 'cascade' }),
  mes: integer('mes').notNull(), // 1-12
  ano: integer('ano').notNull(),
  texto: text('texto').notNull(),
  dataCriacao: timestamp('data_criacao').defaultNow(),
  dataAtualizacao: timestamp('data_atualizacao').defaultNow(),
})

// 10. Observações da Psicóloga
export const observacoes = pgTable('observacoes', {
  id: serial('id').primaryKey(),
  pacienteId: integer('paciente_id')
    .notNull()
    .references(() => pacientes.id, { onDelete: 'cascade' }),
  sessaoId: integer('sessao_id')
    .references(() => consultas.id, { onDelete: 'set null' }),
  texto: text('texto').notNull(),
  dataCriacao: timestamp('data_criacao').defaultNow(),
  dataAtualizacao: timestamp('data_atualizacao').defaultNow(),
})

// 8. Pagamentos
export const pagamentos = pgTable('pagamentos', {
  id: serial('id').primaryKey(),
  faturaId: integer('fatura_id')
    .notNull()
    .references(() => faturas.id),
  dataPagamento: date('data_pagamento').notNull(),
  valorPago: decimal('valor_pago', { precision: 10, scale: 2 }).notNull(),
  formaPagamento: varchar('forma_pagamento', { length: 50 }),
  observacoes: text('observacoes'),
})

// RELATIONS
export const pacientesRelations = relations(pacientes, ({ many }) => ({
  agendas: many(agendas),
  faturas: many(faturas),
  anamnese: many(anamnese),
  evolucoes: many(evolucaoAtendimento),
  responsaveis: many(responsaveis),
  evolucaoMensal: many(evolucaoMensal),
  observacoes: many(observacoes),
}))

export const responsaveisRelations = relations(responsaveis, ({ one }) => ({
  paciente: one(pacientes, {
    fields: [responsaveis.pacienteId],
    references: [pacientes.id],
  }),
}))

export const agendasRelations = relations(agendas, ({ one, many }) => ({
  paciente: one(pacientes, {
    fields: [agendas.pacienteId],
    references: [pacientes.id],
  }),
  categoriaPreco: one(categoriasPreco, {
    fields: [agendas.categoriaPrecoId],
    references: [categoriasPreco.id],
  }),
  consultas: many(consultas),
}))

export const consultasRelations = relations(consultas, ({ one }) => ({
  agenda: one(agendas, {
    fields: [consultas.agendaId],
    references: [agendas.id],
  }),
}))

export const faturasRelations = relations(faturas, ({ one, many }) => ({
  paciente: one(pacientes, {
    fields: [faturas.pacienteId],
    references: [pacientes.id],
  }),
  itens: many(faturaItens),
  pagamentos: many(pagamentos),
}))

export const faturaItensRelations = relations(faturaItens, ({ one }) => ({
  fatura: one(faturas, {
    fields: [faturaItens.faturaId],
    references: [faturas.id],
  }),
  consulta: one(consultas, {
    fields: [faturaItens.consultaId],
    references: [consultas.id],
  }),
}))

export const categoriasPrecoRelations = relations(
  categoriasPreco,
  ({ many }) => ({
    valores: many(valoresPreco),
    agendas: many(agendas),
  }),
)

export const valoresPrecoRelations = relations(valoresPreco, ({ one }) => ({
  categoria: one(categoriasPreco, {
    fields: [valoresPreco.categoriaId],
    references: [categoriasPreco.id],
  }),
}))

export const pagamentosRelations = relations(pagamentos, ({ one }) => ({
  fatura: one(faturas, {
    fields: [pagamentos.faturaId],
    references: [faturas.id],
  }),
}))

export const evolucaoMensalRelations = relations(evolucaoMensal, ({ one }) => ({
  paciente: one(pacientes, {
    fields: [evolucaoMensal.pacienteId],
    references: [pacientes.id],
  }),
}))

export const observacoesRelations = relations(observacoes, ({ one }) => ({
  paciente: one(pacientes, {
    fields: [observacoes.pacienteId],
    references: [pacientes.id],
  }),
  sessao: one(consultas, {
    fields: [observacoes.sessaoId],
    references: [consultas.id],
  }),
}))
