import http from './http'

export const userApi = {
  list: () => http.get('/users'),
  create: (email: string, password: string) => http.post('/users', { email, password }),
  update: (id: number, data: { email?: string; password?: string; enabled?: boolean }) =>
    http.put(`/users/${id}`, data),
  setEnabled: (id: number, enabled: boolean) => http.patch(`/users/${id}/enabled`, { enabled }),
  remove: (id: number) => http.delete(`/users/${id}`),
}
