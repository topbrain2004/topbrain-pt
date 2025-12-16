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

export interface Student {
  id: string
  name: string
  personalId: string
  password: string
  grade: string
  phone: string
  parentPhone: string
  totalProblems: number
  correctAnswers: number
  averageScore: number
  totalLearningTime: number // in seconds
  lastActivity: string
  academyId?: string
  directorId?: string
  createdAt: Date
  updatedAt: Date
}

const COLLECTION_NAME = "students"

function getStudentsCollection() {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  return collection(db, COLLECTION_NAME)
}

// Get all students
export async function getAllStudents(): Promise<Student[]> {
  const q = query(getStudentsCollection(), orderBy("name"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Student[]
}

// Get student by ID
export async function getStudentById(id: string): Promise<Student | null> {
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
  } as Student
}

// Get student by personal ID (for login)
export async function getStudentByPersonalId(personalId: string): Promise<Student | null> {
  const q = query(getStudentsCollection(), where("personalId", "==", personalId))
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
  } as Student
}

// Create new student
export async function createStudent(studentData: Omit<Student, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const docRef = await addDoc(getStudentsCollection(), {
    ...studentData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })

  return docRef.id
}

// Update student
export async function updateStudent(id: string, updates: Partial<Student>): Promise<void> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  const docRef = doc(db, COLLECTION_NAME, id)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  })
}

// Delete student
// Delete student
export async function deleteStudent(id: string): Promise<void> {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")

  // 1. Delete associated account first (if exists)
  try {
    const accountsRef = collection(db, "accounts")
    const q = query(accountsRef, where("studentId", "==", id))
    const snapshot = await getDocs(q)
    snapshot.docs.forEach(async (doc) => {
      await deleteDoc(doc.ref)
      console.log(`[v0] Deleted associated account ${doc.id} for student ${id}`)
    })
  } catch (e) {
    console.error("[v0] Error deleting associated account:", e)
  }

  // 2. Delete student profile
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
  console.log(`[v0] Deleted student profile ${id}`)
}

// Update student statistics after learning session
export async function updateStudentStats(
  studentId: string,
  correctAnswers: number,
  totalProblems: number,
  learningTime: number,
  score: number,
): Promise<void> {
  console.log("[v0] updateStudentStats called with:", { studentId, correctAnswers, totalProblems, learningTime, score })

  const student = await getStudentById(studentId)
  if (!student) {
    console.error("[v0] updateStudentStats: Student not found with ID:", studentId)
    throw new Error(`Student not found: ${studentId}`)
  }

  console.log("[v0] Current student stats:", {
    totalProblems: student.totalProblems,
    correctAnswers: student.correctAnswers,
    averageScore: student.averageScore,
    totalLearningTime: student.totalLearningTime,
  })

  const newTotalProblems = student.totalProblems + totalProblems
  const newCorrectAnswers = student.correctAnswers + correctAnswers
  const newTotalLearningTime = student.totalLearningTime + learningTime

  // Old formula was incorrect, now using proper weighted average
  const totalScoreSum = student.averageScore * student.totalProblems + score * totalProblems
  const newAverageScore = newTotalProblems > 0 ? Math.round(totalScoreSum / newTotalProblems) : score

  console.log("[v0] New calculated stats:", {
    newTotalProblems,
    newCorrectAnswers,
    newAverageScore,
    newTotalLearningTime,
  })

  await updateStudent(studentId, {
    totalProblems: newTotalProblems,
    correctAnswers: newCorrectAnswers,
    totalLearningTime: newTotalLearningTime,
    averageScore: newAverageScore,
    lastActivity: new Date().toISOString(),
  })

  console.log("[v0] Student stats updated in Firestore successfully")

  // Sync to accounts collection
  try {
    const accountsRef = collection(getDb()!, "accounts")
    const q = query(accountsRef, where("studentId", "==", studentId))
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      const accountDoc = snapshot.docs[0]
      await updateDoc(accountDoc.ref, {
        displayName: student.name, // Sync name in case it changed or was mismatching
        totalProblems: newTotalProblems,
        correctAnswers: newCorrectAnswers,
        totalLearningTime: newTotalLearningTime,
        averageScore: newAverageScore,
        lastActivity: new Date().toISOString(),
      })
      console.log("[v0] Account stats synced successfully")
    } else {
      console.log("[v0] No matching account found to sync stats")
    }
  } catch (error) {
    console.error("[v0] Failed to sync stats to account:", error)
  }
}

// Get students by academy ID
export async function getStudentsByAcademyId(academyId: string): Promise<Student[]> {
  const q = query(getStudentsCollection(), where("academyId", "==", academyId), orderBy("name"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Student[]
}

// Get students by director ID
export async function getStudentsByDirectorId(directorId: string): Promise<Student[]> {
  const q = query(getStudentsCollection(), where("directorId", "==", directorId), orderBy("name"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Student[]
}

// Find student by name and academy ID
export async function getStudentByNameAndAcademy(name: string, academyId: string): Promise<Student | null> {
  const q = query(getStudentsCollection(), where("name", "==", name), where("academyId", "==", academyId))
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
  } as Student
}

// Find student by email pattern
export async function getStudentByEmail(email: string): Promise<Student | null> {
  // Extract username from email (e.g., "윤온유@literacy.app" -> "윤온유")
  const username = email.split("@")[0]

  // First try to find by personalId matching username
  const student = await getStudentByPersonalId(username)
  if (student) return student

  // Then try to find by name matching username
  const q = query(getStudentsCollection(), where("name", "==", username))
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
  } as Student
}

// Find students by name only
export async function getStudentsByName(name: string): Promise<Student[]> {
  const q = query(getStudentsCollection(), where("name", "==", name))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Student[]
}
