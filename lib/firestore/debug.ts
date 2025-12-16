import { getDocs, query, collection, writeBatch, where, doc, setDoc, updateDoc } from "@firebase/firestore"
import { getDb } from "@/lib/firebase"

export async function resetAllData(academyId?: string, force: boolean = false): Promise<void> {
    const db = getDb()
    if (!db) throw new Error("Firestore is not initialized")
    const batch = writeBatch(db)

    console.log(`[Debug] Starting GLOBAL data cleanup (Force: ${force}, preserving '윤온유' only if force=false)`)

    // 1. Cleanup 'students' collection (The detailed student profiles)
    // Query ALL students to ensure we catch everything
    const studentsRef = collection(db, "students")
    const studentsSnapshot = await getDocs(studentsRef)

    const studentIdsToDelete: string[] = []

    studentsSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        // Delete everyone if force is true. If not force, keep Yoon Onyu.
        if (force || data.name !== "윤온유") {
            batch.delete(doc.ref)
            studentIdsToDelete.push(doc.id)
        } else {
            // Reset stats for Yoon Onyu instead of preserving
            batch.update(doc.ref, {
                totalProblems: 0,
                correctAnswers: 0,
                averageScore: 0,
                totalLearningTime: 0,
                lastActivity: new Date().toISOString(),
            })
        }
    })

    // 2. Cleanup 'accounts' collection (The login accounts)
    // Query ALL student accounts
    const accountsRef = collection(db, "accounts")
    const qAccounts = query(
        accountsRef,
        where("role", "==", "학생")
    )
    const accountsSnapshot = await getDocs(qAccounts)

    accountsSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        // Double check it's a student to be safe
        if (data.role === "학생") {
            if (force || (data.displayName !== "윤온유" && data.name !== "윤온유")) {
                batch.delete(doc.ref)
            } else {
                // Reset stats for Yoon Onyu account
                batch.update(doc.ref, {
                    totalProblems: 0,
                    correctAnswers: 0,
                    averageScore: 0,
                    totalLearningTime: 0,
                    lastActivity: new Date().toISOString(),
                })
            }
        }
    })

    // 3. Delete ALL learning sessions for ALL students found
    const sessionsRef = collection(db, "learning_sessions")

    // Iterate through ALL students (deleted and kept) to clean their sessions
    for (const studentDoc of studentsSnapshot.docs) {
        const qSessions = query(sessionsRef, where("studentId", "==", studentDoc.id))
        const sessionsSnapshot = await getDocs(qSessions)
        sessionsSnapshot.docs.forEach((sessionDoc) => {
            batch.delete(sessionDoc.ref)
        })
    }

    await batch.commit()
    console.log(`[Debug] Global cleanup complete. Reset stats for Yoon Onyu.`)
}

export async function seedYoonOnyuData(): Promise<void> {
    const { createLearningSession } = await import("./sessions")
    const { updateStudentStats, getStudentsByName } = await import("./students")

    // Find Yoon Onyu
    const students = await getStudentsByName("윤온유")
    if (students.length === 0) {
        throw new Error("윤온유 student not found")
    }
    const student = students[0]

    // Create 3 mock sessions
    const now = new Date()

    // Session 1
    await createLearningSession({
        studentId: student.id,
        textbookId: "textbook-1",
        textbookName: "초등 국어 5-1",
        page: 12,
        startTime: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        endTime: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 45), // 45 mins
        readingTime: 1800, // 30 min
        solvingTime: 900, // 15 min
        totalQuestions: 20,
        correctCount: 18,
        results: {}
    })

    // Session 2
    await createLearningSession({
        studentId: student.id,
        textbookId: "textbook-2",
        textbookName: "중학 문해력 기초",
        page: 5,
        startTime: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
        endTime: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1 + 1000 * 60 * 30), // 30 mins
        readingTime: 600, // 10 min
        solvingTime: 1200, // 20 min
        totalQuestions: 15,
        correctCount: 15,
        results: {}
    })

    // Update Stats manually 
    await updateStudentStats(student.id, 33, 35, 4500, 95)

    console.log("[Debug] Seeding Yoon Onyu data complete")
}

export async function cleanupOrphanedStudents(): Promise<void> {
    const db = getDb()
    if (!db) throw new Error("Firestore is not initialized")
    const batch = writeBatch(db)

    console.log("[Debug] Starting orphaned student cleanup...")

    // 1. Get all students
    const studentsRef = collection(db, "students")
    const studentsSnapshot = await getDocs(studentsRef)

    // 2. Get all accounts with a studentId
    const accountsRef = collection(db, "accounts")
    const qAccounts = query(accountsRef, where("role", "==", "학생"))
    const accountsSnapshot = await getDocs(qAccounts)

    const validStudentIds = new Set<string>()
    accountsSnapshot.docs.forEach(doc => {
        const sid = doc.data().studentId
        if (sid) validStudentIds.add(sid)
    })

    let deletedCount = 0
    studentsSnapshot.docs.forEach((doc) => {
        if (!validStudentIds.has(doc.id)) {
            console.log(`[Debug] Found orphan student: ${doc.id} (${doc.data().name}). Deleting...`)
            batch.delete(doc.ref)
            deletedCount++
        }
    })

    if (deletedCount > 0) {
        await batch.commit()
    }
    console.log(`[Debug] Cleanup complete. Deleted ${deletedCount} orphaned students.`)
}

export async function restoreYoonOnyuAccount(): Promise<void> {
    const db = getDb()
    if (!db) throw new Error("Firestore is not initialized")

    console.log("[Debug] Restoring Yoon Onyu account...")

    // 1. Ensure Student Profile Exists
    const studentsRef = collection(db, "students")
    const qStudent = query(studentsRef, where("name", "==", "윤온유"))
    const studentSnap = await getDocs(qStudent)

    let studentId = ""
    if (studentSnap.empty) {
        console.log("[Debug] Yoon Onyu profile missing. Creating...")
        const newStudentRef = doc(studentsRef)
        await setDoc(newStudentRef, {
            name: "윤온유",
            grade: "초등 5학년",
            totalProblems: 0,
            correctAnswers: 0,
            averageScore: 0,
            totalLearningTime: 0,
            lastActivity: new Date().toISOString(),
            academyId: "system-academy"
        })
        studentId = newStudentRef.id
    } else {
        studentId = studentSnap.docs[0].id
        console.log(`[Debug] Found existing student profile: ${studentId}`)
    }

    // 2. Ensure Account Exists (for ID: 윤온유 -> 윤온유@literacy.app)
    const email = "윤온유@literacy.app"
    const accountsRef = collection(db, "accounts")
    const qAccount = query(accountsRef, where("email", "==", email))
    const accountSnap = await getDocs(qAccount)

    if (accountSnap.empty) {
        console.log("[Debug] Yoon Onyu account missing. Creating...")
        const newAccountRef = doc(accountsRef)
        await setDoc(newAccountRef, {
            email: email,
            displayName: "윤온유",
            role: "학생",
            status: "approved",
            grade: "초등 5학년",
            studentId: studentId,
            academyId: "system-academy",
            createdBy: "system",
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        })
        console.log(`[Debug] Created account ${newAccountRef.id} linked to student ${studentId}`)
    } else {
        console.log("[Debug] Account already exists. Ensuring link...")
        const accDoc = accountSnap.docs[0]
        if (accDoc.data().studentId !== studentId) {
            await updateDoc(accDoc.ref, { studentId: studentId })
            console.log("[Debug] Relinked account to student profile.")
        }
        // ... (existing code)
    }
}

export async function resetStatisticsOnly(): Promise<void> {
    const db = getDb()
    if (!db) throw new Error("Firestore is not initialized")
    const batch = writeBatch(db)

    console.log("[Debug] Starting Statistics Reset only (Keeping users, clearing sessions/scores)...")

    // 1. Delete ALL learning sessions
    const sessionsRef = collection(db, "learning_sessions")
    const sessionsSnapshot = await getDocs(sessionsRef)
    sessionsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
    })

    // 2. Reset stats for ALL students
    const studentsRef = collection(db, "students")
    const studentsSnapshot = await getDocs(studentsRef)
    studentsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
            totalProblems: 0,
            correctAnswers: 0,
            averageScore: 0,
            totalLearningTime: 0,
            lastActivity: null, // Reset activity
        })
    })

    // 3. Reset stats for ALL accounts
    const accountsRef = collection(db, "accounts")
    const accountsSnapshot = await getDocs(accountsRef)
    accountsSnapshot.docs.forEach((doc) => {
        if (doc.data().role === "학생") {
            batch.update(doc.ref, {
                totalProblems: 0,
                correctAnswers: 0,
                averageScore: 0,
                totalLearningTime: 0,
                // Do not reset lastLogin
            })
        }
    })

    await batch.commit()
    console.log("[Debug] Statistics reset complete.")
}
