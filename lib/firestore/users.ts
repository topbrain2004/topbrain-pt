import { getDb } from "../firebase"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "@firebase/firestore"

export interface User {
  id: string // Firebase UID
  email: string
  displayName: string
  photoURL?: string
  role: "대표자" | "원장" | "강사" | "학생" | null
  status: "pending" | "approved" | "rejected"
  academyId?: string
  createdAt: Date
  updatedAt: Date
  approvedBy?: string // User ID who approved
  approvedAt?: Date
}

const USERS_COLLECTION = "users"

function getUsersCollection() {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  return collection(db, USERS_COLLECTION)
}

// Create or get user after Google login
export async function createOrGetUser(
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string,
): Promise<User> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const userRef = doc(db, USERS_COLLECTION, uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    return userSnap.data() as User
  }

  const newUser: User = {
    id: uid,
    email,
    displayName,
    photoURL,
    role: null,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await setDoc(userRef, {
    ...newUser,
    createdAt: Timestamp.fromDate(newUser.createdAt),
    updatedAt: Timestamp.fromDate(newUser.updatedAt),
  })

  return newUser
}

// Get user by ID
export async function getUserById(uid: string): Promise<User | null> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const userRef = doc(db, USERS_COLLECTION, uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    return null
  }

  const data = userSnap.data()
  return {
    ...data,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    approvedAt: data.approvedAt?.toDate(),
  } as User
}

export const getUserByUid = getUserById

// Get all pending users
export async function getPendingUsers(): Promise<User[]> {
  const q = query(getUsersCollection(), where("status", "==", "pending"), orderBy("createdAt", "desc"))

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      approvedAt: data.approvedAt?.toDate(),
    } as User
  })
}

// Get all users
export async function getAllUsers(): Promise<User[]> {
  const q = query(getUsersCollection(), orderBy("createdAt", "desc"))

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      approvedAt: data.approvedAt?.toDate(),
    } as User
  })
}

// Approve user and assign role
export async function approveUser(
  uid: string,
  role: "대표자" | "원장" | "강사" | "학생",
  approvedBy: string,
  academyId?: string,
): Promise<void> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const userRef = doc(db, USERS_COLLECTION, uid)
  const updates: any = {
    role,
    status: "approved",
    approvedBy,
    approvedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }

  if (academyId && (role === "원장" || role === "강사")) {
    updates.academyId = academyId
  }

  await updateDoc(userRef, updates)
}

// Reject user
export async function rejectUser(uid: string): Promise<void> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const userRef = doc(db, USERS_COLLECTION, uid)
  await updateDoc(userRef, {
    status: "rejected",
    updatedAt: Timestamp.now(),
  })
}

// Update user role
export async function updateUserRole(uid: string, role: "대표자" | "원장" | "강사" | "학생"): Promise<void> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const userRef = doc(db, USERS_COLLECTION, uid)
  await updateDoc(userRef, {
    role,
    updatedAt: Timestamp.now(),
  })
}

// Check if user can assign role
export function canAssignRole(userRole: string | null, targetRole: string): boolean {
  if (!userRole) return false

  if (userRole === "대표자") {
    // 대표자 can assign all roles
    return true
  }

  if (userRole === "원장") {
    // 원장 can assign 강사 and 학생 roles
    return targetRole === "강사" || targetRole === "학생"
  }

  return false
}

// Get users by academy
export async function getUsersByAcademyId(academyId: string): Promise<User[]> {
  const q = query(
    getUsersCollection(),
    where("academyId", "==", academyId),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc"),
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      approvedAt: data.approvedAt?.toDate(),
    } as User
  })
}

// Get directors only
export async function getDirectors(): Promise<User[]> {
  const q = query(
    getUsersCollection(),
    where("role", "==", "원장"),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc"),
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      approvedAt: data.approvedAt?.toDate(),
    } as User
  })
}
