"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Clock, BookOpen, Trophy, TrendingUp } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getStudentById, type Student } from "@/lib/firestore/students"
import { getStudentSessions, type LearningSession } from "@/lib/firestore/sessions"

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.studentId as string

  const [student, setStudent] = useState<Student | null>(null)
  const [sessions, setSessions] = useState<LearningSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        console.log("[v0] Loading student data for:", studentId)
        const studentData = await getStudentById(studentId)
        console.log("[v0] Student data loaded:", studentData)
        setStudent(studentData)

        if (studentData) {
          const sessionData = await getStudentSessions(studentId, 10)
          console.log("[v0] Sessions loaded:", sessionData.length)
          setSessions(sessionData)
        }
      } catch (error) {
        console.error("[v0] Error loading student data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStudentData()
  }, [studentId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}분 ${secs}초`
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const handleSendReport = () => {
    alert("카카오톡으로 리포트가 발송되었습니다!")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white flex items-center justify-center">
        <div className="text-[#3d5a80] text-lg">학생 정보를 불러오는 중...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-[#3d5a80] text-lg mb-4">학생 정보를 찾을 수 없습니다.</p>
            <Button onClick={() => router.back()} className="bg-[#3d5a80] hover:bg-[#2c4058] text-white">
              돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const accuracyRate =
    student.totalProblems > 0 ? Math.round((student.correctAnswers / student.totalProblems) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4 text-[#3d5a80] hover:bg-[#3d5a80] hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </Button>
            <h1 className="text-4xl font-bold text-[#3d5a80] mb-2">{student.name} 학생</h1>
            <p className="text-[#3d5a80]/70 text-lg">{student.grade}</p>
          </div>
          <Button onClick={handleSendReport} className="bg-[#ffc107] hover:bg-[#ffd54f] text-[#3d5a80]">
            <Send className="w-4 h-4 mr-2" />
            카카오톡 리포트 발송
          </Button>
        </div>

        {/* Contact Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-[#3d5a80]">연락처 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#3d5a80]/60 mb-1">학생 연락처</p>
                <p className="font-semibold text-[#3d5a80]">{student.phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-[#3d5a80]/60 mb-1">학부모 연락처</p>
                <p className="font-semibold text-[#3d5a80]">{student.parentPhone || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats - using real data */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card className="border-[#3d5a80]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-[#3d5a80]/70">
                <BookOpen className="w-4 h-4" />푼 문제
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#3d5a80]">{student.totalProblems}개</p>
            </CardContent>
          </Card>

          <Card className="border-[#3d5a80]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-[#3d5a80]/70">
                <Trophy className="w-4 h-4" />
                정답률
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#3d5a80]">{accuracyRate}%</p>
            </CardContent>
          </Card>

          <Card className="border-[#3d5a80]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-[#3d5a80]/70">
                <TrendingUp className="w-4 h-4" />
                평균 점수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#3d5a80]">{student.averageScore}점</p>
            </CardContent>
          </Card>

          <Card className="border-[#3d5a80]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-[#3d5a80]/70">
                <Clock className="w-4 h-4" />총 학습 시간
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#3d5a80]">{Math.floor(student.totalLearningTime / 60)}분</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities - using real session data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#3d5a80]">최근 학습 기록</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-[#3d5a80]/60">
                <p>아직 학습 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-[#3d5a80]/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#3d5a80] hover:bg-[#3d5a80]">
                      <TableHead className="text-white">날짜</TableHead>
                      <TableHead className="text-white">교재</TableHead>
                      <TableHead className="text-white">정답</TableHead>
                      <TableHead className="text-white">점수</TableHead>
                      <TableHead className="text-white">지문 분석 시간</TableHead>
                      <TableHead className="text-white">문제 풀이 시간</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => {
                      const score =
                        session.totalQuestions > 0
                          ? Math.round((session.correctCount / session.totalQuestions) * 100)
                          : 0
                      return (
                        <TableRow key={session.id} className="hover:bg-[#cfe8e9]/20">
                          <TableCell className="text-[#3d5a80]/70">{formatDate(session.createdAt)}</TableCell>
                          <TableCell className="font-semibold text-[#3d5a80]">{session.textbookName}</TableCell>
                          <TableCell className="text-[#3d5a80]/70">
                            {session.correctCount}/{session.totalQuestions}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                score >= 90
                                  ? "bg-green-100 text-green-800"
                                  : score >= 80
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {score}점
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#3d5a80]/70">{formatTime(session.readingTime)}</TableCell>
                          <TableCell className="text-[#3d5a80]/70">{formatTime(session.solvingTime)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
