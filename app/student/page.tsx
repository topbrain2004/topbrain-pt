"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Clock, Trophy, FileText } from "lucide-react"
import { getAuthFromStorage } from "@/lib/auth"

interface Workbook {
  id: string
  title: string
  level: string
  totalProblems: number
  completed: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function StudentDashboard() {
  const router = useRouter()
  const [studentName, setStudentName] = useState("")
  const [totalLearningTime, setTotalLearningTime] = useState(0)
  const [totalProblems, setTotalProblems] = useState(0)
  const [workbooks, setWorkbooks] = useState<Workbook[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)

    const auth = getAuthFromStorage()
    if (!auth || (auth.role !== "학생" && auth.role !== "원장" && auth.role !== "관리자")) {
      router.push("/login")
      return
    }

    const { refreshAuth } = require("@/lib/auth")
    refreshAuth().then((updated: any) => {
      if (updated && updated.displayName !== studentName) {
        setStudentName(updated.displayName)
      }
    })

    setStudentName(auth.displayName || auth.email)

    const fetchData = async () => {
      try {
        const { getAllTextbooks } = await import("@/lib/firestore/textbooks")
        const { getStudentById } = await import("@/lib/firestore/students")

        if (auth.studentId) {
          const student = await getStudentById(auth.studentId)
          if (student) {
            setTotalLearningTime(student.totalLearningTime || 0)
            setTotalProblems(student.totalProblems || 0)
          }

          const { getStudentSessions } = await import("@/lib/firestore/sessions")
          const sessions = await getStudentSessions(auth.studentId, 1000)

          const progressMap: Record<string, Set<string>> = {}
          sessions.forEach(session => {
            if (session.textbookId && session.subUnit) {
              if (!progressMap[session.textbookId]) {
                progressMap[session.textbookId] = new Set()
              }
              progressMap[session.textbookId].add(session.subUnit)
            }
          })

          const textbooks = await getAllTextbooks()
          const transformedWorkbooks = textbooks.map((textbook) => {
            let totalProblems = 0
            if (textbook.subUnits) {
              Object.values(textbook.subUnits).forEach((subUnit: any) => {
                totalProblems += subUnit.problems?.length || 0
              })
            }

            let completedProblems = 0
            const completedUnits = progressMap[textbook.id]
            if (completedUnits) {
              completedUnits.forEach(unitName => {
                const unitData = textbook.subUnits[unitName]
                if (unitData && unitData.problems) {
                  completedProblems += unitData.problems.length
                }
              })
            }

            return {
              id: textbook.id,
              title: textbook.name,
              level: textbook.category,
              totalProblems: totalProblems,
              completed: completedProblems,
            }
          })
          setWorkbooks(transformedWorkbooks)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      }
    }

    fetchData()
  }, [router])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}시간 ${minutes}분`
  }

  const startLearning = (workbookId: string) => {
    router.push(`/student/learn/${workbookId}`)
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen p-6 space-y-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-4">
            <div className="h-10 bg-slate-200 rounded-lg w-64 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-48 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 md:mb-12"
        >
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
            반가워요, <span className="text-primary">{studentName}</span>님!
          </h1>
          <p className="text-muted-foreground text-lg">오늘도 목표를 향해 달려볼까요?</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12"
        >
          <motion.div variants={itemVariants}>
            <Card className="glass-card border-none h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  학습 중인 교재
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-foreground">
                  {workbooks.filter((w) => w.completed > 0 && w.completed < w.totalProblems).length}
                  <span className="text-lg font-normal text-muted-foreground ml-1">권</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="glass-card border-none h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  총 학습 시간
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-foreground">{formatDuration(totalLearningTime)}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="glass-card border-none h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  완료한 문제
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-foreground">
                  {totalProblems}
                  <span className="text-lg font-normal text-muted-foreground ml-1">문제</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="sm:hidden md:hidden"> {/* Mobile Only Report Button */}
            <Button
              variant="outline"
              className="w-full glass-card h-auto py-4 justify-between"
              onClick={() => router.push("/student/reports")}
            >
              <span className="flex items-center gap-2 font-semibold">
                <FileText className="w-4 h-4" /> 내 리포트 보기
              </span>
              <span>&rarr;</span>
            </Button>
          </motion.div>
        </motion.div>

        {/* Workbooks Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              내 교재 목록
            </h2>
            <Button variant="ghost" className="text-muted-foreground hover:text-primary" onClick={() => router.push("/student/reports")}>
              전체 리포트 보기 &rarr;
            </Button>
          </div>

          {workbooks.length === 0 ? (
            <Card className="glass-card border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-lg font-medium text-muted-foreground mb-2">등록된 교재가 없습니다</p>
                <p className="text-sm text-muted-foreground">관리자에게 교재 등록을 요청해주세요.</p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {workbooks.map((workbook) => (
                <motion.div key={workbook.id} variants={itemVariants} whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="glass-card border-none overflow-hidden h-full flex flex-col">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-b border-border/50 pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider ${workbook.level.includes("최상") ? "bg-purple-100 text-purple-700" :
                            workbook.level.includes("상") ? "bg-red-100 text-red-700" :
                              "bg-emerald-100 text-emerald-700"
                          }`}>
                          {workbook.level}
                        </span>
                        {workbook.completed > 0 && (
                          <span className="text-xs font-medium text-muted-foreground">
                            {Math.round((workbook.completed / workbook.totalProblems) * 100)}% 완료
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg md:text-xl text-foreground line-clamp-1" title={workbook.title}>{workbook.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 flex-1 flex flex-col justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>진행률</span>
                          <span>{workbook.completed} / {workbook.totalProblems} 문제</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(workbook.completed / workbook.totalProblems) * 100}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="bg-primary h-full rounded-full"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => startLearning(workbook.id)}
                        className={`w-full text-base py-6 shadow-md ${workbook.completed === 0 ? "bg-primary hover:bg-primary/90" : "bg-white text-primary border border-primary/20 hover:bg-slate-50"}`}
                      >
                        {workbook.completed === 0 ? "새로운 학습 시작" : "이어서 학습하기"}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
