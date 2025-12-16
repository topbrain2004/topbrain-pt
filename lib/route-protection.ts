import { getAuthFromStorage, type AuthUser } from "./auth"

export function requireAuth(allowedRoles?: AuthUser["role"][]): AuthUser | null {
  const auth = getAuthFromStorage()
  
  if (!auth) {
    return null
  }

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    return null
  }

  return auth
}

export function getRedirectPath(role: AuthUser["role"]): string {
  switch (role) {
    case "관리자":
      return "/admin"
    case "원장":
      return "/director"
    case "학생":
      return "/student"
    default:
      return "/login"
  }
}
