import { SignJWT, jwtVerify } from 'jose'
import { env } from '../config/env.js'

const key = new TextEncoder().encode(env.JWT_SECRET)

export async function generateToken(userId: number, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + env.JWT_EXPIRATION)
    .sign(key)
}

export async function generateViewToken(slug: string): Promise<string> {
  return new SignJWT({ type: 'view' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(slug)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + env.JWT_VIEW_EXPIRATION)
    .sign(key)
}

export async function getUserIdFromToken(token: string): Promise<number> {
  const { payload } = await jwtVerify(token, key)
  return Number(payload.sub)
}

export async function isViewToken(token: string, slug: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, key)
    return payload.type === 'view' && payload.sub === slug
  } catch {
    return false
  }
}
