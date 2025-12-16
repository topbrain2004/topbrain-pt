"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { BookOpen, Plus, Edit, Trash2, Save } from 'lucide-react'
import { getAllTextbooks, createTextbook, updateTextbook, deleteTextbook, type Textbook } from "@/lib/firestore/textbooks"
import { BackButton } from "@/components/ui/back-button"
import { CSVUploadDialog } from "@/components/admin/csv-upload-dialog"
import { type Textbook as TextbookType } from "@/lib/firestore/types"

interface Problem {
  number: number
  type: "multiple" | "short" | "essay"
  answer: string
  keywords?: string[]
  domain?: string | null
}

const CATEGORIES = ["문학", "비문학", "문법", "어휘", "기타"]
const DOMAINS = ["사실적 이해", "추론적 이해", "비판적 이해", "어휘", "창의"]
const DIFFICULTIES = ["최상", "상", "중상", "중", "중하", "하", "최하"]
const STAGES = ["씨드라이트", "씨드코어", "리드키", "리드딥", "탑스타트", "탑엘리트", "탑브레인"]
const PROBLEM_TYPES = [
  { value: "multiple", label: "객관식" },
  { value: "short", label: "주관식" },
  { value: "essay", label: "서술형" },
]

const STAGE_ORDER: { [key: string]: number } = {
  "씨드라이트": 1,
  "씨드코어": 2,
  "리드키": 3,
  "리드딥": 4,
  "탑스타트": 5,
  "탑엘리트": 6,
  "탑브레인": 7,
}

export default function DirectorTextbooksPage() {
  const router = useRouter()
  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentTextbook, setCurrentTextbook] = useState<Partial<Textbook>>({
    name: "",
    category: "문학",
    unit: "",
    difficulty: "중",
    stage: "리드키",
    subUnits: {},
  })
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState("")

  const [currentSubUnit, setCurrentSubUnit] = useState("")
  const [problemCount, setProblemCount] = useState(5)
  const [currentProblems, setCurrentProblems] = useState<Problem[]>([])
  const [isEditingSubUnit, setIsEditingSubUnit] = useState(false)

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { getAuthFromStorage } = await import("@/lib/auth")
      const authData = getAuthFromStorage()

      if (!authData) {
        router.push("/login")
        return
      }

      if (authData.role !== "원장") {
        router.push("/login")
        return
      }

      const userId = authData.uid || authData.email
      console.log("[v0] Director setting currentUserId:", userId)
      setCurrentUserId(userId)
      loadTextbooks()
    }

    checkAuthAndLoad()
  }, [router])

  const loadTextbooks = async () => {
    try {
      setIsLoading(true)
      const data = await getAllTextbooks()
      console.log("[v0] Loaded textbooks from Firebase:", data)
      setTextbooks(data)
    } catch (error) {
      console.error("[v0] Error loading textbooks:", error)
      alert("교재 목록을 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCSVUpload = async (uploadedTextbooks: Partial<TextbookType>[]) => {
    try {
      setIsLoading(true)
      for (const textbook of uploadedTextbooks) {
        const newTextbookData = {
          name: textbook.title || "",
          category: textbook.category || "문학",
          unit: textbook.majorUnit || "",
          difficulty: "중",
          stage: "리드키",
          subUnits:
            textbook.subUnits?.reduce(
              (acc, su) => {
                acc[su.name] = {
                  problems: su.problems.map((p) => ({
                    number: p.number,
                    type: p.type || "multiple",
                    answer: p.correctAnswer || "",
                    keywords: p.keywords || [],
                    domain: p.domain || null,
                  })),
                }
                return acc
              },
              {} as Record<string, { problems: Problem[] }>,
            ) || {},
          createdBy: currentUserId,
        }
        await createTextbook(newTextbookData)
      }
      await loadTextbooks()
      alert(`${uploadedTextbooks.length}개 교재가 등록되었습니다.`)
    } catch (error) {
      console.error("Error uploading CSV:", error)
      alert("CSV 업로드 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTextbook = async () => {
    if (!currentTextbook.name || !currentTextbook.unit) {
      alert("교재명과 단원을 입력해주세요.")
      return
    }

    if (!currentUserId) {
      alert("사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.")
      return
    }

    try {
      setIsLoading(true)
      const newTextbookData = {
        name: currentTextbook.name,
        category: currentTextbook.category || "문학",
        unit: currentTextbook.unit,
        difficulty: currentTextbook.difficulty,
        stage: currentTextbook.stage,
        subUnits: currentTextbook.subUnits || {},
        createdBy: currentUserId,
      }

      console.log("[v0] Director creating textbook with userId:", currentUserId)
      console.log("[v0] Director creating textbook:", newTextbookData)
      const newId = await createTextbook(newTextbookData)
      console.log("[v0] Director created textbook with ID:", newId)

      await loadTextbooks()
      setIsAdding(false)
      setCurrentTextbook({ name: "", category: "문학", unit: "", difficulty: "중", stage: "리드키", subUnits: {} })
      alert("교재가 추가되었습니다.")
    } catch (error) {
      console.error("[v0] Error creating textbook:", error)
      alert("교재 추가 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditTextbook = (textbook: Textbook) => {
    setEditingId(textbook.id)
    setCurrentTextbook(textbook)
    setIsAdding(false)
  }

  const handleStartSubUnitConfig = () => {
    if (!currentSubUnit) {
      alert("소단원명을 입력해주세요.")
      return
    }

    const problems: Problem[] = Array.from({ length: problemCount }, (_, i) => ({
      number: i + 1,
      type: "multiple",
      answer: "",
      keywords: [],
    }))

    setCurrentProblems(problems)
    setIsEditingSubUnit(true)
  }

  const handleProblemChange = (index: number, field: keyof Problem, value: any) => {
    const updated = [...currentProblems]
    if (field === "keywords") {
      updated[index][field] = value
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setCurrentProblems(updated)
  }

  const handleSaveSubUnit = () => {
    const hasEmptyAnswers = currentProblems.some((p) => !p.answer.trim())
    if (hasEmptyAnswers) {
      alert("모든 문제의 정답을 입력해주세요.")
      return
    }

    const newSubUnits = {
      ...currentTextbook.subUnits,
      [currentSubUnit]: {
        problems: currentProblems,
      },
    }

    setCurrentTextbook({ ...currentTextbook, subUnits: newSubUnits })
    setCurrentSubUnit("")
    setProblemCount(5)
    setCurrentProblems([])
    setIsEditingSubUnit(false)
  }

  const handleEditSubUnit = (subUnitName: string) => {
    const subUnitData = currentTextbook.subUnits?.[subUnitName]
    if (subUnitData) {
      setCurrentSubUnit(subUnitName)
      setCurrentProblems(subUnitData.problems)
      setProblemCount(subUnitData.problems.length)
      setIsEditingSubUnit(true)
    }
  }

  const handleRemoveSubUnit = (subUnitName: string) => {
    const newSubUnits = { ...currentTextbook.subUnits }
    delete newSubUnits[subUnitName]
    setCurrentTextbook({ ...currentTextbook, subUnits: newSubUnits })
  }

  const textbooksByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = textbooks
      .filter((tb) => tb.stage === stage)
      .sort((a, b) => {
        // Sort by difficulty within stage
        const diffOrder = DIFFICULTIES.indexOf(a.difficulty || "중") - DIFFICULTIES.indexOf(b.difficulty || "중")
        if (diffOrder !== 0) return diffOrder
        // Then by name
        return a.name.localeCompare(b.name)
      })
    return acc
  }, {} as { [key: string]: Textbook[] })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BackButton />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 font-serif">교재 관리</h1>
            <p className="text-gray-500 text-lg">교재 정보 및 정답 관리</p>
          </div>
          <div className="flex gap-2">
            <CSVUploadDialog onUpload={handleCSVUpload} />
            <Button
              onClick={() => {
                setIsAdding(true)
                setEditingId(null)
                setCurrentTextbook({ name: "", category: "문학", unit: "", difficulty: "중", stage: "리드키", subUnits: {} })
              }}
              variant="gradient"
              className="text-white"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              교재 추가
            </Button>
          </div>
        </div>

        {(isAdding || editingId) && (
          <Card className="mb-8 border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">{editingId ? "교재 정보" : "새 교재 추가"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="name" className="text-gray-900">
                    교재명
                  </Label>
                  <Input
                    id="name"
                    value={currentTextbook.name}
                    onChange={(e) => setCurrentTextbook({ ...currentTextbook, name: e.target.value })}
                    placeholder="예: 문해력 기초 A"
                    className="border-gray-200"
                    disabled={!!editingId}
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-gray-900">
                    분류
                  </Label>
                  <Select
                    value={currentTextbook.category}
                    onValueChange={(value) => setCurrentTextbook({ ...currentTextbook, category: value })}
                    disabled={!!editingId}
                  >
                    <SelectTrigger className="border-green-900/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="unit" className="text-green-900">
                    단원
                  </Label>
                  <Input
                    id="unit"
                    value={currentTextbook.unit}
                    onChange={(e) => setCurrentTextbook({ ...currentTextbook, unit: e.target.value })}
                    placeholder="예: 1단원"
                    className="border-gray-200"
                    disabled={!!editingId}
                  />
                </div>

                <div>
                  <Label htmlFor="difficulty" className="text-green-900">
                    난이도
                  </Label>
                  <Select
                    value={currentTextbook.difficulty}
                    onValueChange={(value) => setCurrentTextbook({ ...currentTextbook, difficulty: value })}
                    disabled={!!editingId}
                  >
                    <SelectTrigger className="border-green-900/30">
                      <SelectValue placeholder="난이도 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((diff) => (
                        <SelectItem key={diff} value={diff}>
                          {diff}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="stage" className="text-green-900">
                    단계
                  </Label>
                  <Select
                    value={currentTextbook.stage}
                    onValueChange={(value) => setCurrentTextbook({ ...currentTextbook, stage: value })}
                    disabled={!!editingId}
                  >
                    <SelectTrigger className="border-green-900/30">
                      <SelectValue placeholder="단계 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">소단원별 정답 정보</h3>

                {!isEditingSubUnit && !editingId ? (
                  <>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label htmlFor="subunit" className="text-green-900">
                          소단원명
                        </Label>
                        <Input
                          id="subunit"
                          value={currentSubUnit}
                          onChange={(e) => setCurrentSubUnit(e.target.value)}
                          placeholder="예: 1. 주제 찾기"
                          className="border-green-900/30"
                        />
                      </div>

                      <div>
                        <Label htmlFor="problem-count" className="text-green-900">
                          문제 개수
                        </Label>
                        <Input
                          id="problem-count"
                          type="number"
                          min="1"
                          max="100"
                          value={problemCount}
                          onChange={(e) => setProblemCount(Number(e.target.value) || 1)}
                          placeholder="문제 개수 입력"
                          className="border-green-900/30"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-900 opacity-0">시작</Label>
                        <Button onClick={handleStartSubUnitConfig} className="w-full bg-gray-900 hover:bg-black text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          문제 설정 시작
                        </Button>
                      </div>
                    </div>
                  </>
                ) : isEditingSubUnit ? (
                  <div className="space-y-4">
                    <div className="bg-gray-100 text-gray-900 p-4 rounded-lg">
                      <h4 className="font-semibold text-lg">
                        {currentSubUnit} - {currentProblems.length}문제 설정
                      </h4>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {currentProblems.map((problem, index) => (
                        <Card key={index} className="border-gray-200">
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 mb-3">
                                <h5 className="font-semibold text-green-900 min-w-[60px]">문제 {problem.number}</h5>
                                <div className="flex-1 flex gap-2">
                                  <Select
                                    value={problem.domain || "사실적 이해"}
                                    onValueChange={(value) => handleProblemChange(index, "domain", value)}
                                  >
                                    <SelectTrigger className="flex-1 border-green-900/30">
                                      <SelectValue placeholder="영역 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DOMAINS.map((domain) => (
                                        <SelectItem key={domain} value={domain}>
                                          {domain}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <Select
                                    value={problem.type}
                                    onValueChange={(value) =>
                                      handleProblemChange(index, "type", value as "multiple" | "short" | "essay")
                                    }
                                  >
                                    <SelectTrigger className="w-32 border-green-900/30">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PROBLEM_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {problem.type === "multiple" ? (
                                <div>
                                  <Label className="text-green-900">정답 번호</Label>
                                  <Select
                                    value={problem.answer}
                                    onValueChange={(value) => handleProblemChange(index, "answer", value)}
                                  >
                                    <SelectTrigger className="border-green-900/30">
                                      <SelectValue placeholder="정답 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {["1", "2", "3", "4", "5"].map((num) => (
                                        <SelectItem key={num} value={num}>
                                          {num}번
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : problem.type === "short" ? (
                                <div>
                                  <Label className="text-green-900">정답</Label>
                                  <Input
                                    value={problem.answer}
                                    onChange={(e) => handleProblemChange(index, "answer", e.target.value)}
                                    placeholder="정답을 입력하세요"
                                    className="border-green-900/30"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-green-900">모범 답안</Label>
                                    <Textarea
                                      value={problem.answer}
                                      onChange={(e) => handleProblemChange(index, "answer", e.target.value)}
                                      placeholder="모범 답안을 입력하세요"
                                      className="border-green-900/30 min-h-[80px]"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-green-900">채점 키워드 (쉼표로 구분)</Label>
                                    <Input
                                      value={problem.keywords?.join(", ") || ""}
                                      onChange={(e) =>
                                        handleProblemChange(
                                          index,
                                          "keywords",
                                          e.target.value.split(",").map((k) => k.trim()),
                                        )
                                      }
                                      placeholder="예: 주제, 의미, 교훈"
                                      className="border-green-900/30"
                                    />
                                    <p className="text-xs text-green-900/60 mt-1">
                                      키워드 60% 이상 포함 시 정답으로 인정됩니다
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button onClick={handleSaveSubUnit} className="flex-1 bg-gray-900 hover:bg-black text-white">
                        <Save className="w-4 h-4 mr-2" />
                        소단원 저장
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingSubUnit(false)
                          setCurrentSubUnit("")
                          setCurrentProblems([])
                        }}
                        className="flex-1 border-green-900/30 text-green-900"
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                ) : null}

                {Object.keys(currentTextbook.subUnits || {}).length > 0 && !isEditingSubUnit && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">등록된 소단원</h4>
                    <div className="space-y-2">
                      {Object.entries(currentTextbook.subUnits || {}).map(([subUnitName, data]) => (
                        <div
                          key={subUnitName}
                          className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <div>
                            <span className="font-semibold text-gray-900">{subUnitName}</span>
                            <span className="text-sm text-gray-500 ml-3">{data.problems.length}문제</span>
                            <span className="text-xs text-gray-400 ml-2">
                              (객관식 {data.problems.filter((p) => p.type === "multiple").length}, 주관식{" "}
                              {data.problems.filter((p) => p.type === "short").length}, 서술형{" "}
                              {data.problems.filter((p) => p.type === "essay").length})
                            </span>
                          </div>
                          {!editingId && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSubUnit(subUnitName)}
                                className="text-green-900 hover:bg-green-900/10"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveSubUnit(subUnitName)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!editingId && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleAddTextbook}
                    className="bg-gray-900 hover:bg-black text-white"
                    disabled={isLoading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    교재 저장
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false)
                      setEditingId(null)
                      setCurrentTextbook({ name: "", category: "문학", unit: "", difficulty: "중", stage: "리드키", subUnits: {} })
                    }}
                    className="border-green-900/30 text-green-900"
                  >
                    취소
                  </Button>
                </div>
              )}
              {editingId && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingId(null)
                      setCurrentTextbook({ name: "", category: "문학", unit: "", difficulty: "중", stage: "리드키", subUnits: {} })
                    }}
                    className="border-green-900/30 text-green-900"
                  >
                    닫기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-green-900/60">로딩 중...</p>
          </div>
        ) : textbooks.length === 0 && !isAdding ? (
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">등록된 교재가 없습니다.</p>
              <Button onClick={() => setIsAdding(true)} variant="gradient" className="text-white">
                <Plus className="w-4 h-4 mr-2" />첫 교재 추가하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {STAGES.map((stage) => {
              const stageTextbooks = textbooksByStage[stage]
              if (stageTextbooks.length === 0) return null

              return (
                <div key={stage}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg">
                      <span className="text-lg font-bold">{STAGE_ORDER[stage]}단계</span>
                      <span className="text-xl font-bold">{stage}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {stageTextbooks.length}개 교재
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stageTextbooks.map((textbook) => (
                      <Card key={textbook.id} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-gray-700" />
                              </div>
                              <div>
                                <CardTitle className="text-lg text-gray-900">{textbook.name}</CardTitle>
                                <p className="text-sm text-gray-500">{textbook.unit}</p>
                              </div>
                            </div>
                            <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">
                              {textbook.category}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex gap-2 text-sm flex-wrap">
                              {textbook.difficulty && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                  난이도: {textbook.difficulty}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              등록된 소단원:{" "}
                              <span className="font-semibold">{Object.keys(textbook.subUnits || {}).length}개</span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTextbook(textbook)}
                              className="w-full border-gray-200 text-gray-700 hover:bg-gray-50"
                              disabled={isLoading}
                            >
                              <BookOpen className="w-4 h-4 mr-1" />
                              상세보기
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
