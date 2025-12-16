import { collection, doc, getDoc, getDocs, addDoc, query, where, orderBy, limit, Timestamp } from "@firebase/firestore"
import { getDb } from "@/lib/firebase"

export interface ProblemResult {
  correct: boolean
  userAnswer: string
  correctAnswer: string
  feedback?: string // Added for AI feedback
}

export interface LearningSession {
  id: string
  studentId: string
  textbookId: string
  textbookName: string
  subUnit?: string // Added to track specific unit
  page: number
  startTime: Date
  endTime?: Date
  readingTime: number // in seconds
  solvingTime: number // in seconds
  totalQuestions: number
  correctCount: number
  results: Record<number, ProblemResult>
  createdAt: Date
}

const COLLECTION_NAME = "learning_sessions"

function getSessionsCollection() {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  return collection(db, COLLECTION_NAME)
}

// Check if a session exists for the given student, textbook, and subunit
export async function checkSessionExists(studentId: string, textbookId: string, subUnit: string): Promise<boolean> {
  const q = query(
    getSessionsCollection(),
    where("studentId", "==", studentId),
    where("textbookId", "==", textbookId),
    where("subUnit", "==", subUnit),
    limit(1)
  )
  const snapshot = await getDocs(q)
  return !snapshot.empty
}

export async function getSessionCount(studentId: string, textbookId: string, subUnit: string): Promise<number> {
  const q = query(
    getSessionsCollection(),
    where("studentId", "==", studentId),
    where("textbookId", "==", textbookId),
    where("subUnit", "==", subUnit)
  )
  const snapshot = await getDocs(q)
  return snapshot.size
}

export async function getLastSession(studentId: string, textbookId: string, subUnit: string): Promise<LearningSession | null> {
  const q = query(
    getSessionsCollection(),
    where("studentId", "==", studentId),
    where("textbookId", "==", textbookId),
    where("subUnit", "==", subUnit),
    orderBy("createdAt", "desc"),
    limit(1)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as LearningSession
}

// Get list of completed subUnits for a specific textbook
export async function getCompletedSubUnits(studentId: string, textbookId: string): Promise<string[]> {
  const q = query(
    getSessionsCollection(),
    where("studentId", "==", studentId),
    where("textbookId", "==", textbookId)
  )
  const snapshot = await getDocs(q)

  // Extract unique subUnits
  const subUnits = new Set<string>()
  snapshot.docs.forEach(doc => {
    const data = doc.data() as LearningSession
    if (data.subUnit) {
      subUnits.add(data.subUnit)
    }
  })

  return Array.from(subUnits)
}

// Get all sessions for a student
export async function getStudentSessions(studentId: string, limitCount = 10): Promise<LearningSession[]> {
  const q = query(
    getSessionsCollection(),
    where("studentId", "==", studentId),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startTime: doc.data().startTime?.toDate(),
    endTime: doc.data().endTime?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as LearningSession[]
}

// Get sessions by date range (for reports)
export async function getSessionsByDateRange(studentId: string, startDate: Date, endDate: Date): Promise<LearningSession[]> {
  const startTimestamp = Timestamp.fromDate(startDate)
  const endTimestamp = Timestamp.fromDate(endDate)

  const q = query(
    getSessionsCollection(),
    where("studentId", "==", studentId),
    where("createdAt", ">=", startTimestamp),
    where("createdAt", "<=", endTimestamp),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startTime: doc.data().startTime?.toDate(),
    endTime: doc.data().endTime?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as LearningSession[]
}

// Get session by ID
export async function getSessionById(id: string): Promise<LearningSession | null> {
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
    startTime: docSnap.data().startTime?.toDate(),
    endTime: docSnap.data().endTime?.toDate(),
    createdAt: docSnap.data().createdAt?.toDate(),
  } as LearningSession
}

// Create new learning session
export async function createLearningSession(sessionData: Omit<LearningSession, "id" | "createdAt">): Promise<string> {
  const docRef = await addDoc(getSessionsCollection(), {
    ...sessionData,
    startTime: Timestamp.fromDate(sessionData.startTime),
    endTime: sessionData.endTime ? Timestamp.fromDate(sessionData.endTime) : null,
    createdAt: Timestamp.now(),
  })

  return docRef.id
}

// Get all sessions for a textbook
export async function getTextbookSessions(textbookId: string): Promise<LearningSession[]> {
  const q = query(getSessionsCollection(), where("textbookId", "==", textbookId), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startTime: doc.data().startTime?.toDate(),
    endTime: doc.data().endTime?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as LearningSession[]
}
// Get all recent sessions (for admin dashboard)
export async function getAllRecentSessions(limitCount = 10): Promise<LearningSession[]> {
  const q = query(getSessionsCollection(), orderBy("createdAt", "desc"), limit(limitCount))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startTime: doc.data().startTime?.toDate(),
    endTime: doc.data().endTime?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as LearningSession[]
}
