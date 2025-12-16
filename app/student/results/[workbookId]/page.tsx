"use client"
import { useEffect, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, Trophy, ArrowLeft } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"

interface ResultDetail {
  correct: boolean
  userAnswer: string
  correctAnswer: string
  feedback?: string
}

interface LearningResults {
  workbookId: string
  textbookName: string
  page: string
  solvingTime: number
  totalQuestions: number
  correctCount: number
  results: Record<number, ResultDetail>
}

export default function ResultsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const [results, setResults] = useState<LearningResults | null>(null)

  const solvingTime = Number.parseInt(searchParams.get("solving") || "0")
  const correctCount = Number.parseInt(searchParams.get("correct") || "0")
  const totalQuestions = Number.parseInt(searchParams.get("total") || "0")

  useEffect(() => {
    const stored = sessionStorage.getItem("learningResults")
    if (stored) {
      const loadedResults = JSON.parse(stored) as LearningResults
      setResults(loadedResults)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}분 ${secs}초`
  }

  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">결과를 불러오는 중...</p>
          </CardContent>
        </Card>
      </div>
    )
  }



  // ...

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto py-8">
        <BackButton href="/student" label="대시보드로 돌아가기" />
        {/* Score Card */}
        <Card className="mb-6 border-none shadow-sm bg-white">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-12 h-12 text-yellow-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 font-serif">학습 완료!</h1>
              <div className="text-6xl font-bold text-gray-900">{score}점</div>
              <p className="text-xl text-gray-500">
                {results.correctCount}/{results.totalQuestions} 문제 정답
              </p>
              <p className="text-sm text-gray-400">
                {results.textbookName} - 페이지 {results.page}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Time Stats */}
        <div className="grid md:grid-cols-1 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                <Clock className="w-5 h-5 text-gray-500" />
                문제 풀이 시간
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{formatTime(results.solvingTime)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Card className="mb-6 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">상세 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(results.results).map(([problemNumber, detail]) => (
              <div key={problemNumber} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-start gap-3 mb-3">
                  {detail.correct ? (
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">문제 {problemNumber}</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">
                        <span className="font-semibold">내 답변:</span> {detail.userAnswer || "(답변 없음)"}
                      </p>
                      {/* AI Feedback */}
                      {detail.feedback && (
                        <div className="mt-3 p-3 bg-blue-50 text-blue-900 rounded-md text-sm border border-blue-100 flex items-start gap-2">
                          <span className="font-bold shrink-0">AI 선생님:</span>
                          <span>{detail.feedback}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={() => router.push("/student")}
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로
          </Button>
          <Button
            onClick={() => router.push(`/student/learn/${params.workbookId}`)}
            variant="gradient"
            className="flex-1"
          >
            다음 문제 풀기
          </Button>
        </div>
      </div>
    </div>
  )
}
