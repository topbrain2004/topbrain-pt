"use client"

import { useState } from "react"
import { Table, Trash2, Plus, Copy, ClipboardPaste } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface BulkProblem {
  number: number
  type: "multiple" | "short" | "essay"
  answer: string
  keywords?: string[]
}

interface BulkAnswerInputProps {
  subUnitName: string
  initialProblems?: BulkProblem[]
  onSave: (problems: BulkProblem[]) => void
}

export function BulkAnswerInput({ subUnitName, initialProblems = [], onSave }: BulkAnswerInputProps) {
  const [open, setOpen] = useState(false)
  const [problems, setProblems] = useState<BulkProblem[]>(
    initialProblems.length > 0 ? initialProblems : [{ number: 1, type: "multiple", answer: "" }],
  )
  const [bulkInput, setBulkInput] = useState("")
  const [inputMode, setInputMode] = useState<"table" | "bulk">("table")

  const addProblem = () => {
    const nextNumber = problems.length > 0 ? Math.max(...problems.map((p) => p.number)) + 1 : 1
    setProblems([...problems, { number: nextNumber, type: "multiple", answer: "" }])
  }

  const removeProblem = (index: number) => {
    setProblems(problems.filter((_, i) => i !== index))
  }

  const updateProblem = (index: number, field: keyof BulkProblem, value: any) => {
    const updated = [...problems]
    if (field === "keywords") {
      updated[index] = { ...updated[index], [field]: value }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setProblems(updated)
  }

  // 일괄 입력 파싱 (형식: "1.3 2.4 3.1" 또는 "1,3\n2,4\n3,1")
  const parseBulkInput = () => {
    const lines = bulkInput.trim().split(/[\n\s]+/)
    const parsed: BulkProblem[] = []

    for (const line of lines) {
      // "1.3" 또는 "1,3" 또는 "1:3" 형식
      const match = line.match(/^(\d+)[.,:](.+)$/)
      if (match) {
        const number = Number.parseInt(match[1])
        const answer = match[2].trim()
        parsed.push({
          number,
          type: /^\d$/.test(answer) ? "multiple" : "short",
          answer,
        })
      }
    }

    if (parsed.length > 0) {
      // 번호순 정렬
      parsed.sort((a, b) => a.number - b.number)
      setProblems(parsed)
      setInputMode("table")
      setBulkInput("")
    }
  }

  // 테이블 데이터를 일괄 입력 형식으로 변환
  const exportToBulk = () => {
    const text = problems.map((p) => `${p.number}.${p.answer}`).join(" ")
    setBulkInput(text)
    setInputMode("bulk")
  }

  const handleSave = () => {
    onSave(problems.filter((p) => p.answer.trim() !== ""))
    setOpen(false)
  }

  const problemCount = problems.filter((p) => p.answer.trim() !== "").length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-[#3d5a80]/30 text-[#3d5a80] bg-transparent">
          <Table className="w-4 h-4 mr-1" />
          답안 입력 ({problemCount}문제)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[#3d5a80]">{subUnitName} - 답안 입력</DialogTitle>
          <DialogDescription>문제별 유형과 정답을 입력하세요. 서술형은 채점 키워드도 입력해주세요.</DialogDescription>
        </DialogHeader>

        {/* 입력 모드 전환 */}
        <div className="flex gap-2 border-b pb-3">
          <Button
            variant={inputMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputMode("table")}
            className={inputMode === "table" ? "bg-[#3d5a80]" : ""}
          >
            <Table className="w-4 h-4 mr-1" />
            테이블 입력
          </Button>
          <Button
            variant={inputMode === "bulk" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputMode("bulk")}
            className={inputMode === "bulk" ? "bg-[#3d5a80]" : ""}
          >
            <ClipboardPaste className="w-4 h-4 mr-1" />
            일괄 입력
          </Button>
          {inputMode === "table" && problems.length > 0 && (
            <Button variant="ghost" size="sm" onClick={exportToBulk} className="ml-auto">
              <Copy className="w-4 h-4 mr-1" />
              복사
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {inputMode === "bulk" ? (
            <div className="space-y-4">
              <div>
                <Label className="text-[#3d5a80]">일괄 입력</Label>
                <Textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="형식: 1.3 2.4 3.1 또는&#10;1,정답1&#10;2,정답2&#10;3,정답3"
                  className="min-h-[200px] font-mono border-[#3d5a80]/30"
                />
                <p className="text-xs text-[#3d5a80]/60 mt-1">
                  문제번호.정답 또는 문제번호,정답 형식으로 입력하세요. 공백이나 줄바꿈으로 구분합니다.
                </p>
              </div>
              <Button onClick={parseBulkInput} className="bg-[#3d5a80]">
                파싱하여 적용
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 테이블 헤더 */}
              <div className="grid grid-cols-[60px_100px_1fr_150px_40px] gap-2 text-sm font-medium text-[#3d5a80] pb-2 border-b">
                <span>번호</span>
                <span>유형</span>
                <span>정답</span>
                <span>키워드 (서술형)</span>
                <span></span>
              </div>

              {/* 문제 행들 */}
              {problems.map((problem, index) => (
                <div key={index} className="grid grid-cols-[60px_100px_1fr_150px_40px] gap-2 items-center">
                  <Input
                    type="number"
                    value={problem.number}
                    onChange={(e) => updateProblem(index, "number", Number.parseInt(e.target.value) || 0)}
                    className="border-[#3d5a80]/30 text-center"
                    min={1}
                  />
                  <Select value={problem.type} onValueChange={(value) => updateProblem(index, "type", value)}>
                    <SelectTrigger className="border-[#3d5a80]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple">객관식</SelectItem>
                      <SelectItem value="short">주관식</SelectItem>
                      <SelectItem value="essay">서술형</SelectItem>
                    </SelectContent>
                  </Select>
                  {problem.type === "multiple" ? (
                    <Select value={problem.answer} onValueChange={(value) => updateProblem(index, "answer", value)}>
                      <SelectTrigger className="border-[#3d5a80]/30">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {["1", "2", "3", "4", "5"].map((num) => (
                          <SelectItem key={num} value={num}>
                            {num}번
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={problem.answer}
                      onChange={(e) => updateProblem(index, "answer", e.target.value)}
                      placeholder={problem.type === "essay" ? "모범 답안" : "정답"}
                      className="border-[#3d5a80]/30"
                    />
                  )}
                  <Input
                    value={problem.keywords?.join(", ") || ""}
                    onChange={(e) =>
                      updateProblem(
                        index,
                        "keywords",
                        e.target.value
                          .split(",")
                          .map((k) => k.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="키워드1, 키워드2"
                    className="border-[#3d5a80]/30"
                    disabled={problem.type !== "essay"}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProblem(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {/* 문제 추가 버튼 */}
              <Button
                variant="outline"
                onClick={addProblem}
                className="w-full border-dashed border-[#3d5a80]/30 text-[#3d5a80] bg-transparent"
              >
                <Plus className="w-4 h-4 mr-1" />
                문제 추가
              </Button>
            </div>
          )}
        </div>

        {/* 하단 요약 및 저장 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Badge variant="outline" className="border-[#3d5a80]/30">
              총 {problemCount}문제
            </Badge>
            <Badge variant="outline" className="border-blue-500/30 text-blue-600">
              객관식 {problems.filter((p) => p.type === "multiple" && p.answer).length}
            </Badge>
            <Badge variant="outline" className="border-green-500/30 text-green-600">
              주관식 {problems.filter((p) => p.type === "short" && p.answer).length}
            </Badge>
            <Badge variant="outline" className="border-purple-500/30 text-purple-600">
              서술형 {problems.filter((p) => p.type === "essay" && p.answer).length}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} className="bg-[#3d5a80] hover:bg-[#3d5a80]/90">
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
