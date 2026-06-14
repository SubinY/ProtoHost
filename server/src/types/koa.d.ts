import 'koa'

declare module 'koa' {
  interface DefaultState {
    userId?: number
  }
}
