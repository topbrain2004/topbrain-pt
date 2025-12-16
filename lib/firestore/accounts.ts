import { getDb } from "../firebase"
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from "@firebase/firestore"

export interface Account {
  id: string
  email: string
  displayName: string
  role: "관리자" | "원장" | "학생"
  academyId?: string
  academyName?: string
  studentId?: string
  grade?: string
  createdBy: string
  createdAt: string
  status: "approved" | "pending" | "rejected"
  lastLogin?: string
  // Learning stats (for students)
  totalProblems?: number
  correctAnswers?: number
  averageScore?: number
  totalLearningTime?: number // in seconds
  lastActivity?: string
}

export interface StudentAccountWithStats {
  id: string
  name: string
  grade: string
  academyId: string
  totalProblems: number
  correctAnswers: number
  averageScore: number
  totalLearningTime: number
  lastActivity: string
}

function getAccountsCollection() {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  return collection(db, "accounts")
}

export async function createAccount(account: Omit<Account, "id">): Promise<string> {
  console.log("[v0] createAccount called with:", account.email, account.role)
  try {
    const docRef = doc(getAccountsCollection())
    console.log("[v0] Created doc ref:", docRef.id)
    console.log("[v0] Attempting setDoc...")
    await setDoc(docRef, account)
    console.log("[v0] setDoc completed successfully")
    return docRef.id
  } catch (error) {
    console.error("[v0] createAccount error:", error)
    throw error
  }
}

export async function getAccount(accountId: string): Promise<Account | null> {
  const docRef = doc(getAccountsCollection(), accountId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return null

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Account
}

export async function getAccountByEmail(email: string): Promise<Account | null> {
  console.log("[v0] getAccountByEmail called with:", email)
  try {
    const q = query(getAccountsCollection(), where("email", "==", email))
    console.log("[v0] Firestore query created, executing getDocs...")
    const querySnapshot = await getDocs(q)
    console.log("[v0] getDocs completed, empty:", querySnapshot.empty, "size:", querySnapshot.size)

    if (querySnapshot.empty) {
      console.log("[v0] No account found for email:", email)
      return null
    }

    const doc = querySnapshot.docs[0]
    const account = {
      id: doc.id,
      ...doc.data(),
    } as Account
    console.log("[v0] Account found:", account.id, account.role)
    return account
  } catch (error) {
    console.error("[v0] getAccountByEmail error:", error)
    throw error
  }
}

export async function getAccountsByCreator(creatorId: string): Promise<Account[]> {
  const q = query(getAccountsCollection(), where("createdBy", "==", creatorId))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Account[]
}

export async function getAccountsByAcademy(academyId: string): Promise<Account[]> {
  const q = query(getAccountsCollection(), where("academyId", "==", academyId))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Account[]
}

export async function updateAccount(accountId: string, data: Partial<Account>): Promise<void> {
  const docRef = doc(getAccountsCollection(), accountId)
  await updateDoc(docRef, data)
}

export async function deleteAccount(accountId: string): Promise<void> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const docRef = doc(getAccountsCollection(), accountId)

  // 1. Check for associated student profile
  try {
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data() as Account
      if (data.studentId) {
        const studentRef = doc(db, "students", data.studentId)
        await deleteDoc(studentRef)
        console.log(`[v0] Deleted associated student profile ${data.studentId} for account ${accountId}`)
      }
    }
  } catch (e) {
    console.error("[v0] Error deleting associated student profile:", e)
  }

  // 2. Delete account
  await deleteDoc(docRef)
  console.log(`[v0] Deleted account ${accountId}`)
}

export async function updateLastLogin(accountId: string): Promise<void> {
  const docRef = doc(getAccountsCollection(), accountId)
  await updateDoc(docRef, {
    lastLogin: new Date().toISOString(),
  })
}

export async function getDirectorAccounts(): Promise<Account[]> {
  const q = query(getAccountsCollection(), where("role", "==", "원장"), where("status", "==", "approved"))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Account[]
}

export async function getStudentAccountsByAcademy(academyId: string): Promise<Account[]> {
  const q = query(
    getAccountsCollection(),
    where("role", "==", "학생"),
    where("academyId", "==", academyId),
    where("status", "==", "approved"),
  )
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Account[]
}

export async function getStudentAccountsWithStats(academyId: string): Promise<StudentAccountWithStats[]> {
  console.log("[v0] getStudentAccountsWithStats called for academyId:", academyId)
  const accounts = await getStudentAccountsByAcademy(academyId)
  console.log("[v0] Found", accounts.length, "student accounts in accounts collection")

  return accounts.map((account) => {
    const stats: StudentAccountWithStats = {
      id: account.id,
      name: account.displayName,
      grade: account.grade || "미지정",
      academyId: account.academyId || "",
      totalProblems: account.totalProblems || 0,
      correctAnswers: account.correctAnswers || 0,
      averageScore: account.averageScore || 0,
      totalLearningTime: account.totalLearningTime || 0,
      lastActivity: account.lastActivity || account.createdAt,
    }
    console.log(
      `[v0] Student account: ${stats.name}, totalProblems=${stats.totalProblems}, avgScore=${stats.averageScore}`,
    )
    return stats
  })
}
