import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "@firebase/firestore"
import { getDb } from "@/lib/firebase"

export interface Problem {
  number: number
  type: "multiple" | "short" | "essay"
  answer: string
  keywords?: string[]
  domain?: "사실적 이해" | "추론적 이해" | "비판적 이해" | "어휘" | "창의" | string | null
}

export interface SubUnit {
  problems: Problem[]
}

export interface Textbook {
  id: string
  name: string
  category: string
  unit: string
  difficulty?: string // 최상, 상, 중상, 중, 중하, 하, 최하
  stage?: string // 씨드라이트, 씨드코어, 리드키, 리드딥, 탑스타트, 탑엘리트, 탑브레인
  subUnits: {
    [subUnitName: string]: SubUnit
  }
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

const COLLECTION_NAME = "textbooks"

function getTextbooksCollection() {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  return collection(db, COLLECTION_NAME)
}

// Get all textbooks
export async function getAllTextbooks(): Promise<Textbook[]> {
  console.log("[v0] Getting all textbooks from Firestore")
  const q = query(getTextbooksCollection(), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)

  console.log("[v0] Textbooks snapshot size:", snapshot.size)
  const textbooks = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Textbook[]

  console.log("[v0] Returned textbooks:", textbooks.length)
  return textbooks
}

// Get textbook by ID
export async function getTextbookById(id: string): Promise<Textbook | null> {
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
  } as Textbook
}

export async function createTextbook(textbookData: Omit<Textbook, "id" | "createdAt" | "updatedAt">): Promise<string> {
  console.log("[v0] Creating textbook:", textbookData)
  const docRef = await addDoc(getTextbooksCollection(), {
    ...textbookData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })

  console.log("[v0] Textbook created with ID:", docRef.id)
  return docRef.id
}

// Update textbook
export async function updateTextbook(id: string, updates: Partial<Omit<Textbook, "id" | "createdAt">>): Promise<void> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const docRef = doc(db, COLLECTION_NAME, id)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  })
}

// Delete textbook
export async function deleteTextbook(id: string): Promise<void> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
}
