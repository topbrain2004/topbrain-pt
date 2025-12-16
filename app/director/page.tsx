"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Clock, TrendingUp, FileText, BookOpen, Building2, RefreshCw } from "lucide-react"
import { getAcademyById, type Academy } from "@/lib/firestore/academies"
import { getStudentAccountsWithStats, type StudentAccountWithStats } from "@/lib/firestore/accounts"
import { getAuthFromStorage } from "@/lib/auth"

interface DashboardStats {
  totalStudents: number
  activeStudents: number
  totalLearningTime: number
  averageScore: number
  reportsGenerated: number
}

export default function DirectorDashboard() {
  const router = useRouter()
  const [directorName, setDirectorName] = useState("")
  const [academy, setAcademy] = useState<Academy | null>(null)
  const [students, setStudents] = useState<StudentAccountWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalLearningTime: 0,
    averageScore: 0,
    reportsGenerated: 0,
  })

  const loadData = useCallback(async (academyId: string, showLoading = true) => {
    if (showLoading) setIsLoading(true)
    setIsRefreshing(true)
    try {
      console.log("[v0] Loading academy with ID:", academyId)

      const academyData = await getAcademyById(academyId)

      if (!academyData) {
        console.error("[v0] Academy not found for ID:", academyId)
        alert("배정된 학원 정보를 찾을 수 없습니다. 관리자에게 문의하세요.")
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      console.log("[v0] Loaded academy:", JSON.stringify(academyData))
      setAcademy(academyData)

      console.log("[v0] Loading students from ACCOUNTS collection for academy:", academyData.id)
      const studentsData = await getStudentAccountsWithStats(academyData.id)
      console.log("[v0] Students loaded from accounts:", studentsData.length)
      studentsData.forEach((s) => {
        console.log(
          `[v0] Student: id=${s.id}, name=${s.name}, academyId=${s.academyId}, totalProblems=${s.totalProblems}, avgScore=${s.averageScore}, lastActivity=${s.lastActivity}`,
        )
      })
      setStudents(studentsData)

      const totalStudents = studentsData.length
      const activeStudents = studentsData.filter((s) => {
        const lastActivity = new Date(s.lastActivity)
        const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceActivity <= 7
      }).length

      const totalLearningTime = studentsData.reduce((sum, s) => sum + s.totalLearningTime, 0)

      const averageScore =
        studentsData.length > 0
          ? Math.round(studentsData.reduce((sum, s) => sum + s.averageScore, 0) / studentsData.length)
          : 0

      setStats({
        totalStudents,
        activeStudents,
        totalLearningTime,
        averageScore,
        reportsGenerated: 0,
      })
    } catch (error) {
      console.error("Failed to load data:", error)
      alert("데이터를 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const auth = getAuthFromStorage()

      if (!auth || auth.role !== "원장") {
        router.push("/login")
        return
      }

      setDirectorName(auth.displayName || "원장")

      if (auth.academyId) {
        await loadData(auth.academyId)
      } else {
        alert("배정된 학원이 없습니다. 관리자에게 문의하세요.")
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, loadData])

  const handleRefresh = async () => {
    const auth = getAuthFromStorage()
    if (auth?.academyId) {
      await loadData(auth.academyId, false)
    }
  }

  const handleReset = async () => {
    if (!confirm("정말 모든 학생의 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return

    const auth = getAuthFromStorage()
    if (!auth?.academyId) return

    try {
      setIsRefreshing(true)
      const { resetAllData } = await import("@/lib/firestore/debug")
      await resetAllData(auth.academyId)
      alert("데이터가 초기화되었습니다.")
      await loadData(auth.academyId, false)
    } catch (error) {
      console.error(error)
      alert("초기화 실패")
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}시간 ${minutes}분`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-green-700">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="mb-6 md:mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 font-serif">원장 대시보드</h1>
            <p className="text-gray-500 text-sm sm:text-base md:text-lg">
              {directorName}님, 환영합니다. {academy?.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              variant="destructive"
              size="sm"
              disabled={isRefreshing}
            >
              데이터 초기화
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 bg-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              새로고침
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2 text-gray-500">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                전체 학생
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{stats.totalStudents}명</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">활동 중: {stats.activeStudents}명</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2 text-gray-500">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />총 학습 시간
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{formatDuration(stats.totalLearningTime)}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">이번 달</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2 text-gray-500">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                평균 점수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{stats.averageScore}점</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">학원 평균</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2 text-gray-500">
                <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                소속 학원
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg font-bold text-gray-900">{academy?.name || "-"}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">내 학원</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-white">
            <CardContent className="pt-4 sm:pt-6">
              <Link href="/director/students" className="block">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 sm:w-7 sm:h-7 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-gray-900">학생 관리</h3>
                    <p className="text-xs sm:text-sm text-gray-500">학생 정보 및 성적 관리</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-white">
            <CardContent className="pt-4 sm:pt-6">
              <Link href="/director/textbooks" className="block">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-gray-900">교재 관리</h3>
                    <p className="text-xs sm:text-sm text-gray-500">교재 정보 및 정답 관리</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-white">
            <CardContent className="pt-4 sm:pt-6">
              <Link href="/director/reports" className="block">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-gray-900">리포트 관리</h3>
                    <p className="text-xs sm:text-sm text-gray-500">학습 리포트 조회 및 발송</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-green-900">최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-center py-8 text-gray-500">등록된 학생이 없습니다.</p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {students
                  .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
                  .slice(0, 4)
                  .map((student, index) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-2 sm:p-3 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {student.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm sm:text-base">{student.name}</p>
                          <p className="text-xs sm:text-sm text-gray-500">{student.grade}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{student.averageScore}점</p>
                        <p className="text-xs sm:text-sm text-gray-500">{student.totalProblems}문제 풀이</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-green-900">학원 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">학원명</p>
                <p className="font-semibold text-gray-900">{academy?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">전화번호</p>
                <p className="font-semibold text-gray-900">{academy?.phone}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 mb-1">주소</p>
                <p className="font-semibold text-gray-900">{academy?.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">이메일</p>
                <p className="font-semibold text-gray-900">{academy?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
