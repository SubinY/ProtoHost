import 'koa'
import type { UserRole } from '../storage/types.js'

declare module 'koa' {
  interface DefaultState {
    userId?: number
    userEmail?: string
    userRole?: UserRole
    userEnabled?: boolean
  }
}
