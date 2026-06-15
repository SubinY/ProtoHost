import http from './http'

export const authApi = {
  login: (email: string, password: string) => http.post('/auth/login', { email, password }),
  me: () => http.get('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.put('/auth/password', { oldPassword, newPassword }),
}
