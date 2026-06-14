import { ensureDefaultUser } from '../src/lib/seed-default-user.js'

await ensureDefaultUser()
console.info('Seed complete')
process.exit(0)
