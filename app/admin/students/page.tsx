"use client"

import { useState, useEffect, useCallback } from "react"
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
import { createStudent, deleteStudent, getAllStudents } from "@/lib/firestore/students"
import { getStudentAccountsByAcademy, type Account } from "@/lib/firestore/accounts"
import { getAllAcademies } from "@/lib/firestore/academies"
import { getAuthFromStorage } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { BackButton } from "@/components/ui/back-button"

interface Student {
  id: string
  name: string
  grade: string
  totalProblems: number
  correctAnswers: number
  averageScore: number
  lastActivity: string
  trend: "up" | "down" | "stable"
}

interface Academy {
  id: string
  name: string
}

interface StudentAccount extends Account {
  totalProblems?: number
  correctAnswers?: number
  averageScore?: number
  totalLearningTime?: number
}

export default function StudentsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [newStudent, setNewStudent] = useState({
    name: "",
    parentName: "",
    contact: "",
    username: "",
    password: "",
    academyId: "",
    grade: "",
  })

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [academyId, setAcademyId] = useState<string>("")
  const [academies, setAcademies] = useState<Academy[]>([])



  const loadStudents = useCallback(async () => {
    try {
      setLoading(true)
      const authData = getAuthFromStorage()
      if (!authData) {
        router.push("/login")
        return
      }

      if (authData.role !== "관리자") {
        // If logged in as another role, redirect to their dashboard instead of login
        if (authData.role === "원장") router.push("/director")
        else if (authData.role === "학생") router.push("/student")
        else router.push("/login") // Fallback
        return
      }

      // Admins can see all students
      const allStudents = await getAllStudents()
      console.log("[v0] Loaded all students:", allStudents.length)

      const mappedStudents: Student[] = allStudents.map((s) => ({
        id: s.id,
        name: s.name,
        grade: s.grade || "미설정",
        totalProblems: s.totalProblems || 0,
        correctAnswers: s.correctAnswers || 0,
        averageScore: s.averageScore || 0,
        lastActivity: s.lastActivity || "활동 없음",
        trend: "stable",
      }))

      setStudents(mappedStudents)
    } catch (error) {
      console.error("[v0] Error loading students:", error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    // Auto-refresh auth to ensure role validity
    const syncAuth = async () => {
      try {
        const { refreshAuth } = await import("@/lib/auth")
        await refreshAuth()
      } catch (error) {
        console.error("Auth refresh failed:", error)
      } finally {
        // Only load students after attempting refresh
        loadStudents()
      }
    }
    syncAuth()
  }, [loadStudents])

  const filteredStudents = students.filter((student) => student.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleAddStudent = async () => {
    console.log("[v0] handleAddStudent called - START")
    try {
      if (!newStudent.name || !newStudent.username || !newStudent.password) {
        console.log("[v0] Validation failed: missing required fields")
        alert("이름, 아이디, 비밀번호는 필수 항목입니다.")
        return
      }

      if (!academyId) {
        console.log("[v0] Validation failed: no academyId available")
        alert("학원 정보를 찾을 수 없습니다. 다시 로그인해주세요.")
        return
      }

      const studentData = {
        name: newStudent.name,
        personalId: newStudent.username,
        password: newStudent.password,
        grade: newStudent.grade || "미설정",
        phone: "",
        parentPhone: newStudent.contact || "",
        totalProblems: 0,
        correctAnswers: 0,
        averageScore: 0,
        totalLearningTime: 0,
        lastActivity: new Date().toISOString(),
        academyId: academyId,
      }

      console.log("[v0] Calling createStudent with:", studentData)
      const studentId = await createStudent(studentData)

      console.log("[v0] Student created with ID:", studentId)

      const newStudentData: Student = {
        id: studentId,
        name: newStudent.name,
        grade: newStudent.grade || "미설정",
        totalProblems: 0,
        correctAnswers: 0,
        averageScore: 0,
        lastActivity: "방금 전",
        trend: "stable",
      }

      setStudents([...students, newStudentData])

      setIsDialogOpen(false)
      setNewStudent({
        name: "",
        parentName: "",
        contact: "",
        username: "",
        password: "",
        academyId: "",
        grade: "",
      })

      console.log("[v0] Student added successfully, dialog closed")
      alert("학생이 성공적으로 추가되었습니다!")
    } catch (error) {
      console.error("[v0] Error creating student:", error)
      alert(`학생 추가 중 오류가 발생했습니다: ${error}`)
    }
  }

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return

    try {
      console.log("[v0] Deleting student:", studentToDelete.id)
      await deleteStudent(studentToDelete.id)

      setStudents(students.filter((s) => s.id !== studentToDelete.id))

      setIsDeleteDialogOpen(false)
      setStudentToDelete(null)

      console.log("[v0] Student deleted successfully")
      alert("학생이 성공적으로 삭제되었습니다!")
    } catch (error) {
      console.error("[v0] Error deleting student:", error)
      alert(`학생 삭제 중 오류가 발생했습니다: ${error}`)
    }
  }

  const confirmDeleteStudent = (student: Student) => {
    setStudentToDelete(student)
    setIsDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white flex items-center justify-center">
        <div className="text-[#3d5a80] text-lg">학생 목록을 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#3d5a80] mb-2">학생 관리</h1>
          <p className="text-[#3d5a80]/70 text-lg">학생 정보 및 학습 현황을 관리합니다.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-[#3d5a80]">학생 목록</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => loadStudents()}
                  className="border-[#3d5a80]/30 text-[#3d5a80] hover:bg-[#3d5a80] hover:text-white"
                >
                  🔄 새로고침
                </Button>
                <Button
                  onClick={() => {
                    console.log("[v0] Add student button clicked!")
                    setIsDialogOpen(true)
                  }}
                  className="bg-[#3d5a80] hover:bg-[#2c4058] text-white"
                >
                  ➕ 학생 추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Input
                placeholder="🔍 학생 이름으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-[#3d5a80]/30"
              />
            </div>

            {students.length === 0 ? (
              <div className="text-center py-12 text-[#3d5a80]/60">
                <p className="text-lg mb-2">등록된 학생이 없습니다.</p>
                <p className="text-sm">학생 추가 버튼을 클릭하여 새로운 학생을 등록하세요.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-[#3d5a80]/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#3d5a80] hover:bg-[#3d5a80]">
                      <TableHead className="text-white">이름</TableHead>
                      <TableHead className="text-white">학년</TableHead>
                      <TableHead className="text-white">푼 문제</TableHead>
                      <TableHead className="text-white">정답률</TableHead>
                      <TableHead className="text-white">평균 점수</TableHead>
                      <TableHead className="text-white">추세</TableHead>
                      <TableHead className="text-white">마지막 활동</TableHead>
                      <TableHead className="text-white text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id} className="hover:bg-[#cfe8e9]/20">
                        <TableCell className="font-semibold text-[#3d5a80]">{student.name}</TableCell>
                        <TableCell className="text-[#3d5a80]/70">{student.grade}</TableCell>
                        <TableCell className="text-[#3d5a80]/70">{student.totalProblems}개</TableCell>
                        <TableCell className="text-[#3d5a80]/70">
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
                                ? "bg-green-100 text-green-800"
                                : student.averageScore >= 80
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {student.averageScore}점
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {student.trend === "up" && <span className="text-green-600">📈</span>}
                          {student.trend === "down" && <span className="text-red-600">📉</span>}
                          {student.trend === "stable" && <span className="text-[#3d5a80]/40">-</span>}
                        </TableCell>
                        <TableCell className="text-[#3d5a80]/70">{student.lastActivity}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="text-[#3d5a80] hover:bg-[#3d5a80] hover:text-white"
                            >
                              <Link href={`/admin/students/${student.id}`}>👁️ 상세보기</Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDeleteStudent(student)}
                              className="text-red-600 hover:bg-red-600 hover:text-white"
                            >
                              🗑️ 삭제
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#3d5a80]">새 학생 추가</DialogTitle>
            <DialogDescription className="text-[#3d5a80]/70">새로운 학생의 정보를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-[#3d5a80]">
                학생 이름 *
              </Label>
              <Input
                id="name"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                placeholder="홍길동"
                className="border-[#3d5a80]/30"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grade" className="text-[#3d5a80]">
                학년
              </Label>
              <Select
                value={newStudent.grade}
                onValueChange={(value) => setNewStudent({ ...newStudent, grade: value })}
              >
                <SelectTrigger className="border-[#3d5a80]/30">
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
              <Label htmlFor="parentName" className="text-[#3d5a80]">
                학부모 이름
              </Label>
              <Input
                id="parentName"
                value={newStudent.parentName}
                onChange={(e) => setNewStudent({ ...newStudent, parentName: e.target.value })}
                placeholder="홍부모"
                className="border-[#3d5a80]/30"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact" className="text-[#3d5a80]">
                연락처
              </Label>
              <Input
                id="contact"
                value={newStudent.contact}
                onChange={(e) => setNewStudent({ ...newStudent, contact: e.target.value })}
                placeholder="010-1234-5678"
                className="border-[#3d5a80]/30"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username" className="text-[#3d5a80]">
                아이디 *
              </Label>
              <Input
                id="username"
                value={newStudent.username}
                onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
                placeholder="student123"
                className="border-[#3d5a80]/30"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-[#3d5a80]">
                비밀번호 *
              </Label>
              <Input
                id="password"
                type="password"
                value={newStudent.password}
                onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                placeholder="비밀번호를 입력하세요"
                className="border-[#3d5a80]/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-[#3d5a80]/30 text-[#3d5a80]"
            >
              취소
            </Button>
            <Button onClick={handleAddStudent} className="bg-[#3d5a80] hover:bg-[#2c4058] text-white">
              추가하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">학생 삭제</DialogTitle>
            <DialogDescription className="text-[#3d5a80]/70">
              정말로 <span className="font-bold text-[#3d5a80]">{studentToDelete?.name}</span> 학생을 삭제하시겠습니까?
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
              className="border-[#3d5a80]/30 text-[#3d5a80]"
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
