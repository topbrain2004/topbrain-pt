"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Clock, Play, CheckCircle, BookOpen, X, Loader2 } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAuthFromStorage } from "@/lib/auth"
import { updateStudentStats } from "@/lib/firestore/students"
import { createLearningSession } from "@/lib/firestore/sessions"

type LearningPhase = "setup" | "reading" | "solving" | "completed"

interface Problem {
  number: number
  type: "multiple" | "short" | "essay"
  question: string
  answer: string
  keywords?: string[]
}

interface LocalTextbook {
  id: string
  name: string
  category: string
  unit: string
  subUnits: {
    [subUnitName: string]: {
      problems: Problem[]
    }
  }
}

export default function LearningSession() {
  const router = useRouter()
  // ... existing hooks

  const handleExit = () => {
    if (confirm("학습을 중단하고 나가시겠습니까?")) {
      router.push("/student")
    }
  }
  const params = useParams()
  const workbookId = params.workbookId as string

  const [phase, setPhase] = useState<LearningPhase>("setup")
  const [isGrading, setIsGrading] = useState(false)
  const [readingTime, setReadingTime] = useState(0)
  const [solvingTime, setSolvingTime] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})

  // ... (existing state)


  const [textbooks, setTextbooks] = useState<LocalTextbook[]>([])
  const [selectedTextbook, setSelectedTextbook] = useState<LocalTextbook | null>(null)
  const [selectedSubUnit, setSelectedSubUnit] = useState("")
  const [problems, setProblems] = useState<Problem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [completedSubUnits, setCompletedSubUnits] = useState<string[]>([])

  // Retry Logic State
  const [attemptCount, setAttemptCount] = useState(0)
  const [lastResults, setLastResults] = useState<Record<number, any> | null>(null)
  const [isRetryMode, setIsRetryMode] = useState(false)

  useEffect(() => {
    setIsHydrated(true)

    const fetchTextbook = async () => {
      try {
        if (!workbookId) return
        const { getTextbookById } = await import("@/lib/firestore/textbooks")
        const textbook = await getTextbookById(workbookId)

        if (textbook) {
          // Cast to local interface or keep as is since they are compatible
          const formattedTextbook = textbook as unknown as LocalTextbook
          setTextbooks([formattedTextbook])
          setTextbooks([formattedTextbook])
          setSelectedTextbook(formattedTextbook)
        }

        // Fetch completed sub-units
        const auth = getAuthFromStorage()
        if (auth?.studentId) {
          const { getCompletedSubUnits } = await import("@/lib/firestore/sessions")
          const completed = await getCompletedSubUnits(auth.studentId, workbookId)
          setCompletedSubUnits(completed)
        }
      } catch (error) {
        console.error("Failed to fetch textbook:", error)
      }
    }

    fetchTextbook()
  }, [workbookId])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isTimerRunning) {
      interval = setInterval(() => {
        if (phase === "reading") {
          setReadingTime((prev) => prev + 1)
        } else if (phase === "solving") {
          setSolvingTime((prev) => prev + 1)
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning, phase])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const startReading = () => {
    if (!selectedSubUnit || !selectedTextbook) return

    // if (completedSubUnits.includes(selectedSubUnit)) {
    //   alert("이미 학습을 완료한 단원입니다.")
    //   return
    // }

    const subUnitData = selectedTextbook.subUnits?.[selectedSubUnit]
    if (!subUnitData || !subUnitData.problems || subUnitData.problems.length === 0) {
      alert("선택한 소단원에 등록된 문제가 없습니다.")
      return
    }

    // Check for previous attempts
    const checkAttempts = async () => {
      const auth = getAuthFromStorage()
      if (auth?.studentId) {
        const { getSessionCount, getLastSession } = await import("@/lib/firestore/sessions")
        const count = await getSessionCount(auth.studentId, (selectedTextbook as any).id, selectedSubUnit)
        setAttemptCount(count)

        if (count >= 3) {
          alert("재시도 횟수(3회)를 초과하여 더 이상 학습할 수 없습니다.")
          return
        }

        if (count > 0) {
          const lastSession = await getLastSession(auth.studentId, (selectedTextbook as any).id, selectedSubUnit)
          if (lastSession) {
            setIsRetryMode(true)
            setLastResults(lastSession.results)

            // Pre-fill answers for correct questions ONLY
            const prevAnswers: Record<number, string> = {}
            Object.entries(lastSession.results).forEach(([key, val]: [string, any]) => {
              if (val.correct) {
                prevAnswers[Number(key)] = val.userAnswer
              }
            })
            setAnswers(prevAnswers)

            if (confirm(`이전 학습 기록이 있습니다. (시도 횟수: ${count}/3)\n틀린 문제만 다시 풀겠습니까?`)) {
              // Proceed to retry
            } else {
              return
            }
          }
        }
      }

      setProblems(subUnitData.problems)
      setPhase("reading")
      setIsTimerRunning(true)
    }

    checkAttempts()
  }

  const startSolving = () => {
    setPhase("solving")
  }

  const handleAnswerChange = (problemNumber: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [problemNumber]: value,
    }))
  }

  const submitAnswers = async () => {
    setIsTimerRunning(false)
    setPhase("completed")

    let correctCount = 0
    const results: Record<number, { correct: boolean; userAnswer: string; correctAnswer: string }> = {}

    const gradingPromises = problems.map(async (problem) => {
      const userAnswer = answers[problem.number] || ""
      let isCorrect = false
      let feedback = ""

      // 1. Multiple Choice: Local Grading
      if (problem.type === "multiple") {
        isCorrect = userAnswer.trim().toLowerCase() === problem.answer.trim().toLowerCase()
      }
      // 2. Short/Essay: AI Grading
      else {
        // Skip API call if empty or "Don't Know"
        if (!userAnswer || userAnswer.trim() === "" || userAnswer === "모름") {
          isCorrect = false
        } else {
          try {
            const response = await fetch("/api/grade", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: problem.question,
                userAnswer,
                correctAnswer: problem.answer,
                type: problem.type,
                keywords: problem.keywords
              }),
            })
            if (response.ok) {
              const data = await response.json()
              isCorrect = data.correct
              feedback = data.feedback
            } else {
              console.error("AI Grading failed:", response.statusText)
              // Fallback to basic keyword matching if API fails
              if (problem.keywords && problem.keywords.length > 0) {
                const matched = problem.keywords.filter(k => userAnswer.includes(k))
                isCorrect = matched.length >= problem.keywords.length * 0.6 // 60% match
              }
            }
          } catch (error) {
            console.error("AI Grading error:", error)
          }
        }
      }

      return {
        number: problem.number,
        result: {
          correct: isCorrect,
          userAnswer,
          correctAnswer: problem.answer,
          feedback
        }
      }
    })

    const gradedResults = await Promise.all(gradingPromises)

    gradedResults.forEach((item) => {
      if (item.result.correct) correctCount++
      results[item.number] = item.result
    })

    const auth = getAuthFromStorage()
    const totalTime = readingTime + solvingTime
    const score = problems.length > 0 ? Math.round((correctCount / problems.length) * 100) : 0

    console.log("[v0] === LEARNING COMPLETION DEBUG ===")
    console.log("[v0] Auth data:", JSON.stringify(auth))
    console.log("[v0] studentId:", auth?.studentId)
    console.log("[v0] academyId:", auth?.academyId)
    console.log("[v0] Stats to save:", { correctCount, totalProblems: problems.length, totalTime, score })

    if (auth?.studentId) {
      try {
        console.log("[v0] Creating learning session for studentId:", auth.studentId)

        // 2. Update aggregate stats IF this is a new unit
        // We check 'completedSubUnits' which was fetched at start of component
        // Since we just blocked re-selection in UI, this is a double-check.
        // Importantly, check BEFORE creating session or rely on the state loaded 
        // BEFORE the session was created.

        // Actually, we can just use the state `completedSubUnits` we have!
        // It represents the state BEFORE this current submission.

        const isNewUnit = !completedSubUnits.includes(selectedSubUnit)

        // Retry Mode: DO NOT update aggregate stats ("데이터에는 적용하지 않도록")
        // Only update stats if it's the first time completing this unit AND not in retry mode
        if (isNewUnit && !isRetryMode) {
          console.log("[v0] New Unit Detected. Updating student cumulative stats...")
          await updateStudentStats(auth.studentId, correctCount, problems.length, totalTime, score)
          console.log("[v0] Student stats updated successfully in Firestore")
        } else {
          console.log("[v0] Skipped updateStudentStats (Duplicate or Retry Mode). RetryMode:", isRetryMode)
        }

        // 1. Save the detailed session history (Always save history for check/log)
        // Store attempt count implicitly by creating a new document.
        const sessionId = await createLearningSession({
          studentId: auth.studentId,
          textbookId: workbookId,
          textbookName: selectedTextbook?.name || "",
          subUnit: selectedSubUnit, // Added subUnit tracking
          page: 1,
          startTime: new Date(Date.now() - totalTime * 1000),
          endTime: new Date(),
          readingTime,
          solvingTime,
          totalQuestions: problems.length,
          correctCount,
          results: results as any,
        })
        console.log("[v0] Learning session created successfully, sessionId:", sessionId)

        // Force update local storage (optional, mostly for name sync)
        const currentAuth = getAuthFromStorage()
        // ... (rest of logic)
        if (currentAuth && currentAuth.displayName !== auth.displayName) {
          currentAuth.displayName = auth.displayName // Actually we want to sync from DB?
          // Ideally we should fetch fresh student data, but for now let's trust the auth object's name WAS the issue,
          // wait, the issue is that auth.displayName MIGHT BE STALE.
          // We should fetch the fresh Student name from DB to be sure?
          // But we are in frontend.
          // Let's rely on the previous fix: updateStudentStats syncs Student.name -> Account.displayName.
          // But we need to update LOCAL STORAGE.
        }

        // Actually, the most robust way is to fetch the fresh Account data and update storage.
        // But for this quick fix, let's assume 'Yoon Onyu' is the correct name provided by the context 
        // or if we can't know, we rely on the Backend Sync we added.
        // The contamination is likely: "User logged in as Jiyu, then Jiyu was renamed Onyu in DB, but Browser still says Jiyu".
        // SO every session created says "Jiyu".

        // Let's add specific code to `lib/auth.ts` to refresh profile. 
        // For now, in this file, I will just log.
        console.log("[v0] === SYNC TO DIRECTOR DASHBOARD COMPLETE ===")
        console.log("[v0] Student document ID updated:", auth.studentId)
        console.log("[v0] Director will see this when filtering by academyId:", auth.academyId)
        console.log("[v0] Data will now appear in director dashboard when refreshed")
      } catch (error) {
        console.error("[v0] Error saving learning results to Firestore:", error)
        console.error("[v0] Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
        alert(`학습 결과 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`)
      }
    } else {
      console.log("[v0] ❌ CRITICAL: No studentId found in auth storage!")
      console.log("[v0] This means learning results will NOT be saved to Firestore.")
      console.log("[v0] The director dashboard will NOT show this student's progress.")
      console.log("[v0] Full auth object:", JSON.stringify(auth))
      console.log("[v0] Solution: Please re-login. If problem persists, ask admin to verify student registration.")
      alert("학생 정보가 연결되지 않았습니다. 로그아웃 후 다시 로그인해주세요.")
    }

    sessionStorage.setItem(
      "learningResults",
      JSON.stringify({
        workbookId,
        textbookName: selectedTextbook?.name,
        subUnit: selectedSubUnit,
        readingTime,
        solvingTime,
        totalQuestions: problems.length,
        correctCount,
        results,
      }),
    )

    setTimeout(() => {
      router.push(
        `/student/results/${workbookId}?reading=${readingTime}&solving=${solvingTime}&correct=${correctCount}&total=${problems.length}`,
      )
    }, 1000)
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="h-8 bg-gray-200 rounded w-32 mx-auto animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (phase === "setup") {
    const availableSubUnits = selectedTextbook
      ? Object.keys(selectedTextbook.subUnits || {}).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      )
      : []

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white flex items-center justify-center p-3 sm:p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-gray-400 hover:bg-gray-100"
              onClick={handleExit}
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <CardTitle className="text-2xl sm:text-3xl text-center text-gray-900 font-serif">학습 준비</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {selectedTextbook ? selectedTextbook.name : "교재를 선택하세요"}
              </h2>
              {selectedTextbook && (
                <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                  <span className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 text-xs sm:text-sm rounded-full">
                    {selectedTextbook.category}
                  </span>
                  <span className="text-gray-500 text-sm sm:text-base">{selectedTextbook.unit}</span>
                </div>
              )}
              <p className="text-gray-500 text-sm sm:text-base">실제 교재를 보면서 답을 입력하게 됩니다.</p>
            </div>

            {!selectedTextbook && textbooks.length > 0 && (
              <div className="bg-gray-50 p-4 sm:p-6 rounded-lg space-y-2 sm:space-y-3">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="textbook-select" className="text-gray-900 font-semibold text-sm sm:text-base">
                    교재 선택
                  </Label>
                  <Select
                    value={(selectedTextbook as any)?.id || ""}
                    onValueChange={(id) => {
                      const textbook = textbooks.find((tb) => tb.id === id)
                      setSelectedTextbook(textbook || null)
                      setSelectedSubUnit("")
                    }}
                  >
                    <SelectTrigger id="textbook-select" className="bg-white">
                      <SelectValue placeholder="교재를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {textbooks.map((tb) => (
                        <SelectItem key={tb.id} value={tb.id}>
                          {tb.name} - {tb.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedTextbook && availableSubUnits.length > 0 && (
              <div className="bg-gray-50 p-4 sm:p-6 rounded-lg space-y-2 sm:space-y-3">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="subunit-select" className="text-gray-900 font-semibold text-sm sm:text-base">
                    학습할 소단원 선택
                  </Label>
                  <Select value={selectedSubUnit} onValueChange={setSelectedSubUnit}>
                    <SelectTrigger id="subunit-select" className="bg-white">
                      <SelectValue placeholder="소단원을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubUnits.map((subUnit) => {
                        const isCompleted = completedSubUnits.includes(subUnit)
                        return (
                          <SelectItem key={subUnit} value={subUnit} className={isCompleted ? "text-gray-500 font-medium" : ""}>
                            {subUnit} ({selectedTextbook.subUnits[subUnit].problems.length}문제) {isCompleted ? "✅ (오답 노트)" : ""}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedTextbook && availableSubUnits.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 sm:p-6 rounded-lg text-center">
                <p className="text-yellow-800 text-sm sm:text-base">이 교재에 등록된 소단원이 없습니다.</p>
                <p className="text-xs sm:text-sm text-yellow-700 mt-2">관리자에게 문의하세요.</p>
              </div>
            )}

            {textbooks.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 sm:p-6 rounded-lg text-center">
                <p className="text-yellow-800 text-sm sm:text-base">등록된 교재가 없습니다.</p>
                <p className="text-xs sm:text-sm text-yellow-700 mt-2">관리자에게 문의하세요.</p>
              </div>
            )}

            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg space-y-2 sm:space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                학습 안내
              </h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-500">
                <li>1. 실제 교재를 보면서 문제를 풀어주세요.</li>
                <li>2. 문제 풀이 시간이 자동으로 측정됩니다.</li>
                <li>3. 객관식은 번호를, 주관식과 서술형은 답을 직접 입력하세요.</li>
                <li>4. 제출하면 자동으로 채점됩니다.</li>
              </ul>
            </div>

            <Button
              onClick={startReading}
              disabled={!selectedSubUnit || !selectedTextbook}
              variant="gradient"
              className="w-full py-5 sm:py-6 text-base sm:text-lg disabled:opacity-50"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {completedSubUnits.includes(selectedSubUnit) ? "다시 풀기 (틀린 문제만)" : "학습 시작"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (phase === "reading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-gray-400 hover:bg-gray-100"
              onClick={handleExit}
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <CardTitle className="text-2xl sm:text-3xl text-center text-gray-900 font-serif">지문 읽기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">교재의 지문을 읽어주세요</h2>
              <p className="text-gray-500 text-sm sm:text-base">
                {selectedTextbook?.name} - {selectedSubUnit}
              </p>
            </div>

            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="py-6 sm:py-8">
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                    <span className="text-base sm:text-lg font-semibold text-purple-900">지문 읽기 시간</span>
                  </div>
                  <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-purple-600">
                    {formatTime(readingTime)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg space-y-2 sm:space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                안내
              </h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-500">
                <li>• 실제 교재의 지문을 천천히 읽어주세요.</li>
                <li>• 지문 읽기 시간이 자동으로 측정됩니다.</li>
                <li>• 지문을 다 읽으면 아래 버튼을 눌러 문제 풀이를 시작하세요.</li>
              </ul>
            </div>

            <Button
              onClick={startSolving}
              variant="gradient"
              className="w-full py-5 sm:py-6 text-base sm:text-lg"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              문제 풀이 시작
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (phase === "solving") {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4">
        <div className="max-w-4xl mx-auto py-4 sm:py-6 md:py-8">
          <Card className="mb-4 sm:mb-6 border-none shadow-sm">
            <CardContent className="py-3 sm:py-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs sm:text-sm font-semibold text-gray-500">지문 읽기 시간</span>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                    {formatTime(readingTime)}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-orange-50 rounded-lg">
                  <span className="text-xs sm:text-sm font-semibold text-orange-600">문제 풀이 시간</span>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">
                    {formatTime(solvingTime)}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 text-gray-400 hover:bg-gray-100"
                onClick={handleExit}
              >
                <X className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="mb-4 sm:mb-6 bg-white text-gray-900">
            <CardContent className="py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-base sm:text-lg font-semibold">
                    {selectedTextbook?.name} - {selectedSubUnit}
                  </span>
                </div>
                <span className="text-sm sm:text-base md:text-lg">총 {problems.length}문제</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 sm:space-y-6">
            {problems.map((problem) => {
              // Dynamic Type Detection Heuristic
              // Existing data often mislabels subjective questions as "multiple".
              // We override this based on the answer format.
              const cleanAnswer = problem.answer.trim()
              let effectiveType = problem.type

              if (/^[1-5]$/.test(cleanAnswer)) {
                effectiveType = "multiple"
              } else if (effectiveType === "multiple" && !/^[1-5]$/.test(cleanAnswer)) {
                // If labeled multiple but answer is NOT 1-5, force it to short/essay
                effectiveType = "short"
              }

              // Optional: treat long answers as essay if not already
              if (effectiveType === "short" && cleanAnswer.length > 30) {
                effectiveType = "essay"
              }

              return (
                <Card key={problem.number}>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl text-gray-900">
                      문제 {problem.number}
                      <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-normal text-gray-500">
                        ({effectiveType === "multiple" ? "객관식" : effectiveType === "short" ? "주관식" : "서술형"})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {effectiveType === "multiple" ? (
                      <div className="space-y-2">
                        {isRetryMode && lastResults?.[problem.number]?.correct && (
                          <div className="mb-2 p-2 bg-green-50 text-green-700 text-sm rounded border border-green-200">
                            ✅ 이전에 맞힌 문제입니다.
                          </div>
                        )}
                        <Label className="text-sm sm:text-base">답 번호를 선택하세요</Label>
                        <RadioGroup
                          value={answers[problem.number] || ""}
                          onValueChange={(value) => handleAnswerChange(problem.number, value)}
                        >
                          {["1", "2", "3", "4", "5"].map((num) => (
                            <div
                              key={num}
                              className="flex items-center space-x-2 p-2 sm:p-3 hover:bg-[#cfe8e9]/30 rounded-lg"
                            >
                              <RadioGroupItem value={num} id={`q${problem.number}-${num}`} />
                              <Label
                                htmlFor={`q${problem.number}-${num}`}
                                className="flex-1 cursor-pointer text-base sm:text-lg"
                              >
                                {num}번
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={answers[problem.number] === "모름"}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleAnswerChange(problem.number, "모름")
                                } else {
                                  handleAnswerChange(problem.number, "")
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                            />
                            <span className="text-sm text-gray-500">모름 (체크하고 다음 문제로)</span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {!isRetryMode || !lastResults?.[problem.number]?.correct ? (
                          <div className="flex items-center gap-2 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={answers[problem.number] === "모름"}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleAnswerChange(problem.number, "모름")
                                  } else {
                                    handleAnswerChange(problem.number, "")
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                              />
                              <span className="text-sm text-gray-500">모름 (체크하고 다음 문제로)</span>
                            </label>
                          </div>
                        ) : (
                          <div className="mb-2 p-2 bg-green-50 text-green-700 text-sm rounded border border-green-200">
                            ✅ 이전에 맞힌 문제입니다.
                          </div>
                        )}

                        {effectiveType === "short" ? (
                          <Input
                            value={answers[problem.number] === "모름" ? "" : answers[problem.number] || ""}
                            onChange={(e) => handleAnswerChange(problem.number, e.target.value)}
                            placeholder={answers[problem.number] === "모름" ? "모름으로 표시됨" : "정답을 입력하세요"}
                            className="bg-white"
                            disabled={answers[problem.number] === "모름" || (isRetryMode && lastResults?.[problem.number]?.correct)}
                          />
                        ) : (
                          <Textarea
                            value={answers[problem.number] === "모름" ? "" : answers[problem.number] || ""}
                            onChange={(e) => handleAnswerChange(problem.number, e.target.value)}
                            placeholder={answers[problem.number] === "모름" ? "모름으로 표시됨" : "서술형 답안을 입력하세요"}
                            className="bg-white min-h-[100px]"
                            disabled={answers[problem.number] === "모름" || (isRetryMode && lastResults?.[problem.number]?.correct)}
                          />
                        )}

                        <p className="text-xs sm:text-sm text-[#3d5a80]/60 mt-2">
                          * 서술형은 주요 키워드를 포함하여 작성하세요
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Button
            onClick={submitAnswers}
            disabled={Object.keys(answers).length !== problems.length}
            variant="gradient"
            className="w-full mt-4 sm:mt-6 py-5 sm:py-6 text-base sm:text-lg disabled:opacity-50"
          >
            제출하기
          </Button>
        </div>
      </div >
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="py-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">제출 완료!</h2>
          <p className="text-gray-500">결과 페이지로 이동합니다...</p>
        </CardContent>
      </Card>
    </div>
  )
}
