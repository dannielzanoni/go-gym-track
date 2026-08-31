export type User = {
  id: string
  email: string
  displayName: string
  createdAt: string
  updatedAt: string
}

export type AuthSession = {
  user: User
  accessToken: string
  expiresIn: number
}

export type LoginInput = {
  email: string
  password: string
  rememberMe: boolean
}

export type RegisterInput = {
  email: string
  password: string
  displayName: string
}
