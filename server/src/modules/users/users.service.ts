import path from 'path'
import { storage } from '../../storage/index.js'
import { env } from '../../config/env.js'
import { AppError } from '../../lib/errors.js'
import { toUserDto } from '../../lib/user-normalize.js'
import { hashPassword } from '../../lib/password.js'
import { deleteDirectory } from '../../lib/fs-utils.js'

function assertNotAdminTarget(user: { role: string; email: string }, action: string) {
  if (user.role === 'admin' || user.email === env.DEFAULT_USER_EMAIL) {
    throw new AppError(`不能${action}超管账号`)
  }
}

export async function listUsers() {
  const users = await storage.users.list()
  return users.map(toUserDto)
}

export async function createUser(email: string, password: string) {
  const trimmed = email.trim()
  if (!trimmed) throw new AppError('账号不能为空')
  if (password.length < 6) throw new AppError('密码至少 6 位')

  const existing = await storage.users.findByEmail(trimmed)
  if (existing) throw new AppError('账号已存在')

  const user = await storage.users.createAccount({
    email: trimmed,
    passwordHash: await hashPassword(password),
    role: 'user',
    enabled: true,
  })
  return toUserDto(user)
}

export async function updateUser(
  id: number,
  patch: { email?: string; password?: string; enabled?: boolean },
) {
  const user = await storage.users.findById(id)
  if (!user) throw new AppError('用户不存在')

  const update: { email?: string; passwordHash?: string; enabled?: boolean } = {}

  if (patch.email !== undefined) {
    const trimmed = patch.email.trim()
    if (!trimmed) throw new AppError('账号不能为空')
    if (trimmed !== user.email) {
      const existing = await storage.users.findByEmail(trimmed)
      if (existing) throw new AppError('账号已存在')
      update.email = trimmed
    }
  }

  if (patch.password !== undefined) {
    if (patch.password.length < 6) throw new AppError('密码至少 6 位')
    update.passwordHash = await hashPassword(patch.password)
  }

  if (patch.enabled !== undefined) {
    if (patch.enabled === false) assertNotAdminTarget(user, '禁用')
    update.enabled = patch.enabled
  }

  const updated = await storage.users.updateAccount(id, update)
  return toUserDto(updated)
}

export async function setUserEnabled(id: number, enabled: boolean) {
  return updateUser(id, { enabled })
}

async function purgeUserData(userId: number) {
  const projects = await storage.projects.listByUserId(userId)
  for (const project of projects) {
    const versions = await storage.versions.listByProjectId(project.id)
    for (const v of versions) {
      await deleteDirectory(path.join(env.UPLOAD_BASE_PATH, v.storagePath))
    }
    await deleteDirectory(path.join(env.UPLOAD_BASE_PATH, project.storagePath))
    await storage.versions.deleteByProjectId(project.id)
    await storage.projects.delete(project.id)
  }

  const groups = await storage.groups.listByUserId(userId)
  for (const group of groups) {
    await storage.groups.delete(userId, group.id)
  }
}

export async function deleteUser(id: number) {
  const user = await storage.users.findById(id)
  if (!user) throw new AppError('用户不存在')
  assertNotAdminTarget(user, '删除')

  await purgeUserData(id)
  await storage.users.delete(id)
}
