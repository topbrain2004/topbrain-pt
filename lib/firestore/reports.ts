import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, Timestamp } from "@firebase/firestore"
import { getDb } from "@/lib/firebase"
import { Report, LearningSession, Textbook } from "./types"
import { getStudentSessions } from "./sessions"
import { getTextbookById } from "./textbooks"

const COLLECTION_NAME = "reports"

function getReportsCollection() {
  const db = getDb()
  if (!db) throw new Error("Firestore is not initialized")
  return collection(db, COLLECTION_NAME)
}

// === CRUD Operations ===

export async function createReport(reportData: Omit<Report, "id" | "createdAt">): Promise<string> {
  const docRef = await addDoc(getReportsCollection(), {
    ...reportData,
    createdAt: Timestamp.now(),
    sentAt: reportData.sentAt ? Timestamp.fromDate(reportData.sentAt) : null,
  })
  return docRef.id
}

export async function getReportsByStudent(studentId: string): Promise<Report[]> {
  const q = query(getReportsCollection(), where("studentId", "==", studentId), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    sentAt: doc.data().sentAt?.toDate(),
  })) as Report[]
}

export async function getReportsByAcademy(academyId: string): Promise<Report[]> {
  const q = query(getReportsCollection(), where("academyId", "==", academyId), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    sentAt: doc.data().sentAt?.toDate(),
  })) as Report[]
}

export async function getAllReports(): Promise<Report[]> {
  const q = query(getReportsCollection(), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    sentAt: doc.data().sentAt?.toDate(),
  })) as Report[]
}

export async function updateReport(reportId: string, updates: Partial<Report>) {
  const db = getDb()
  if (!db) throw new Error("Firestore init error")
  const docRef = doc(db, COLLECTION_NAME, reportId)
  await updateDoc(docRef, { ...updates })
}

export async function deleteReport(reportId: string): Promise<void> {
  const db = getDb()
  if (!db) throw new Error("Firestore init error")
  const docRef = doc(db, COLLECTION_NAME, reportId)
  await deleteDoc(docRef)
}


// === Statistics & Aggregation Logic ===

// Helper: Fetch domains for sessions
// This is expensive as it fetches textbooks. Should be cached in production.
async function enrichSessionsWithDomains(sessions: LearningSession[]): Promise<any[]> {
  const textbookCache: Record<string, Textbook> = {}
  const enriched = []

  for (const session of sessions) {
    if (!textbookCache[session.textbookId]) {
      const tb = await getTextbookById(session.textbookId)
      if (tb) textbookCache[session.textbookId] = tb as unknown as Textbook
    }

    const textbook = textbookCache[session.textbookId]
    if (!textbook) {
      enriched.push({ ...session, domainResults: {} })
      continue
    }

    // Find domain for each result
    const domainResults: Record<string, { correct: number, total: number }> = {}

    // Need to iterate through session results and find matching problem in textbook
    // Session results keys are problem numbers
    Object.entries(session.results).forEach(([numStr, result]) => {
      const problemNum = Number(numStr)
      // Flatten textbook problems to find the one with this number
      // Note: Data structure of textbook is complex (subUnits). 
      // We need a helper to find problem by number in textbook.
      let problem = textbook.problems?.find(p => p.number === problemNum)

      // If not in main, check subUnits
      if (!problem && textbook.subUnits) {
        Object.values(textbook.subUnits).forEach(sub => {
          const found = sub.problems.find(p => p.number === problemNum)
          if (found) problem = found
        })
      }

      if (problem && problem.domain) {
        const dom = problem.domain
        if (!domainResults[dom]) domainResults[dom] = { correct: 0, total: 0 }
        domainResults[dom].total++
        if (result.correct) domainResults[dom].correct++
      }
    })

    enriched.push({ ...session, domainResults })
  }
  return enriched
}


export async function generateMonthlyStats(studentId: string, year: number, month: number) {
  // 1. Fetch sessions for the specific month range (0-indexed month)
  // month parameter is 0-11
  const startDate = new Date(year, month, 1)
  // To get the last day of the month, we go to the 0th day of the next month
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999)

  const { getSessionsByDateRange } = await import("./sessions")
  const rawSessions = await getSessionsByDateRange(studentId, startDate, endDate)

  // Filter: Keep only the 1st submission for each content (deduplication)
  // Key: Textbook + SubUnit + Page
  // Logic: Sort by Date ASC (Oldest first), take first occurrence.
  const sortedSessions = [...rawSessions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const uniqueContentKeys = new Set<string>()
  const targetSessions: any[] = []

  sortedSessions.forEach(s => {
    // Construct unique key for the content
    // Use fallback for subUnit if undefined
    const key = `${s.textbookId}-${s.subUnit || 'no_unit'}-${s.page}`

    if (!uniqueContentKeys.has(key)) {
      uniqueContentKeys.add(key)
      targetSessions.push(s)
    }
  })

  // 3. Aggregate Basic Stats
  let totalProblems = 0
  let correctAnswers = 0
  let learningTime = 0
  const attendanceDates = new Set<string>()

  targetSessions.forEach(s => {
    totalProblems += s.totalQuestions
    correctAnswers += s.correctCount
    learningTime += (s.readingTime || 0) + (s.solvingTime || 0)
    attendanceDates.add(new Date(s.createdAt).toDateString())
  })

  // 4. Domain Analysis
  // Need to look up definitions from Textbooks to get 'Domain' (Fact, Inference, etc)
  const enriched = await enrichSessionsWithDomains(targetSessions)

  // Intentionally empty to let it populate dynamically from actual data
  const domainScores: Record<string, { correct: number, total: number, score: number }> = {}

  enriched.forEach(s => {
    Object.entries(s.domainResults).forEach(([domain, stats]: [string, any]) => {
      if (!domainScores[domain]) domainScores[domain] = { correct: 0, total: 0, score: 0 }
      domainScores[domain].correct += stats.correct
      domainScores[domain].total += stats.total
    })
  })

  // Calculate percentages
  Object.keys(domainScores).forEach(d => {
    domainScores[d].score = domainScores[d].total > 0
      ? Math.round((domainScores[d].correct / domainScores[d].total) * 100)
      : 0
  })

  // 5. Weekly Trend Analysis
  // Group by week of month (Week 1, Week 2, ...)
  const weeklyMap: Record<string, number> = { "1주차": 0, "2주차": 0, "3주차": 0, "4주차": 0, "5주차": 0 }

  targetSessions.forEach(s => {
    const d = new Date(s.createdAt)
    const date = d.getDate()
    const weekNum = Math.ceil(date / 7)
    const key = `${weekNum}주차`
    if (weeklyMap[key] !== undefined) {
      weeklyMap[key] += s.totalQuestions
    }
  })

  const weeklyTrend = Object.entries(weeklyMap).map(([label, count]) => ({ label, count }))

  // 6. Textbook/Unit Breakdown
  const textbookStats: Record<string, { total: number, correct: number, score: number }> = {}

  targetSessions.forEach(s => {
    const tbName = s.textbookName || "Unknown Textbook"
    if (!textbookStats[tbName]) {
      textbookStats[tbName] = { total: 0, correct: 0, score: 0 }
    }
    textbookStats[tbName].total += s.totalQuestions
    textbookStats[tbName].correct += s.correctCount
  })

  // Calculate scores
  Object.keys(textbookStats).forEach(tb => {
    const stat = textbookStats[tb]
    stat.score = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0
  })

  return {
    totalProblems,
    correctAnswers,
    averageScore: totalProblems > 0 ? Math.round((correctAnswers / totalProblems) * 100) : 0,
    learningTime,
    attendanceDays: attendanceDates.size,
    domainScores,
    weeklyTrend,
    textbookStats
  }
}
