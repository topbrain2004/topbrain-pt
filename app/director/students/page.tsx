"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, UserPlus, Eye, TrendingUp, TrendingDown, RefreshCw, Trash2 } from "lucide-react"
import { getAuthFromStorage } from "@/lib/auth"
import { getStudentAccountsWithStats, createAccount, deleteAccount } from "@/lib/firestore/accounts"
import { BackButton } from "@/components/ui/back-button"

interface StudentDisplay {
  id: string
  name: string
  grade: string
  totalProblems: number
  correctAnswers: number
  averageScore: number
  lastActivity: string
}

export default function DirectorStudentsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [students, setStudents] = useState<StudentDisplay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [academyId, setAcademyId] = useState<string>("")
  const [academyName, setAcademyName] = useState<string>("")

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<StudentDisplay | null>(null)
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    password: "",
    grade: "",
    parentContact: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      // Self-heal auth before checking
      const { refreshAuth } = await import("@/lib/auth")
      await refreshAuth()

      const auth = getAuthFromStorage()
      console.log("[DirectorStudents] Checking auth:", auth)

      if (!auth) {
        console.log("[DirectorStudents] No auth found, redirecting to login")
        router.push("/login")
        return
      }

      if (auth.role !== "원장") {
        console.log("[DirectorStudents] Role mismatch:", auth.role)
        // Smart redirect based on actual role
        if (auth.role === "관리자") router.push("/admin")
        else if (auth.role === "학생") router.push("/student")
        else router.push("/login")
        return
      }

      if (!auth.academyId) {
        console.log("[DirectorStudents] No academyId found")
        alert("배정된 학원이 없습니다.")
        setIsLoading(false)
        return
      }

      setAcademyId(auth.academyId)
      setAcademyName(auth.academyName || "")
      loadStudents(auth.academyId)
    }

    checkAuth()
  }, []) // Remove router dependency to avoid unstable re-runs

  const loadStudents = async (academyId: string) => {
    setIsLoading(true)
    try {
      console.log("[v0] Loading students from ACCOUNTS collection for academy:", academyId)
      const accountsData = await getStudentAccountsWithStats(academyId)
      console.log("[v0] Student accounts loaded:", accountsData.length)

      const mappedStudents: StudentDisplay[] = accountsData.map((account) => ({
        id: account.id,
        name: account.name || "이름 없음",
        grade: account.grade || "미설정",
        totalProblems: account.totalProblems || 0,
        correctAnswers: account.correctAnswers || 0,
        averageScore: account.averageScore || 0,
        lastActivity: account.lastActivity ? new Date(account.lastActivity).toLocaleDateString("ko-KR") : "활동 없음",
      }))

      setStudents(mappedStudents)
    } catch (error) {
      console.error("[v0] Failed to load students:", error)
      alert("학생 목록을 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    if (academyId) {
      loadStudents(academyId)
    }
  }

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.password) {
      alert("이름, 이메일, 비밀번호는 필수 항목입니다.")
      return
    }

    if (!academyId) {
      alert("학원 정보를 찾을 수 없습니다.")
      return
    }

    setIsSubmitting(true)
    const auth = getAuthFromStorage()
    try {
      // Auto-append domain if missing
      let safeEmail = newStudent.email.trim()
      if (!safeEmail.includes("@")) {
        safeEmail = `${safeEmail}@literacy.app`
      }
      console.log("[v0] Creating student profile and account:", newStudent.name, safeEmail)

      // 1. Create Student Profile (stores phone, grade, etc.)
      const { createStudent } = await import("@/lib/firestore/students")
      const studentId = await createStudent({
        name: newStudent.name,
        personalId: safeEmail.split("@")[0], // Simple personal ID from email
        password: newStudent.password, // Ideally hashed, but storing plain for this demo/test?
        grade: newStudent.grade || "미설정",
        phone: newStudent.parentContact || "", // Store contact in phone field? Or parentPhone?
        parentPhone: newStudent.parentContact || "",
        totalProblems: 0,
        correctAnswers: 0,
        averageScore: 0,
        totalLearningTime: 0,
        lastActivity: new Date().toISOString(),
        academyId: academyId,
        directorId: auth?.uid,
      })

      console.log("[v0] Student profile created with ID:", studentId)

      // 2. Create Account (stores login info)
      const accountId = await createAccount({
        email: safeEmail,
        displayName: newStudent.name,
        role: "학생",
        academyId: academyId,
        academyName: academyName,
        studentId: studentId, // Link to the profile!
        grade: newStudent.grade || "미설정",
        createdBy: academyId,
        createdAt: new Date().toISOString(),
        status: "approved",
        totalProblems: 0,
        correctAnswers: 0,
        averageScore: 0,
        totalLearningTime: 0,
        lastActivity: new Date().toISOString(),
      })

      console.log("[v0] Student account created with ID:", accountId)

      // 목록에 새 학생 추가
      const newStudentDisplay: StudentDisplay = {
        id: accountId,
        name: newStudent.name,
        grade: newStudent.grade || "미설정",
        totalProblems: 0,
        correctAnswers: 0,
        averageScore: 0,
        lastActivity: new Date().toLocaleDateString("ko-KR"),
      }
      setStudents([...students, newStudentDisplay])

      // 폼 초기화 및 다이얼로그 닫기
      setNewStudent({ name: "", email: "", password: "", grade: "", parentContact: "" })
      setIsAddDialogOpen(false)
      alert("학생이 성공적으로 추가되었습니다!")
    } catch (error) {
      console.error("[v0] Failed to create student:", error)
      alert("학생 추가 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return

    try {
      console.log("[v0] Deleting student:", studentToDelete.id)
      await deleteAccount(studentToDelete.id)

      setStudents(students.filter((s) => s.id !== studentToDelete.id))
      setIsDeleteDialogOpen(false)
      setStudentToDelete(null)
      alert("학생이 삭제되었습니다.")
    } catch (error) {
      console.error("[v0] Failed to delete student:", error)
      alert("학생 삭제 중 오류가 발생했습니다.")
    }
  }

  const filteredStudents = students.filter((student) => {
    const studentName = student.name || ""
    const query = searchQuery || ""
    return studentName.toLowerCase().includes(query.toLowerCase())
  })

  const getTrend = (student: StudentDisplay) => {
    if (student.averageScore >= 85) return "up"
    if (student.averageScore < 70) return "down"
    return "stable"
  }



  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 font-serif">학생 관리</h1>
          <p className="text-gray-500 text-lg">우리 학원 학생들의 정보 및 학습 현황을 관리합니다.</p>
        </div>

        <Card className="mb-6 border-none shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-gray-900">학생 목록 ({students.length}명)</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 bg-white"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  새로고침
                </Button>
                <Button variant="gradient" onClick={() => setIsAddDialogOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  학생 추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="학생 이름으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-200"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">학생이 없습니다.</p>
                <p className="text-sm">학생 추가 버튼을 클릭하여 새로운 학생을 등록하세요.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-gray-700 font-semibold">이름</TableHead>
                      <TableHead className="text-gray-700 font-semibold">학년</TableHead>
                      <TableHead className="text-gray-700 font-semibold">푼 문제</TableHead>
                      <TableHead className="text-gray-700 font-semibold">정답률</TableHead>
                      <TableHead className="text-gray-700 font-semibold">평균 점수</TableHead>
                      <TableHead className="text-gray-700 font-semibold">추세</TableHead>
                      <TableHead className="text-gray-700 font-semibold">마지막 활동</TableHead>
                      <TableHead className="text-gray-700 font-semibold text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const trend = getTrend(student)
                      return (
                        <TableRow key={student.id} className="hover:bg-gray-50">
                          <TableCell className="font-semibold text-gray-900">{student.name}</TableCell>
                          <TableCell className="text-gray-600">{student.grade}</TableCell>
                          <TableCell className="text-gray-600">{student.totalProblems}개</TableCell>
                          <TableCell className="text-gray-600">
                            {student.totalProblems > 0
                              ? Math.round((student.correctAnswers / student.totalProblems) * 100)
                              : 0}
                            %
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                student.averageScore >= 90
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : student.averageScore >= 80
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-orange-50 text-orange-700 border-orange-200"
                              }
                            >
                              {student.averageScore}점
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {trend === "up" && <TrendingUp className="w-5 h-5 text-green-600" />}
                            {trend === "down" && <TrendingDown className="w-5 h-5 text-red-600" />}
                            {trend === "stable" && <span className="text-green-700">-</span>}
                          </TableCell>
                          <TableCell className="text-green-700">{student.lastActivity}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                              >
                                <Link href={`/director/students/${student.id}`}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  상세보기
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setStudentToDelete(student)
                                  setIsDeleteDialogOpen(true)
                                }}
                                className="text-red-600 hover:bg-red-600 hover:text-white"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                삭제
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-green-900">새 학생 추가</DialogTitle>
            <DialogDescription className="text-green-700">새로운 학생의 정보를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-gray-900">
                학생 이름 *
              </Label>
              <Input
                id="name"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                placeholder="홍길동"
                className="border-gray-200"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-gray-900">
                이메일 (로그인 ID) *
              </Label>
              <Input
                id="email"
                type="email"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                placeholder="student@example.com"
                className="border-gray-200"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-gray-900">
                비밀번호 *
              </Label>
              <Input
                id="password"
                type="password"
                value={newStudent.password}
                onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                placeholder="비밀번호를 입력하세요"
                className="border-gray-200"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grade" className="text-gray-900">
                학년
              </Label>
              <Select
                value={newStudent.grade}
                onValueChange={(value) => setNewStudent({ ...newStudent, grade: value })}
              >
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="학년을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="초등 1학년">초등 1학년</SelectItem>
                  <SelectItem value="초등 2학년">초등 2학년</SelectItem>
                  <SelectItem value="초등 3학년">초등 3학년</SelectItem>
                  <SelectItem value="초등 4학년">초등 4학년</SelectItem>
                  <SelectItem value="초등 5학년">초등 5학년</SelectItem>
                  <SelectItem value="초등 6학년">초등 6학년</SelectItem>
                  <SelectItem value="중등 1학년">중등 1학년</SelectItem>
                  <SelectItem value="중등 2학년">중등 2학년</SelectItem>
                  <SelectItem value="중등 3학년">중등 3학년</SelectItem>
                  <SelectItem value="고등 1학년">고등 1학년</SelectItem>
                  <SelectItem value="고등 2학년">고등 2학년</SelectItem>
                  <SelectItem value="고등 3학년">고등 3학년</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parentContact" className="text-gray-900">
                학부모 연락처
              </Label>
              <Input
                id="parentContact"
                value={newStudent.parentContact}
                onChange={(e) => setNewStudent({ ...newStudent, parentContact: e.target.value })}
                placeholder="010-1234-5678"
                className="border-gray-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              className="border-gray-200 text-gray-700"
            >
              취소
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={isSubmitting}
              variant="gradient"
              className="text-white"
            >
              {isSubmitting ? "추가 중..." : "추가하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">학생 삭제</DialogTitle>
            <DialogDescription className="text-gray-600">
              정말로 <span className="font-bold text-green-900">{studentToDelete?.name}</span> 학생을 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setStudentToDelete(null)
              }}
              className="border-green-600/30 text-green-700"
            >
              취소
            </Button>
            <Button onClick={handleDeleteStudent} className="bg-red-600 hover:bg-red-700 text-white">
              삭제하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}
