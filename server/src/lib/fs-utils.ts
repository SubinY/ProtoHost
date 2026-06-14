import fs from 'fs/promises'
import path from 'path'

export async function getDirSize(dir: string): Promise<number> {
  let size = 0
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      size += await getDirSize(full)
    } else {
      const stat = await fs.stat(full)
      size += stat.size
    }
  }
  return size
}

export async function deleteDirectory(dir: string): Promise<void> {
  try {
    await fs.access(dir)
  } catch {
    return
  }
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await deleteDirectory(full)
    } else {
      await fs.unlink(full)
    }
  }
  await fs.rmdir(dir)
}

export async function readTextWithEncoding(filePath: string): Promise<string> {
  const bytes = await fs.readFile(filePath)
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return decoded
  } catch {
    const iconv = await import('iconv-lite')
    return iconv.decode(bytes, 'gbk')
  }
}
