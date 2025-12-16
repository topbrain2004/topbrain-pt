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
import { getAccount, type Account } from "@/lib/firestore/accounts"
import { getAuthFromStorage } from "@/lib/auth"
import { getTextbookById } from "@/lib/firestore/textbooks"

export default function DirectorStudentDetailPage() {
    const params = useParams()
    const router = useRouter()
    const accountId = params.studentId as string

    const [student, setStudent] = useState<Student | null>(null)
    const [sessions, setSessions] = useState<LearningSession[]>([])
    const [loading, setLoading] = useState(true)
    const [textbookUnits, setTextbookUnits] = useState<Record<string, string>>({})

    useEffect(() => {
        const checkAuthAndLoad = async () => {
            const auth = getAuthFromStorage()
            if (!auth || auth.role !== "원장" || !auth.academyId) {
                alert("접근 권한이 없습니다.")
                router.push("/login")
                return
            }

            try {
                // Step A: Fetch Account
                const accountData = await getAccount(accountId)
                if (!accountData) {
                    setLoading(false)
                    return
                }

                // Step B: Check Permission
                if (accountData.academyId && accountData.academyId !== auth.academyId) {
                    alert("타 학원 학생 정보에는 접근할 수 없습니다.")
                    router.back()
                    return
                }

                // Step C: Fetch Student Profile
                let studentData: Student | null = null
                if (accountData.studentId) {
                    studentData = await getStudentById(accountData.studentId)
                }

                if (studentData) {
                    setStudent(studentData)
                } else {
                    setStudent({
                        id: accountData.studentId || "missing",
                        name: accountData.displayName,
                        personalId: "unknown",
                        password: "Hidden",
                        grade: accountData.grade || "미설정",
                        phone: "정보 없음 (프로필 미연동)",
                        parentPhone: "정보 없음",
                        totalProblems: accountData.totalProblems || 0,
                        correctAnswers: accountData.correctAnswers || 0,
                        averageScore: accountData.averageScore || 0,
                        totalLearningTime: accountData.totalLearningTime || 0,
                        lastActivity: accountData.lastActivity || new Date().toISOString(),
                        academyId: accountData.academyId,
                        createdAt: new Date(accountData.createdAt),
                        updatedAt: new Date(accountData.createdAt),
                    } as Student)
                }

                // Step D: Load Sessions & Textbooks
                const targetStudentId = accountData.studentId
                if (targetStudentId) {
                    const sessionData = await getStudentSessions(targetStudentId, 20) // Increased limit to see more history
                    setSessions(sessionData)

                    // Fetch unique textbook units
                    const uniqueTextbookIds = Array.from(new Set(sessionData.map(s => s.textbookId)))
                    const unitsMap: Record<string, string> = {}

                    await Promise.all(uniqueTextbookIds.map(async (tid) => {
                        const tb = await getTextbookById(tid)
                        if (tb) {
                            unitsMap[tid] = tb.unit
                        }
                    }))
                    setTextbookUnits(unitsMap)
                }

            } catch (error) {
                console.error("[Director] Error loading data:", error)
            } finally {
                setLoading(false)
            }
        }

        checkAuthAndLoad()
    }, [accountId, router])

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
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-gray-700 text-lg">학생 정보를 불러오는 중...</div>
            </div>
        )
    }

    if (!student) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md border-none shadow-sm bg-white">
                    <CardContent className="py-12 text-center">
                        <p className="text-gray-700 text-lg mb-4">학생 정보를 찾을 수 없습니다.</p>
                        <Button onClick={() => router.back()} variant="gradient" className="text-white">
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
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="mb-4 text-gray-500 hover:bg-gray-100/50"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            돌아가기
                        </Button>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2 font-serif">{student.name} 학생</h1>
                        <p className="text-gray-500 text-lg">{student.grade}</p>
                    </div>
                    <Button onClick={handleSendReport} className="bg-yellow-400 hover:bg-yellow-500 text-black border-none">
                        <Send className="w-4 h-4 mr-2" />
                        카카오톡 리포트 발송
                    </Button>
                </div>

                {/* Contact Info */}
                <Card className="mb-6 border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl text-gray-900">연락처 정보</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">학생 연락처</p>
                                <p className="font-semibold text-gray-900">{student.phone || "-"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">학부모 연락처</p>
                                <p className="font-semibold text-gray-900">{student.parentPhone || "-"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid md:grid-cols-4 gap-6 mb-6">
                    <Card className="border-none shadow-sm bg-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2 text-gray-500">
                                <BookOpen className="w-4 h-4" />푼 문제
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-gray-900">{student.totalProblems}개</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2 text-gray-500">
                                <Trophy className="w-4 h-4" />
                                정답률
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-gray-900">{accuracyRate}%</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2 text-gray-500">
                                <TrendingUp className="w-4 h-4" />
                                평균 점수
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-gray-900">{student.averageScore}점</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2 text-gray-500">
                                <Clock className="w-4 h-4" />총 학습 시간
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-gray-900">{Math.floor(student.totalLearningTime / 60)}분</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activities */}
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl text-gray-900">최근 학습 기록</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {sessions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>아직 학습 기록이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-gray-100 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                                            <TableHead className="text-gray-700 w-[100px] font-semibold">날짜</TableHead>
                                            <TableHead className="text-gray-700 font-semibold">교재</TableHead>
                                            <TableHead className="text-gray-700 font-semibold">대단원</TableHead>
                                            <TableHead className="text-gray-700 font-semibold">소단원</TableHead>
                                            <TableHead className="text-gray-700 font-semibold text-center">정답</TableHead>
                                            <TableHead className="text-gray-700 font-semibold text-center">점수</TableHead>
                                            <TableHead className="text-gray-700 font-semibold text-right">지문 분석</TableHead>
                                            <TableHead className="text-gray-700 font-semibold text-right">문제 풀이</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sessions.map((session) => {
                                            const score =
                                                session.totalQuestions > 0
                                                    ? Math.round((session.correctCount / session.totalQuestions) * 100)
                                                    : 0
                                            return (
                                                <TableRow key={session.id} className="hover:bg-gray-50">
                                                    <TableCell className="text-gray-900">{formatDate(session.createdAt)}</TableCell>
                                                    <TableCell className="font-semibold text-gray-900">{session.textbookName}</TableCell>
                                                    <TableCell className="text-gray-600">{textbookUnits[session.textbookId] || "-"}</TableCell>
                                                    <TableCell className="text-gray-600">{session.subUnit || "전체"}</TableCell>
                                                    <TableCell className="text-gray-600 text-center">
                                                        {session.correctCount}/{session.totalQuestions}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge
                                                            variant="secondary"
                                                            className={
                                                                score >= 90
                                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                                    : score >= 80
                                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                        : "bg-orange-50 text-orange-700 border-orange-200"
                                                            }
                                                        >
                                                            {score}점
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-gray-600 text-right">{formatTime(session.readingTime)}</TableCell>
                                                    <TableCell className="text-gray-600 text-right">{formatTime(session.solvingTime)}</TableCell>
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
