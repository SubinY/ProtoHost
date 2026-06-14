export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}
