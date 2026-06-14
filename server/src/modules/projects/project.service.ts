import { and, desc, eq, inArray, isNull, max } from 'drizzle-orm'
import path from 'path'
import { randomBytes } from 'crypto'
import { db } from '../../db/index.js'
import { projects, projectVersions } from '../../db/schema/index.js'
import { env } from '../../config/env.js'
import { AppError } from '../../lib/errors.js'
import { deleteDirectory, getDirSize } from '../../lib/fs-utils.js'
import { hashPassword } from '../../lib/password.js'
import { extractZip, zipFolder } from '../../lib/zip.js'

function toDto(
  p: typeof projects.$inferSelect,
  fileSize?: number | null,
) {
  return {
    id: p.id,
    groupId: p.groupId ?? undefined,
    name: p.name,
    version: p.version,
    description: p.description ?? undefined,
    isPublic: p.isPublic,
    shareSlug: p.shareSlug,
    entryFile: p.entryFile,
    viewCount: Number(p.viewCount),
    fileSize: fileSize != null ? Number(fileSize) : 0,
    lastUpdatedAt: p.lastUpdatedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

export async function listByUser(userId: number, groupId?: number | null) {
  let rows

  if (groupId != null && groupId !== undefined) {
    if (groupId === 0) {
      rows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.userId, userId), isNull(projects.groupId)))
        .orderBy(desc(projects.updatedAt))
    } else {
      rows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.userId, userId), eq(projects.groupId, groupId)))
        .orderBy(desc(projects.updatedAt))
    }
  } else {
    rows = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt))
  }

  return Promise.all(rows.map((p) => attachFileSize(p)))
}

async function attachFileSize(project: typeof projects.$inferSelect) {
  const [latest] = await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.projectId, project.id))
    .orderBy(desc(projectVersions.createdAt))
    .limit(1)
  return toDto(project, latest?.fileSize)
}

export async function upload(
  userId: number,
  fileBuffer: Buffer,
  opts: {
    projectId?: number | null
    name: string
    version?: string | null
    description?: string | null
    isPublic: boolean
    accessPassword?: string | null
    groupId?: number | null
    isReplace?: boolean
    changelog?: string | null
  },
) {
  const storagePath = `${userId}/${Date.now()}`
  const destDir = path.join(env.UPLOAD_BASE_PATH, storagePath)

  const result = await extractZip(fileBuffer, destDir)
  const fileSize = await getDirSize(destDir)

  let project: typeof projects.$inferSelect

  if (opts.projectId) {
    const [existing] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, opts.projectId), eq(projects.userId, userId)))
      .limit(1)
    if (!existing) throw new AppError('项目不存在')

    if (opts.isReplace) {
      await deleteDirectory(path.join(env.UPLOAD_BASE_PATH, existing.storagePath))
    }

    const version =
      opts.version && opts.version.trim() ? opts.version : existing.version
    let accessPasswordHash = existing.accessPasswordHash
    if (!opts.isPublic && opts.accessPassword && opts.accessPassword.trim()) {
      accessPasswordHash = await hashPassword(opts.accessPassword)
    }

    const [updated] = await db
      .update(projects)
      .set({
        name: opts.name,
        version,
        description: opts.description ?? null,
        isPublic: opts.isPublic,
        accessPasswordHash,
        storagePath,
        entryFile: result.entryFile,
        groupId: opts.groupId ?? null,
        lastUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, existing.id))
      .returning()
    project = updated
  } else {
    const version = opts.version && opts.version.trim() ? opts.version : '1.0.0'
    const accessPasswordHash =
      !opts.isPublic && opts.accessPassword && opts.accessPassword.trim()
        ? await hashPassword(opts.accessPassword)
        : null

    const [inserted] = await db
      .insert(projects)
      .values({
        userId,
        name: opts.name,
        version,
        description: opts.description ?? null,
        isPublic: opts.isPublic,
        accessPasswordHash,
        shareSlug: randomBytes(8).toString('hex'),
        entryFile: result.entryFile,
        storagePath,
        groupId: opts.groupId ?? null,
        viewCount: 0,
        lastUpdatedAt: new Date(),
      })
      .returning()
    project = inserted
  }

  await db.insert(projectVersions).values({
    projectId: project.id,
    versionNumber: project.version,
    changelog: opts.changelog ?? null,
    storagePath,
    fileSize,
  })

  return await attachFileSize(project)
}

export async function deleteProject(userId: number, projectId: number) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)
  if (!project) throw new AppError('项目不存在')

  const versions = await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))

  for (const v of versions) {
    await deleteDirectory(path.join(env.UPLOAD_BASE_PATH, v.storagePath))
  }
  await deleteDirectory(path.join(env.UPLOAD_BASE_PATH, project.storagePath))
  await db.delete(projects).where(eq(projects.id, projectId))
}

export async function updateGroup(userId: number, projectId: number, groupId?: number | null) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)
  if (!project) throw new AppError('项目不存在')

  const gid = groupId == null || groupId === 0 ? null : groupId
  await db
    .update(projects)
    .set({ groupId: gid, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
}

export async function updateSettings(
  userId: number,
  projectId: number,
  isPublic: boolean,
  accessPassword?: string | null,
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)
  if (!project) throw new AppError('项目不存在')

  let accessPasswordHash = project.accessPasswordHash
  if (!isPublic && accessPassword && accessPassword.trim()) {
    accessPasswordHash = await hashPassword(accessPassword)
  } else if (isPublic) {
    accessPasswordHash = null
  }

  await db
    .update(projects)
    .set({ isPublic, accessPasswordHash, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
}

export async function listVersions(userId: number, projectId: number) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)
  if (!project) throw new AppError('项目不存在')

  const maxIds = await db
    .select({ id: max(projectVersions.id) })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .groupBy(projectVersions.versionNumber)

  const ids = maxIds.map((r) => r.id).filter((id): id is number => id != null)
  if (ids.length === 0) return []

  return db
    .select()
    .from(projectVersions)
    .where(inArray(projectVersions.id, ids))
    .orderBy(desc(projectVersions.createdAt))
}

export async function downloadVersion(userId: number, versionId: number) {
  const [pv] = await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.id, versionId))
    .limit(1)
  if (!pv) throw new AppError('版本不存在')

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, pv.projectId), eq(projects.userId, userId)))
    .limit(1)
  if (!project) throw new AppError('权限不足')

  const dir = path.join(env.UPLOAD_BASE_PATH, pv.storagePath)
  try {
    await import('fs/promises').then((fs) => fs.access(dir))
  } catch {
    throw new AppError('物理文件已被删除')
  }

  const zipBuffer = await zipFolder(dir)
  const filename = encodeURIComponent(`${project.name}_${pv.versionNumber}.zip`).replace(/\+/g, '%20')
  return { zipBuffer, filename, projectName: project.name, versionNumber: pv.versionNumber }
}
