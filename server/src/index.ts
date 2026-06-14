import fs from 'fs/promises'
import { env } from './config/env.js'
import { createApp } from './app.js'
import { ensureDefaultUser } from './lib/seed-default-user.js'

await fs.mkdir(env.UPLOAD_BASE_PATH, { recursive: true })
await ensureDefaultUser()

const app = createApp()
app.listen(env.PORT, () => {
  console.info(`ProtoHost server listening on http://localhost:${env.PORT}`)
})
