import AdmZip from 'adm-zip'
import fs from 'fs/promises'
import path from 'path'

export interface ExtractResult {
  entryFile: string
  files: string[]
}

function shouldIgnore(entryPath: string): boolean {
  const name = path.basename(entryPath)
  return (
    entryPath.includes('__MACOSX') ||
    name === '.DS_Store' ||
    name === 'Thumbs.db' ||
    name.startsWith('._')
  )
}

function toSafePath(entryPath: string): string {
  return entryPath.replace(/[\\:*?"<>|]/g, '_')
}

export async function extractZip(buffer: Buffer, destDir: string): Promise<ExtractResult> {
  await fs.mkdir(destDir, { recursive: true })
  const destCanonical = await fs.realpath(destDir)
  const htmlFiles: string[] = []

  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  for (const entry of entries) {
    if (entry.isDirectory || shouldIgnore(entry.entryName)) continue

    const safePath = toSafePath(entry.entryName)
    const target = path.resolve(destDir, safePath)
    if (!target.startsWith(destCanonical + path.sep) && target !== destCanonical) {
      throw new Error(`Path traversal detected: ${entry.entryName}`)
    }

    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, entry.getData())

    if (safePath.endsWith('.html') || safePath.endsWith('.htm')) {
      htmlFiles.push(safePath)
    }
  }

  const entryFile =
    htmlFiles.find((f) => f === 'index.html' || f.endsWith('/index.html')) ??
    (htmlFiles.length > 0 ? htmlFiles[0] : 'index.html')

  return { entryFile, files: htmlFiles }
}

export async function zipFolder(sourceDir: string): Promise<Buffer> {
  const archiver = (await import('archiver')).default
  const { PassThrough } = await import('stream')
  const { buffer } = await import('node:stream/consumers')

  const archive = archiver('zip', { zlib: { level: 9 } })
  const sink = new PassThrough()
  archive.pipe(sink)
  archive.directory(sourceDir, false)
  await archive.finalize()
  return Buffer.from(await buffer(sink))
}
