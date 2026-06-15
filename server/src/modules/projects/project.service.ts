import path from 'path'
import { randomBytes } from 'crypto'
import { storage } from '../../storage/index.js'
import type { Project } from '../../storage/types.js'
import { env } from '../../config/env.js'
import { AppError } from '../../lib/errors.js'
import { deleteDirectory, getDirSize } from '../../lib/fs-utils.js'
import { hashPassword } from '../../lib/password.js'
import { extractZip, zipFolder } from '../../lib/zip.js'

function toDto(p: Project, fileSize?: number | null) {
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
  const rows = await storage.projects.listByUserId(userId, groupId)
  return Promise.all(rows.map((p: Project) => attachFileSize(p)))
}

async function attachFileSize(project: Project) {
  const latest = await storage.versions.findLatestByProjectId(project.id)
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

  let project: Project

  if (opts.projectId) {
    const existing = await storage.projects.findByIdAndUser(userId, opts.projectId)
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

    project = await storage.projects.update(existing.id, {
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
  } else {
    const version = opts.version && opts.version.trim() ? opts.version : '1.0.0'
    const accessPasswordHash =
      !opts.isPublic && opts.accessPassword && opts.accessPassword.trim()
        ? await hashPassword(opts.accessPassword)
        : null

    project = await storage.projects.create({
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
  }

  await storage.versions.create({
    projectId: project.id,
    versionNumber: project.version,
    changelog: opts.changelog ?? null,
    storagePath,
    fileSize,
  })

  return await attachFileSize(project)
}

export async function deleteProject(userId: number, projectId: number) {
  const project = await storage.projects.findByIdAndUser(userId, projectId)
  if (!project) throw new AppError('项目不存在')

  const versions = await storage.versions.listByProjectId(projectId)

  for (const v of versions) {
    await deleteDirectory(path.join(env.UPLOAD_BASE_PATH, v.storagePath))
  }
  await deleteDirectory(path.join(env.UPLOAD_BASE_PATH, project.storagePath))
  await storage.versions.deleteByProjectId(projectId)
  await storage.projects.delete(projectId)
}

export async function updateGroup(userId: number, projectId: number, groupId?: number | null) {
  const project = await storage.projects.findByIdAndUser(userId, projectId)
  if (!project) throw new AppError('项目不存在')

  const gid = groupId == null || groupId === 0 ? null : groupId
  await storage.projects.update(projectId, { groupId: gid, updatedAt: new Date() })
}

export async function updateSettings(
  userId: number,
  projectId: number,
  isPublic: boolean,
  accessPassword?: string | null,
) {
  const project = await storage.projects.findByIdAndUser(userId, projectId)
  if (!project) throw new AppError('项目不存在')

  let accessPasswordHash = project.accessPasswordHash
  if (!isPublic && accessPassword && accessPassword.trim()) {
    accessPasswordHash = await hashPassword(accessPassword)
  } else if (isPublic) {
    accessPasswordHash = null
  }

  await storage.projects.update(projectId, {
    isPublic,
    accessPasswordHash,
    updatedAt: new Date(),
  })
}

export async function listVersions(userId: number, projectId: number) {
  const project = await storage.projects.findByIdAndUser(userId, projectId)
  if (!project) throw new AppError('项目不存在')
  return storage.versions.listDistinctByProjectId(projectId)
}

export async function downloadVersion(userId: number, versionId: number) {
  const pv = await storage.versions.findById(versionId)
  if (!pv) throw new AppError('版本不存在')

  const project = await storage.projects.findByIdAndUser(userId, pv.projectId)
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
