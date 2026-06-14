import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users } from '../../db/schema/index.js'
import { AppError } from '../../lib/errors.js'
import { generateToken } from '../../lib/jwt.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import { sendSimpleMail } from '../../lib/mailer.js'
import * as verification from './verification.service.js'

async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return user
}

export async function sendRegisterCode(email: string) {
  const existing = await findUserByEmail(email)
  if (existing) throw new AppError('该邮箱已被注册')
  if (!verification.canSend(email)) throw new AppError('验证码发送太频繁，请稍后再试')
  const code = verification.generateCode(email)
  await sendSimpleMail(email, 'ProtoHost 注册验证码', `您的验证码是：${code}，有效期为 10 分钟。`)
}

export async function sendResetCode(email: string) {
  const existing = await findUserByEmail(email)
  if (!existing) throw new AppError('该邮箱未注册')
  if (!verification.canSend(email)) throw new AppError('验证码发送太频繁，请稍后再试')
  const code = verification.generateCode(email)
  await sendSimpleMail(email, 'ProtoHost 找回密码验证码', `您的验证码是：${code}，有效期为 10 分钟。`)
}

export async function resetPassword(email: string, password: string, code: string) {
  if (!verification.verifyCode(email, code)) throw new AppError('验证码错误或已过期')
  const user = await findUserByEmail(email)
  if (!user) throw new AppError('用户不存在')
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(users.id, user.id))
}

export async function register(email: string, password: string, code: string) {
  if (!verification.verifyCode(email, code)) throw new AppError('验证码错误或已过期')
  const existing = await findUserByEmail(email)
  if (existing) throw new AppError('该邮箱已被注册')
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password) })
    .returning()
  const token = await generateToken(user.id, user.email)
  return { token, userId: user.id, email: user.email }
}

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError('邮箱或密码错误')
  }
  const token = await generateToken(user.id, user.email)
  return { token, userId: user.id, email: user.email }
}
