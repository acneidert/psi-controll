import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import 'dotenv/config'

if (!process.env.DATABASE_URL) {
  // Warn but don't crash during build time if env is missing,
  // unless we are actually running queries.
  console.warn(
    'DATABASE_URL is not set. Database connection will fail if used.',
  )
}

const client = postgres(
  process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/psicontrol',
)

export const db = drizzle(client, { schema })
