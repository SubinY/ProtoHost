import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../config/env.js'
import * as schema from './schema/index.js'

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (process.env.STORAGE_DRIVER === 'json') {
    throw new Error('PostgreSQL storage is not active')
  }
  if (!dbInstance) {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required when STORAGE_DRIVER=postgres')
    }
    const client = postgres(env.DATABASE_URL)
    dbInstance = drizzle(client, { schema })
  }
  return dbInstance
}

/** @deprecated Use getDb() via storage layer */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
