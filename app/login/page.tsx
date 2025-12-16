"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen } from "lucide-react"
import { signIn, signUp, saveAuthToStorage } from "@/lib/auth"
import { getAccountByEmail, createAccount, updateLastLogin, updateAccount } from "@/lib/firestore/accounts"
import {
  getStudentByPersonalId,
  getStudentByEmail,
  getStudentByNameAndAcademy,
  getStudentsByAcademyId,
  getStudentsByName,
} from "@/lib/firestore/students"

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), ms))])
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const convertUsernameToEmail = (username: string): string => {
    if (username.includes("@")) return username
    return `${username}@literacy.app`
  }

  const createDefaultAdminIfNeeded = async (email: string, password: string) => {
    if (email === "admin@literacy.app" && password === "admin1234!") {
      try {
        console.log("[v0] Attempting to create default admin account...")
        const user = await signUp(email, password)

        await createAccount({
          email: email,
          displayName: "최고 관리자",
          role: "관리자",
          status: "approved",
          createdBy: "system",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        })

        console.log("[v0] Default admin account created successfully")
        return user
      } catch (error: any) {
        if (error.code === "auth/email-already-in-use") {
          console.log("[v0] Admin account already exists in Firebase Auth")
          return null
        }
        console.error("[v0] Error creating default admin:", error)
        throw error
      }
    }
    return null
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const email = convertUsernameToEmail(username)
      console.log("[v0] Starting login process for:", email)

      sessionStorage.removeItem("auth")

      let user
      try {
        user = await signIn(email, password)
        console.log("[v0] Firebase sign in successful, uid:", user.uid)
      } catch (signInError: any) {
        console.log("[v0] Sign in error:", signInError.code)

        let recoverSuccess = false

        // 1. Try Default Admin Recovery
        if (signInError.code === "auth/invalid-credential" || signInError.code === "auth/user-not-found") {
          const createdAdmin = await createDefaultAdminIfNeeded(email, password)
          if (createdAdmin) {
            user = await signIn(email, password)
            recoverSuccess = true
          }
        }

        // 2. Try Student "Lazy Registration" Recovery
        // (For students created by Director who exist in DB but not in Auth)
        if (!recoverSuccess && (signInError.code === "auth/invalid-credential" || signInError.code === "auth/user-not-found")) {
          console.log("[v0] Login failed. Checking if student exists in DB for lazy registration...")
          try {
            // Determine if we should check 'students' collection
            // We use the same finding logic as below, or simple by email
            // Note: getStudentByEmail handles username conversion internally if needed? 
            // Actually convertUsernameToEmail(username) gave us 'email'.
            const existingStudent = await getStudentByEmail(email)

            if (existingStudent) {
              console.log("[v0] Found student in DB:", existingStudent.id)
              // Check password (In a real app, hash this! But here stored as plain from Director)
              if (existingStudent.password === password) {
                console.log("[v0] Password matches DB. Creating missing Auth user...")
                // Create the Auth user now
                user = await signUp(email, password)
                console.log("[v0] Auth user created/restored successfully.")
                recoverSuccess = true
              } else {
                console.log("[v0] Password mismatch for DB student.")
              }
            } else {
              console.log("[v0] No matching student found in DB.")
            }
          } catch (recoveryErr) {
            console.error("[v0] Lazy registration failed:", recoveryErr)
          }
        }

        if (!recoverSuccess) {
          throw signInError
        }
      }

      if (email === "admin@literacy.app") {
        console.log("[v0] Admin login detected, checking Firestore account...")

        let account = null

        // Try to get account with 3 second timeout
        try {
          console.log("[v0] Calling getAccountByEmail for admin...")
          account = await withTimeout(getAccountByEmail(email), 3000)
          console.log("[v0] getAccountByEmail result:", account ? "found" : "not found")
        } catch (firestoreError: any) {
          console.log("[v0] Firestore getAccountByEmail error or timeout:", firestoreError.message)
        }

        // If no account found, try to create with 3 second timeout
        if (!account) {
          console.log("[v0] Admin account not in Firestore, attempting to create...")
          try {
            await withTimeout(
              createAccount({
                email: email,
                displayName: "최고 관리자",
                role: "관리자",
                status: "approved",
                createdBy: "system",
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
              }),
              3000,
            )
            console.log("[v0] Admin account created, fetching...")
            account = await withTimeout(getAccountByEmail(email), 3000)
          } catch (createError: any) {
            console.log("[v0] Error or timeout creating admin account:", createError.message)
          }
        }

        if (!account) {
          console.log("[v0] Using fallback admin data")
          account = {
            id: "fallback-admin",
            email: email,
            displayName: "최고 관리자",
            role: "관리자" as const,
            status: "approved" as const,
            createdBy: "system",
            createdAt: new Date().toISOString(),
          }
        }

        // Try to update last login (with short timeout, non-blocking)
        if (account.id !== "fallback-admin") {
          try {
            await withTimeout(updateLastLogin(account.id), 2000)
            console.log("[v0] Last login updated")
          } catch (updateError) {
            console.log("[v0] Could not update last login, continuing...")
          }
        }

        console.log("[v0] Saving auth to storage...")
        saveAuthToStorage({
          uid: user.uid,
          email: account.email,
          displayName: account.displayName,
          role: account.role,
          status: account.status,
        })
        console.log("[v0] Auth saved to storage")

        console.log("[v0] Calling router.push('/admin')...")
        router.push("/admin")
        console.log("[v0] router.push called")
        return
      }

      console.log("[v0] Non-admin login, fetching account from Firestore...")
      const account = await getAccountByEmail(email)
      console.log("[v0] Account fetch result:", account ? `found (role: ${account.role})` : "not found")

      if (!account) {
        setError("계정 정보를 찾을 수 없습니다.")
        setIsLoading(false)
        return
      }

      if (account.status === "pending") {
        setError("계정 승인 대기 중입니다.")
        setIsLoading(false)
        return
      }

      if (account.status === "rejected") {
        setError("계정 승인이 거부되었습니다.")
        setIsLoading(false)
        return
      }

      console.log("[v0] Updating last login for account:", account.id)
      await updateLastLogin(account.id)

      const authData: any = {
        uid: user.uid,
        email: account.email,
        displayName: account.displayName,
        role: account.role,
        status: account.status,
      }

      if (account.role === "원장" && account.academyId) {
        authData.academyId = account.academyId
        authData.academyName = account.academyName
      }

      if (account.role === "학생") {
        if (account.academyId) {
          authData.academyId = account.academyId
        }
        authData.grade = account.grade

        if (account.studentId) {
          console.log("[v0] Using studentId from account record:", account.studentId)
          authData.studentId = account.studentId
        } else {
          // Try to find and link the student record
          try {
            let student = null

            // Strategy 1: Try by personalId (username without @domain)
            console.log("[v0] Finding student by personalId:", username)
            student = await getStudentByPersonalId(username)
            console.log("[v0] Strategy 1 (personalId) result:", student ? `found: ${student.id}` : "not found")

            // Strategy 2: Try by email pattern
            if (!student) {
              console.log("[v0] Finding student by email:", email)
              student = await getStudentByEmail(email)
              console.log("[v0] Strategy 2 (email) result:", student ? `found: ${student.id}` : "not found")
            }

            // Strategy 3: Try by displayName and academyId
            if (!student && account.displayName && account.academyId) {
              console.log("[v0] Finding student by name+academy:", account.displayName, account.academyId)
              student = await getStudentByNameAndAcademy(account.displayName, account.academyId)
              console.log("[v0] Strategy 3 (name+academy) result:", student ? `found: ${student.id}` : "not found")
            }

            // Strategy 4: Get all students in academy and find by name match
            if (!student && account.academyId) {
              console.log("[v0] Finding student by name in academy students list")
              const studentsInAcademy = await getStudentsByAcademyId(account.academyId)
              console.log("[v0] Students in academy:", studentsInAcademy.map((s) => `${s.name}(${s.id})`).join(", "))
              student =
                studentsInAcademy.find(
                  (s) => s.name === account.displayName || s.name === username || s.personalId === username,
                ) || null
              if (student) {
                console.log("[v0] Strategy 4 (academy list) found student:", student.id, student.name)
              } else {
                console.log("[v0] Strategy 4 (academy list) result: not found")
              }
            }

            if (!student) {
              console.log("[v0] Strategy 5: Trying to find by displayName only:", account.displayName)
              const studentsByName = await getStudentsByName(account.displayName)
              if (studentsByName.length > 0) {
                student = studentsByName[0]
                console.log("[v0] Strategy 5 (name only) found student:", student.id, student.name)
              } else {
                console.log("[v0] Strategy 5 (name only) result: not found")
              }
            }

            if (student) {
              authData.studentId = student.id
              // Also store academyId from student record if not already set
              if (!authData.academyId && student.academyId) {
                authData.academyId = student.academyId
              }
              console.log("[v0] Student record linked - studentId:", student.id, "academyId:", student.academyId)

              try {
                await updateAccount(account.id, { studentId: student.id })
                console.log("[v0] Saved studentId to account record for future logins")
              } catch (updateErr) {
                console.error("[v0] Failed to save studentId to account:", updateErr)
              }
            } else {
              console.log("[v0] ❌ CRITICAL: No student record found. Stats will NOT sync to Firestore.")
              console.log(
                "[v0] Tried: personalId=" + username + ", email=" + email + ", displayName=" + account.displayName,
              )
              console.log("[v0] Account academyId:", account.academyId)
              console.log("[v0] Please ensure student is registered in students collection with matching data.")
            }
          } catch (err) {
            console.error("[v0] Error finding student record:", err)
          }
        }

        console.log("[v0] === STUDENT LOGIN SUMMARY ===")
        console.log("[v0] studentId:", authData.studentId || "NOT SET")
        console.log("[v0] academyId:", authData.academyId || "NOT SET")
        console.log("[v0] displayName:", authData.displayName)
        console.log("[v0] If studentId is NOT SET, learning results will NOT sync to director dashboard!")
      }

      console.log("[v0] Saving auth data:", JSON.stringify(authData))
      saveAuthToStorage(authData)

      await new Promise((resolve) => setTimeout(resolve, 100))

      console.log("[v0] Redirecting based on role:", account.role)
      if (account.role === "학생") {
        router.push("/student")
      } else if (account.role === "원장") {
        router.push("/director")
      } else if (account.role === "관리자") {
        router.push("/admin")
      }
      console.log("[v0] router.push called for role:", account.role)
    } catch (error: any) {
      console.error("[v0] Login error:", error)
      console.error("[v0] Error code:", error.code)
      console.error("[v0] Error message:", error.message)
      if (error.code === "auth/invalid-credential") {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.")
      } else if (error.code === "auth/user-not-found") {
        setError("존재하지 않는 계정입니다.")
      } else if (error.code === "auth/wrong-password") {
        setError("비밀번호가 올바르지 않습니다.")
      } else {
        setError("로그인에 실패했습니다. 다시 시도해주세요.")
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md relative z-10 border-none">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-100 to-purple-100 rounded-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-orange-500" />
          </div>
          <CardTitle className="text-3xl font-bold font-serif text-gray-900">탑브레인 문해력PT</CardTitle>
          <CardDescription className="text-base font-sans">프리미엄 문해력 코칭 시스템</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold text-gray-700">
                아이디
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="아이디를 입력하세요"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="focus-visible:ring-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-gray-700">
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="focus-visible:ring-orange-500"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 font-medium">{error}</div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              variant="gradient"
              className="w-full py-6 text-lg font-bold shadow-lg shadow-orange-500/20"
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">계정이 없으신가요? 관리자에게 문의하세요.</p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
