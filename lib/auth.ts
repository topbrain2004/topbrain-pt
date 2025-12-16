import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "@firebase/auth"
import { getAuthInstance } from "./firebase"

export interface AuthUser {
  uid: string
  email: string
  displayName: string
  role: "관리자" | "원장" | "학생"
  academyId?: string
  academyName?: string
  studentId?: string
  status: "approved" | "pending" | "rejected"
}

export async function signIn(email: string, password: string): Promise<User> {
  const auth = getAuthInstance()
  if (!auth) {
    throw new Error("Firebase Auth is not initialized. Make sure you're on the client side.")
  }
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signUp(email: string, password: string): Promise<User> {
  const auth = getAuthInstance()
  if (!auth) {
    throw new Error("Firebase Auth is not initialized. Make sure you're on the client side.")
  }
  const result = await createUserWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signOut(): Promise<void> {
  const auth = getAuthInstance()
  if (auth) {
    await firebaseSignOut(auth)
  }
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("auth")
  }
}

export function saveAuthToStorage(user: AuthUser): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("auth", JSON.stringify(user))
  }
}

export function getAuthFromStorage(): AuthUser | null {
  if (typeof window === "undefined") return null
  const authData = sessionStorage.getItem("auth")
  if (!authData) return null
  try {
    return JSON.parse(authData)
  } catch (e) {
    console.error("Failed to parse auth data:", e)
    return null
  }
}

export function clearAuthStorage(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("auth")
  }
}

export async function refreshAuth(): Promise<AuthUser | null> {
  const currentAuth = getAuthFromStorage()
  if (!currentAuth) return null

  try {
    const { getAccountByEmail } = await import("./firestore/accounts")
    const freshAccount = await getAccountByEmail(currentAuth.email)

    if (freshAccount) {
      const newAuth: AuthUser = {
        uid: freshAccount.id, // Store Firestore ID as uid for consistency in app usage
        email: freshAccount.email,
        displayName: freshAccount.displayName,
        role: freshAccount.role,
        academyId: freshAccount.academyId,
        academyName: freshAccount.academyName,
        studentId: freshAccount.studentId,
        status: freshAccount.status
      }
      saveAuthToStorage(newAuth)
      console.log("[Auth] Refreshed auth from Firestore:", newAuth)
      return newAuth
    }
  } catch (e) {
    console.error("[Auth] Failed to refresh auth:", e)
  }
  return currentAuth
}
