const CODE_TTL_MS = 10 * 60 * 1000
const RATE_LIMIT_MS = 60 * 1000

const codeCache = new Map<string, { code: string; expires: number }>()
const rateLimitCache = new Map<string, number>()

export function generateCode(email: string): string {
  const code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  codeCache.set(email, { code, expires: Date.now() + CODE_TTL_MS })
  rateLimitCache.set(email, Date.now())
  return code
}

export function verifyCode(email: string, code: string): boolean {
  const entry = codeCache.get(email)
  if (!entry || entry.expires < Date.now()) return false
  if (entry.code !== code) return false
  codeCache.delete(email)
  return true
}

export function canSend(email: string): boolean {
  const last = rateLimitCache.get(email)
  if (!last) return true
  return Date.now() - last >= RATE_LIMIT_MS
}
