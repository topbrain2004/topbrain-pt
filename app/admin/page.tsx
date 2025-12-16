"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Clock, TrendingUp, FileText, BookOpen, Building2, UserCog, Settings, PenTool } from 'lucide-react'
import { getAuthFromStorage } from "@/lib/auth"

interface DashboardStats {
  totalStudents: number
  activeStudents: number
  totalLearningTime: number
  averageScore: number
  reportsGenerated: number
}

import { getAllRecentSessions } from "@/lib/firestore/sessions"
import { getStudentById, getAllStudents } from "@/lib/firestore/students"
import { getAllReports } from "@/lib/firestore/reports"

export default function AdminDashboard() {
  const router = useRouter()
  const [adminName, setAdminName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalLearningTime: 0,
    averageScore: 0,
    reportsGenerated: 0,
  })

  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      console.log("[AdminDashboard] Checking auth...")
      const auth = getAuthFromStorage()
      if (!auth || auth.role !== "관리자") {
        console.log("[AdminDashboard] Invalid auth, redirecting...")
        router.push("/login")
        return
      }
      setAdminName(auth.displayName || auth.email)

      try {
        console.log("[AdminDashboard] Loading data...")

        // 1. Load Recent Activity
        const sessions = await getAllRecentSessions(10)
        const enrichedSessions = await Promise.all(
          sessions.map(async (session) => {
            try {
              const student = await getStudentById(session.studentId)
              if (!student) return null

              return {
                ...session,
                studentName: student.name,
                action: `${session.textbookName} 학습 완료`
              }
            } catch (e) {
              return null
            }
          })
        )
        const validActivities = enrichedSessions.filter((s) => s !== null).slice(0, 5)
        setRecentActivity(validActivities)

        // 2. Load Stats
        const students = await getAllStudents()
        const reports = await getAllReports()

        const totalStudents = students.length
        const activeStudents = students.filter((s) => {
          if (!s.lastActivity) return false
          const last = new Date(s.lastActivity)
          const now = new Date()
          const diffTime = Math.abs(now.getTime() - last.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return diffDays <= 7
        }).length

        const totalLearningTime = Math.round(students.reduce((acc, curr) => acc + (curr.totalLearningTime || 0), 0) / 3600)

        const averageScore = students.length > 0
          ? Math.round(students.reduce((acc, curr) => acc + (curr.averageScore || 0), 0) / students.length)
          : 0

        const reportsGenerated = reports.length

        setStats({
          totalStudents,
          activeStudents,
          totalLearningTime,
          averageScore,
          reportsGenerated
        })
        console.log("[AdminDashboard] Data loaded.")

      } catch (error) {
        console.error("[AdminDashboard] Failed to load dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, []) // Remove router dependency

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3d5a80] mx-auto mb-4"></div>
          <p className="text-[#3d5a80]">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="mb-6 md:mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#3d5a80] mb-2">관리자 대시보드</h1>
            <p className="text-[#3d5a80]/70 text-sm sm:text-base md:text-lg">{adminName}님, 환영합니다.</p>
          </div>
          <Button
            onClick={() => router.push("/admin/system")}
            className="bg-[#3d5a80] hover:bg-[#2c4260] text-white gap-2"
          >
            <Settings className="w-4 h-4" />
            시스템 관리
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="border-[#3d5a80]/20 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2 text-[#3d5a80]/70">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                전체 학생
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#3d5a80]">{stats.totalStudents}명</p>
              <p className="text-xs sm:text-sm text-[#3d5a80]/60 mt-1">활동 중: {stats.activeStudents}명</p>
            </CardContent>
          </Card>

          <Card className="border-[#3d5a80]/20 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2 text-[#3d5a80]/70">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />총 학습 시간
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#3d5a80]">{stats.totalLearningTime}시간</p>
              <p className="text-xs sm:text-sm text-[#3d5a80]/60 mt-1">이번 달</p>
            </CardContent>
          </Card>

          <Card className="border-[#3d5a80]/20 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2 text-[#3d5a80]/70">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                평균 점수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#3d5a80]">{stats.averageScore}점</p>
              <p className="text-xs sm:text-sm text-green-600 mt-1">+5% 상승</p>
            </CardContent>
          </Card>

          <Card className="border-[#3d5a80]/20 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2 text-[#3d5a80]/70">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                생성된 리포트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#3d5a80]">{stats.reportsGenerated}개</p>
              <p className="text-xs sm:text-sm text-[#3d5a80]/60 mt-1">이번 주</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="border-[#3d5a80]/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-4 sm:pt-6">
              <Link href="/admin/students" className="block">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#3d5a80] rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#3d5a80]">학생 관리</h3>
                    <p className="text-xs sm:text-sm text-[#3d5a80]/60">학생 정보 및 성적 관리</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-[#3d5a80]/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-4 sm:pt-6">
              <Link href="/admin/textbooks" className="block">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#d4a574] rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#3d5a80]">교재 관리</h3>
                    <p className="text-xs sm:text-sm text-[#3d5a80]/60">교재 정보 및 정답 관리</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-[#3d5a80]/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-4 sm:pt-6">
              <Link href="/admin/reports" className="block">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#4d6a90] rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#3d5a80]">리포트 관리</h3>
                    <p className="text-xs sm:text-sm text-[#3d5a80]/60">학습 리포트 조회 및 발송</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-[#3d5a80]/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-4 sm:pt-6">
              <Link href="/admin/statistics" className="block">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#5b7ba0] rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#3d5a80]">통계 분석</h3>
                    <p className="text-xs sm:text-sm text-[#3d5a80]/60">학습 데이터 분석</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="border-purple-600/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-4 sm:pt-6">
              <Link href="/admin/accounts" className="block">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-600 rounded-lg flex items-center justify-center">
                    <UserCog className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-purple-900">원장 계정 관리</h3>
                    <p className="text-xs sm:text-sm text-purple-700">원장 계정 생성 및 관리</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-blue-600/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-4 sm:pt-6">
              <Link href="/admin/academies" className="block">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-blue-900">학원 관리</h3>
                    <p className="text-xs sm:text-sm text-blue-700">학원 등록 및 원장 배정</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-green-600/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-4 sm:pt-6">
              <Link href="/admin/users" className="block">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-green-900">사용자 관리</h3>
                    <p className="text-xs sm:text-sm text-green-700">사용자 승인 및 권한 관리</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="border-indigo-600/20 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-4 sm:pt-6">
              <Link href="/admin/blog" className="block">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <PenTool className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-indigo-900">블로그 관리</h3>
                    <p className="text-xs sm:text-sm text-indigo-700">AI 콘텐츠 자동 생성</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-[#3d5a80]">최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-center py-8 text-[#3d5a80]/60">최근 활동 내역이 없습니다.</p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-2 sm:p-3 hover:bg-[#cfe8e9]/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#3d5a80] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {activity.studentName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-[#3d5a80] text-sm sm:text-base">
                          {activity.studentName}
                        </p>
                        <p className="text-xs sm:text-sm text-[#3d5a80]/60">
                          {activity.action}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#3d5a80] text-sm sm:text-base">
                        {Math.round((activity.correctCount / activity.totalQuestions) * 100)}점
                      </p>
                      <p className="text-xs sm:text-sm text-[#3d5a80]/60">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
