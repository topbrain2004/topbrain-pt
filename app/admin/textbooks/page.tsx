"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { BookOpen, Plus, Edit, Trash2, Save, Download } from "lucide-react"
import {
  getAllTextbooks,
  createTextbook,
  updateTextbook,
  deleteTextbook,
  type Textbook,
} from "@/lib/firestore/textbooks"
import { CSVUploadDialog } from "@/components/admin/csv-upload-dialog"
import { BulkAnswerInput } from "@/components/admin/bulk-answer-input"
import { convertTextbooksToCSV } from "@/lib/csv-parser"
import type { Textbook as TextbookType } from "@/lib/firestore/types"
import { BackButton } from "@/components/ui/back-button"

interface Problem {
  number: number
  type: "multiple" | "short" | "essay"
  answer: string
  keywords?: string[]
  domain?: string | null
}

const CATEGORIES = ["문학", "비문학", "문법", "어휘", "기타"]
const DIFFICULTIES = ["최상", "상", "중상", "중", "중하", "하", "최하"]
const STAGES = ["씨드라이트", "씨드코어", "리드키", "리드딥", "탑스타트", "탑엘리트", "탑브레인"]
const PROBLEM_TYPES = [
  { value: "multiple", label: "객관식" },
  { value: "short", label: "주관식" },
  { value: "essay", label: "서술형" },
]

const STAGE_ORDER: { [key: string]: number } = {
  씨드라이트: 1,
  씨드코어: 2,
  리드키: 3,
  리드딥: 4,
  탑스타트: 5,
  탑엘리트: 6,
  탑브레인: 7,
}

export default function TextbookManagement() {
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
    const checkAuth = async () => {
      try {
        const { refreshAuth, getAuthFromStorage } = await import("@/lib/auth")
        await refreshAuth()
        const authData = getAuthFromStorage()

        if (!authData) {
          router.push("/login")
          return
        }

        if (authData.role !== "관리자") {
          if (authData.role === "원장") router.push("/director")
          else if (authData.role === "학생") router.push("/student")
          else router.push("/login")
          return
        }

        const userId = authData.uid || authData.email || "system"
        setCurrentUserId(userId)
        loadTextbooks()
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  const loadTextbooks = async () => {
    try {
      setIsLoading(true)
      const data = await getAllTextbooks()
      setTextbooks(data)
    } catch (error) {
      console.error("Error loading textbooks:", error)
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

  const handleExportCSV = () => {
    const convertedTextbooks: TextbookType[] = textbooks.map((tb) => ({
      id: tb.id,
      title: tb.name,
      level: tb.difficulty || "중",
      page: 0,
      totalProblems: Object.values(tb.subUnits || {}).reduce((sum, su) => sum + su.problems.length, 0),
      problems: [],
      majorUnit: tb.unit,
      category: tb.category,
      subUnits: Object.entries(tb.subUnits || {}).map(([name, data]) => ({
        id: name,
        name,
        page: 0,
        problems: data.problems.map((p) => ({
          number: p.number,
          question: "",
          options: [],
          correctAnswer: p.answer,
          type: p.type,
          keywords: p.keywords,
        })),
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    const csv = convertTextbooksToCSV(convertedTextbooks)
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `교재_답안_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkAnswerSave = (subUnitName: string, problems: Problem[]) => {
    const newSubUnits = {
      ...currentTextbook.subUnits,
      [subUnitName]: { problems },
    }
    setCurrentTextbook({ ...currentTextbook, subUnits: newSubUnits })
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

      const newId = await createTextbook(newTextbookData)

      await loadTextbooks()
      setIsAdding(false)
      setCurrentTextbook({ name: "", category: "문학", unit: "", difficulty: "중", stage: "리드키", subUnits: {} })
      alert("교재가 추가되었습니다.")
    } catch (error) {
      console.error("Error creating textbook:", error)
      alert("교재 추가 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTextbook = async () => {
    if (!editingId) return

    try {
      setIsLoading(true)
      const updates = {
        name: currentTextbook.name,
        category: currentTextbook.category,
        unit: currentTextbook.unit,
        difficulty: currentTextbook.difficulty,
        stage: currentTextbook.stage,
        subUnits: currentTextbook.subUnits,
      }

      await updateTextbook(editingId, updates)

      await loadTextbooks()
      setEditingId(null)
      setCurrentTextbook({ name: "", category: "문학", unit: "", difficulty: "중", stage: "리드키", subUnits: {} })
      alert("교재가 수정되었습니다.")
    } catch (error) {
      console.error("Error updating textbook:", error)
      alert("교재 수정 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTextbook = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return

    try {
      setIsLoading(true)
      await deleteTextbook(id)

      await loadTextbooks()
      alert("교재가 삭제되었습니다.")
    } catch (error) {
      console.error("Error deleting textbook:", error)
      alert("교재 삭제 중 오류가 발생했습니다.")
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

  const textbooksByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = textbooks
        .filter((tb) => tb.stage === stage)
        .sort((a, b) => {
          const diffOrder = DIFFICULTIES.indexOf(a.difficulty || "중") - DIFFICULTIES.indexOf(b.difficulty || "중")
          if (diffOrder !== 0) return diffOrder
          return a.name.localeCompare(b.name)
        })
      return acc
    },
    {} as { [key: string]: Textbook[] },
  )



  // ... imports

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BackButton />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 font-serif">교재 관리</h1>
            <p className="text-gray-500 text-lg">교재 정보 및 정답 관리</p>
          </div>
          <div className="flex gap-2">
            <CSVUploadDialog onUpload={handleCSVUpload} />
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
              disabled={textbooks.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV 내보내기
            </Button>
            <Button
              onClick={() => {
                setIsAdding(true)
                setEditingId(null)
                setCurrentTextbook({
                  name: "",
                  category: "문학",
                  unit: "",
                  difficulty: "중",
                  stage: "리드키",
                  subUnits: {},
                })
              }}
              className="text-white"
              variant="gradient"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              교재 추가
            </Button>
          </div>
        </div>

        {(isAdding || editingId) && (
          <Card className="mb-8 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">{editingId ? "교재 수정" : "새 교재 추가"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-900">
                    교재명
                  </Label>
                  <Input
                    id="name"
                    value={currentTextbook.name}
                    onChange={(e) => setCurrentTextbook({ ...currentTextbook, name: e.target.value })}
                    placeholder="예: 문해력 기초 A"
                    className="border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-900">
                    분류
                  </Label>
                  <Select
                    value={currentTextbook.category}
                    onValueChange={(value) => setCurrentTextbook({ ...currentTextbook, category: value })}
                  >
                    <SelectTrigger className="border-gray-200">
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

                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-gray-900">
                    단원
                  </Label>
                  <Input
                    id="unit"
                    value={currentTextbook.unit}
                    onChange={(e) => setCurrentTextbook({ ...currentTextbook, unit: e.target.value })}
                    placeholder="예: 1단원"
                    className="border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty" className="text-gray-900">
                    난이도
                  </Label>
                  <Select
                    value={currentTextbook.difficulty}
                    onValueChange={(value) => setCurrentTextbook({ ...currentTextbook, difficulty: value })}
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue />
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

                <div className="space-y-2">
                  <Label htmlFor="stage" className="text-gray-900">
                    단계
                  </Label>
                  <Select
                    value={currentTextbook.stage}
                    onValueChange={(value) => setCurrentTextbook({ ...currentTextbook, stage: value })}
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue />
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

              {/* 소단원 관리 섹션 */}
              <div className="space-y-4 border rounded-lg p-4 bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 mb-4">소단원 및 정답 관리</h3>

                {/* 기존 소단원 목록 */}
                {currentTextbook.subUnits && Object.keys(currentTextbook.subUnits).length > 0 && (
                  <div className="mb-4 space-y-2">
                    {Object.entries(currentTextbook.subUnits).map(([name, data]) => (
                      <div key={name} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{name}</span>
                          <span className="text-sm text-gray-500">({data.problems.length}문제)</span>
                        </div>
                        <div className="flex gap-2">
                          <BulkAnswerInput
                            subUnitName={name}
                            initialProblems={data.problems}
                            onSave={(problems) => handleBulkAnswerSave(name, problems)}
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleEditSubUnit(name)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSubUnit(name)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 새 소단원 추가 */}
                {!isEditingSubUnit ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">새 소단원명</Label>
                      <Input
                        value={currentSubUnit}
                        onChange={(e) => setCurrentSubUnit(e.target.value)}
                        placeholder="예: 1-1. 주어와 서술어"
                        className="border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">문제 수</Label>
                      <Input
                        type="number"
                        value={problemCount}
                        onChange={(e) => setProblemCount(Math.max(1, Number.parseInt(e.target.value) || 1))}
                        min={1}
                        max={50}
                        className="border-gray-200"
                      />
                    </div>
                    <Button onClick={handleStartSubUnitConfig} className="bg-gray-900 hover:bg-black text-white">
                      <Plus className="w-4 h-4 mr-1" />
                      추가
                    </Button>
                  </div>
                ) : (
                  <div className="bg-gray-100 p-4 rounded-lg mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {currentSubUnit} - 정답 입력 ({currentProblems.length}문제)
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingSubUnit(false)
                          setCurrentSubUnit("")
                          setCurrentProblems([])
                        }}
                      >
                        취소
                      </Button>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {currentProblems.map((problem, index) => (
                        <Card key={index} className="border-gray-200 shadow-sm bg-white">
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-gray-900">문제 {problem.number}</h5>
                                <Select
                                  value={problem.type}
                                  onValueChange={(value) =>
                                    handleProblemChange(index, "type", value as "multiple" | "short" | "essay")
                                  }
                                >
                                  <SelectTrigger className="w-32 border-gray-200">
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

                              {problem.type === "multiple" ? (
                                <div>
                                  <Label className="text-gray-900">정답 번호</Label>
                                  <Select
                                    value={problem.answer}
                                    onValueChange={(value) => handleProblemChange(index, "answer", value)}
                                  >
                                    <SelectTrigger className="border-gray-200">
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
                                  <Label className="text-gray-900">정답</Label>
                                  <Input
                                    value={problem.answer}
                                    onChange={(e) => handleProblemChange(index, "answer", e.target.value)}
                                    placeholder="정답을 입력하세요"
                                    className="border-gray-200"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-gray-900">모범 답안</Label>
                                    <Textarea
                                      value={problem.answer}
                                      onChange={(e) => handleProblemChange(index, "answer", e.target.value)}
                                      placeholder="모범 답안을 입력하세요"
                                      className="border-gray-200 min-h-[80px]"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-gray-900">채점 키워드 (쉼표로 구분)</Label>
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
                                      className="border-gray-200"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
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

                    <Button onClick={handleSaveSubUnit} className="w-full bg-gray-900 hover:bg-black text-white">
                      <Save className="w-4 h-4 mr-2" />
                      소단원 저장
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false)
                    setEditingId(null)
                    setCurrentTextbook({
                      name: "",
                      category: "문학",
                      unit: "",
                      difficulty: "중",
                      stage: "리드키",
                      subUnits: {},
                    })
                    setIsEditingSubUnit(false)
                    setCurrentSubUnit("")
                    setCurrentProblems([])
                  }}
                  className="border-gray-200"
                >
                  취소
                </Button>
                <Button
                  onClick={editingId ? handleUpdateTextbook : handleAddTextbook}
                  disabled={isLoading}
                  className="bg-gray-900 hover:bg-black text-white"
                  variant="gradient"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "저장 중..." : editingId ? "수정 저장" : "교재 저장"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 교재 목록 - 단계별 그룹화 */}
        <div className="space-y-8">
          {STAGES.map((stage) => {
            const stageTextbooks = textbooksByStage[stage]
            if (stageTextbooks.length === 0) return null

            return (
              <div key={stage} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 font-serif">
                    <span className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm">
                      {STAGE_ORDER[stage]}
                    </span>
                    {stage}
                  </h2>
                  <span className="text-sm font-normal text-gray-500">({stageTextbooks.length}개)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stageTextbooks.map((textbook) => {
                    const problemCount = Object.values(textbook.subUnits || {}).reduce(
                      (sum, su) => sum + su.problems.length,
                      0,
                    )
                    return (
                      <div key={textbook.id} className="group relative">
                        {/* Textbook Card */}
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                        <Card key={textbook.id} className="relative border-none shadow-sm hover:shadow-md transition-shadow bg-white">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{textbook.name}</h3>
                                <p className="text-sm text-gray-500">{textbook.unit}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 hover:text-gray-900"
                                  onClick={() => handleEditTextbook(textbook)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 hover:text-red-600"
                                  onClick={() => handleDeleteTextbook(textbook.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                {textbook.category}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                {textbook.difficulty}
                              </span>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                              <p className="text-sm text-gray-600 mb-2 font-medium">소단원 목록</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.keys(textbook.subUnits || {}).map(sub => (
                                  <span key={sub} className="px-2 py-1 bg-gray-50 text-gray-600 rounded border border-gray-200 text-xs">
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {textbooks.length === 0 && !isLoading && (
            <div className="text-center py-16 text-gray-500">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">등록된 교재가 없습니다.</p>
              <p className="text-sm mt-2">위의 "교재 추가" 버튼을 클릭하거나 CSV 파일을 업로드하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
