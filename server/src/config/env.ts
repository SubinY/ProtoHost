import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'
import path from 'path'
import { fileURLToPath } from 'url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
loadDotenv({ path: path.join(rootDir, '.env') })
loadDotenv({ path: path.join(rootDir, 'server/.env') })

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRATION: z.coerce.number().default(604800),
  JWT_VIEW_EXPIRATION: z.coerce.number().default(7200),
  UPLOAD_BASE_PATH: z.string().default('./uploads'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8080'),
  DEFAULT_USER_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  DEFAULT_USER_EMAIL: z.string().default('root@protohost.local'),
  DEFAULT_USER_PASSWORD: z.string().default('root123456'),
  MAIL_HOST: z.string().default('smtp.example.com'),
  MAIL_PORT: z.coerce.number().default(587),
  MAIL_USERNAME: z.string().default(''),
  MAIL_PASSWORD: z.string().default(''),
})

export const env = envSchema.parse(process.env)

export const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
