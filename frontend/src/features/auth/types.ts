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
}

export type RegisterInput = LoginInput & {
  displayName: string
}
