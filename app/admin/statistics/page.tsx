"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAllStudents } from "@/lib/firestore/students"
import { getAllRecentSessions } from "@/lib/firestore/sessions"
import { getAuthFromStorage } from "@/lib/auth"
import { resetStatisticsOnly } from "@/lib/firestore/debug"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, Users, Clock, Target, RotateCcw } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { Button } from "@/components/ui/button"

export default function StatisticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // Real data states
  const [stats, setStats] = useState({
    activeStudents: 0,
    averageScore: 0,
    totalLearningMinutes: 0,
    completionRate: 0
  })

  const [scoreData, setScoreData] = useState<any[]>([])
  const [learningTimeData, setLearningTimeData] = useState<any[]>([])
  const [scoreDistributionData, setScoreDistributionData] = useState<any[]>([])
  const [completionRateData, setCompletionRateData] = useState<any[]>([])
  const [problemTypeData, setProblemTypeData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const auth = getAuthFromStorage()
        if (!auth) {
          router.push("/login")
          return
        }

        const students = await getAllStudents()

        // 1. Summary Stats
        const activeStudents = students.filter(s => {
          if (!s.lastActivity) return false
          const last = new Date(s.lastActivity)
          const diff = (new Date().getTime() - last.getTime()) / (1000 * 3600 * 24)
          return diff <= 7
        }).length

        const totalScoreSum = students.reduce((acc, s) => acc + (s.averageScore || 0), 0)
        const avgScore = students.length > 0 ? Math.round(totalScoreSum / students.length) : 0

        const totalHelpers = students.reduce((acc, s) => acc + (s.totalLearningTime || 0), 0)
        const avgLearningTime = students.length > 0 ? Math.round((totalHelpers / 60) / students.length) : 0 // Average mins per student

        // Completion Rate (Correct / Total)
        const totalCorrect = students.reduce((acc, s) => acc + (s.correctAnswers || 0), 0)
        const totalProbs = students.reduce((acc, s) => acc + (s.totalProblems || 0), 0)
        const completionRate = totalProbs > 0 ? Math.round((totalCorrect / totalProbs) * 100) : 0

        setStats({
          activeStudents,
          averageScore: avgScore,
          totalLearningMinutes: avgLearningTime,
          completionRate
        })

        // 2. Learning Time Data (Bar Chart)
        const timeData = students.map(s => ({
          name: s.name,
          time: Math.round((s.totalLearningTime || 0) / 60)
        })).slice(0, 10)
        setLearningTimeData(timeData)

        // 3. Score Distribution (Bar Chart)
        const distribution = [
          { range: "90-100점", count: 0 },
          { range: "80-89점", count: 0 },
          { range: "70-79점", count: 0 },
          { range: "60-69점", count: 0 },
          { range: "60점 미만", count: 0 },
        ]
        students.forEach(s => {
          const sc = s.averageScore || 0
          if (sc >= 90) distribution[0].count++
          else if (sc >= 80) distribution[1].count++
          else if (sc >= 70) distribution[2].count++
          else if (sc >= 60) distribution[3].count++
          else distribution[4].count++
        })
        setScoreDistributionData(distribution)

        // 4. Detailed Charts - Real Data
        const recentSessions = await getAllRecentSessions(100)

        // Group by Date for Trend
        // Note: getAllRecentSessions returns desc order.
        // We want to process them, group by date, then sort by date ascending for the chart.
        const sortedSessions = [...recentSessions].sort((a, b) => {
          // Safe date comparison
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return tA - tB
        })

        const finalTrendMap: Record<string, { sum: number; count: number }> = {}
        sortedSessions.forEach(s => {
          if (!s.createdAt) return
          const d = new Date(s.createdAt)
          const k = `${d.getMonth() + 1}/${d.getDate()}`

          const sc = s.totalQuestions > 0 ? (s.correctCount / s.totalQuestions) * 100 : 0
          if (!finalTrendMap[k]) finalTrendMap[k] = { sum: 0, count: 0 }
          finalTrendMap[k].sum += sc
          finalTrendMap[k].count += 1
        })

        const finalTrendData = Object.keys(finalTrendMap).map(k => ({
          date: k,
          average: Math.round(finalTrendMap[k].sum / finalTrendMap[k].count)
        }))

        setScoreData(finalTrendData.length > 0 ? finalTrendData : [{ date: "데이터 없음", average: 0 }])

        // Completion Pie
        setCompletionRateData([
          { name: "정답", value: completionRate, color: "#3d5a80" },
          { name: "오답/미완료", value: 100 - completionRate, color: "#ffc107" }
        ])

        // Problem Type (Mock for now)
        setProblemTypeData([
          { type: "전체", correct: completionRate, incorrect: 100 - completionRate }
        ])

      } catch (e) {
        console.error("Stats error:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router])

  const handleReset = async () => {
    if (!confirm("모든 통계 데이터를 초기화하시겠습니까? (학생 계정은 유지되며, 학습 기록만 삭제됩니다)")) return

    try {
      setLoading(true)
      await resetStatisticsOnly()
      alert("통계가 초기화되었습니다.")
      window.location.reload()
    } catch (error) {
      console.error("Reset failed:", error)
      alert("초기화 중 오류가 발생했습니다.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BackButton />
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-[#3d5a80] mb-2">통계 분석</h1>
            <p className="text-[#3d5a80]/70 text-lg">학습 데이터를 분석하고 인사이트를 확인하세요.</p>
          </div>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
            onClick={handleReset}
          >
            <RotateCcw className="w-4 h-4" />
            통계 초기화
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-[#3d5a80]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-[#3d5a80]/70">
                <Users className="w-4 h-4" />
                활동 학생
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#3d5a80]">{stats.activeStudents}명</p>
              <p className="text-sm text-green-600 mt-1">실시간 집계</p>
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
              <p className="text-3xl font-bold text-[#3d5a80]">{stats.averageScore}점</p>
              <p className="text-sm text-green-600 mt-1">전체 평균</p>
            </CardContent>
          </Card>

          <Card className="border-[#3d5a80]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-[#3d5a80]/70">
                <Clock className="w-4 h-4" />
                평균 학습 시간
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#3d5a80]">{stats.totalLearningMinutes}분</p>
              <p className="text-sm text-[#3d5a80]/60 mt-1">학생당 평균</p>
            </CardContent>
          </Card>

          <Card className="border-[#3d5a80]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-[#3d5a80]/70">
                <Target className="w-4 h-4" />
                정답률
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#3d5a80]">{stats.completionRate}%</p>
              <p className="text-sm text-green-600 mt-1">전체 문제 기준</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="scores" className="space-y-6">
          <TabsList className="bg-[#3d5a80]/10">
            <TabsTrigger value="scores" className="data-[state=active]:bg-[#3d5a80] data-[state=active]:text-white">
              점수 추이
            </TabsTrigger>
            <TabsTrigger value="time" className="data-[state=active]:bg-[#3d5a80] data-[state=active]:text-white">
              학습 시간
            </TabsTrigger>
            <TabsTrigger
              value="distribution"
              className="data-[state=active]:bg-[#3d5a80] data-[state=active]:text-white"
            >
              점수 분포
            </TabsTrigger>
            <TabsTrigger value="completion" className="data-[state=active]:bg-[#3d5a80] data-[state=active]:text-white">
              완료율
            </TabsTrigger>
          </TabsList>

          {/* Score Trend Chart */}
          <TabsContent value="scores">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-[#3d5a80]">평균 점수 추이</CardTitle>
                <CardDescription>주간 평균 점수 변화를 확인하세요</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={scoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3d5a80" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#3d5a80" />
                    <YAxis stroke="#3d5a80" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #3d5a80",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#3d5a80"
                      strokeWidth={3}
                      name="평균 점수"
                      dot={{ fill: "#3d5a80", r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning Time Chart */}
          <TabsContent value="time">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-[#3d5a80]">학생별 학습 시간</CardTitle>
                <CardDescription>이번 주 학생별 총 학습 시간 (분)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={learningTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3d5a80" opacity={0.1} />
                    <XAxis dataKey="name" stroke="#3d5a80" />
                    <YAxis stroke="#3d5a80" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #3d5a80",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="time" fill="#3d5a80" name="학습 시간 (분)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Score Distribution Chart */}
          <TabsContent value="distribution">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-[#3d5a80]">점수 구간별 분포</CardTitle>
                  <CardDescription>학생들의 점수 분포를 확인하세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={scoreDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3d5a80" opacity={0.1} />
                      <XAxis dataKey="range" stroke="#3d5a80" />
                      <YAxis stroke="#3d5a80" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #3d5a80",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="count" fill="#ffc107" name="학생 수" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-[#3d5a80]">문제 유형별 정답률</CardTitle>
                  <CardDescription>객관식 vs 주관식 정답률 비교</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={problemTypeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3d5a80" opacity={0.1} />
                      <XAxis dataKey="type" stroke="#3d5a80" />
                      <YAxis stroke="#3d5a80" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #3d5a80",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="correct" fill="#3d5a80" name="정답" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="incorrect" fill="#e63946" name="오답" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Completion Rate Chart */}
          <TabsContent value="completion">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-[#3d5a80]">교재 완료율</CardTitle>
                <CardDescription>전체 교재 진행 상황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={completionRateData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {completionRateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #3d5a80",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Insights Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl text-[#3d5a80]">주요 인사이트</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.activeStudents === 0 && stats.totalLearningMinutes === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>아직 충분한 학습 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">학습 현황</h4>
                    <p className="text-sm text-green-800">
                      현재 {stats.activeStudents}명의 학생이 학습에 참여하고 있습니다.
                    </p>
                  </div>
                </div>
                {/* ... can add more dynamic insights later ... */}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
