import { collection, getDocs, addDoc, query, where, Timestamp } from "@firebase/firestore"
import { getDb } from "@/lib/firebase"

export interface Admin {
  id: string
  personalId: string
  password: string
  name: string
  createdAt: Date
}

const COLLECTION_NAME = "admins"

function getAdminsCollection() {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  return collection(db, COLLECTION_NAME)
}

// Get all admins
export async function getAllAdmins(): Promise<Admin[]> {
  const snapshot = await getDocs(getAdminsCollection())

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Admin[]
}

// Get admin by personal ID (for login)
export async function getAdminByPersonalId(personalId: string): Promise<Admin | null> {
  const q = query(getAdminsCollection(), where("personalId", "==", personalId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  } as Admin
}

// Create new admin
export async function createAdmin(adminData: Omit<Admin, "id" | "createdAt">): Promise<string> {
  const docRef = await addDoc(getAdminsCollection(), {
    ...adminData,
    createdAt: Timestamp.now(),
  })

  return docRef.id
}
