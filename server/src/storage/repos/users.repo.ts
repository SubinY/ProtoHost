import type { CreateUserInput, UpdateUserInput, User } from '../types.js'

export interface UserRepo {
  findByEmail(email: string): Promise<User | null>
  findById(id: number): Promise<User | null>
  list(): Promise<User[]>
  create(email: string, passwordHash: string): Promise<User>
  createAccount(input: CreateUserInput): Promise<User>
  updatePassword(userId: number, passwordHash: string): Promise<void>
  updateAccount(id: number, patch: UpdateUserInput): Promise<User>
  delete(id: number): Promise<void>
}
