import fs from 'fs/promises'
import { env } from './config/env.js'
import { createApp } from './app.js'
import { ensureDefaultUser } from './lib/seed-default-user.js'
import { initJsonStore } from './storage/json/store.js'

await fs.mkdir(env.UPLOAD_BASE_PATH, { recursive: true })
if (env.STORAGE_DRIVER === 'json') {
  await fs.mkdir(env.JSON_STORE_PATH, { recursive: true })
  await initJsonStore()
}
await ensureDefaultUser()

const app = createApp()
app.listen(env.PORT, () => {
  console.info(
    `ProtoHost server listening on http://localhost:${env.PORT} (storage=${env.STORAGE_DRIVER})`,
  )
})
