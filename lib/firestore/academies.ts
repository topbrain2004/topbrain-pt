import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "@firebase/firestore"
import { getDb } from "@/lib/firebase"

export interface Academy {
  id: string
  name: string
  address: string
  phone: string
  email: string
  directorId: string // User ID of the academy director (원장)
  createdAt: Date
  updatedAt: Date
}

const COLLECTION_NAME = "academies"

function getAcademiesCollection() {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  return collection(db, COLLECTION_NAME)
}

// Get all academies (for 대표자)
export async function getAllAcademies(): Promise<Academy[]> {
  const q = query(getAcademiesCollection(), orderBy("name"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Academy[]
}

// Get academy by ID
export async function getAcademyById(id: string): Promise<Academy | null> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const docRef = doc(db, COLLECTION_NAME, id)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    return null
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    updatedAt: docSnap.data().updatedAt?.toDate(),
  } as Academy
}

// Get academy by director ID
export async function getAcademyByDirectorId(directorId: string): Promise<Academy | null> {
  const q = query(getAcademiesCollection(), where("directorId", "==", directorId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  } as Academy
}

// Create new academy
export async function createAcademy(academyData: Omit<Academy, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const docRef = await addDoc(getAcademiesCollection(), {
    ...academyData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })

  return docRef.id
}

// Update academy
export async function updateAcademy(id: string, updates: Partial<Academy>): Promise<void> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const docRef = doc(db, COLLECTION_NAME, id)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  })
}

// Delete academy
export async function deleteAcademy(id: string): Promise<void> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
}

// Check if user is director of academy
export async function isDirectorOfAcademy(userId: string, academyId: string): Promise<boolean> {
  const academy = await getAcademyById(academyId)
  return academy?.directorId === userId
}
