import { storage } from '../../storage/index.js'
import { AppError } from '../../lib/errors.js'
import { generateToken } from '../../lib/jwt.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import { toUserDto } from '../../lib/user-normalize.js'

async function findUserByEmail(email: string) {
  return storage.users.findByEmail(email)
}

function authResponse(user: { id: number; email: string; role: string }) {
  return generateToken(user.id, user.email).then((token) => ({
    token,
    userId: user.id,
    email: user.email,
    role: user.role,
  }))
}

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError('账号或密码错误')
  }
  if (!user.enabled) {
    throw new AppError('账号已禁用')
  }
  return authResponse(user)
}

export async function me(userId: number) {
  const user = await storage.users.findById(userId)
  if (!user) throw new AppError('用户不存在')
  return { userId: user.id, ...toUserDto(user) }
}

export async function changePassword(userId: number, oldPassword: string, newPassword: string) {
  const user = await storage.users.findById(userId)
  if (!user) throw new AppError('用户不存在')
  if (!(await verifyPassword(oldPassword, user.passwordHash))) {
    throw new AppError('原密码错误')
  }
  if (newPassword.length < 6) {
    throw new AppError('新密码至少 6 位')
  }
  await storage.users.updatePassword(userId, await hashPassword(newPassword))
}
