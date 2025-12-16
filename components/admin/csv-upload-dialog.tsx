"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, FileText, Download, AlertCircle, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { parseCSV, convertCSVToTextbooks, generateCSVTemplate } from "@/lib/csv-parser"
import type { Textbook } from "@/lib/firestore/types"

interface CSVUploadDialogProps {
  onUpload: (textbooks: Partial<Textbook>[]) => Promise<void>
}

export function CSVUploadDialog({ onUpload }: CSVUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<{
    success: boolean
    textbooks: Partial<Textbook>[]
    totalProblems: number
    errors: string[]
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      processFile(droppedFile)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const processFile = async (file: File) => {
    setFile(file)
    setParseResult(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      if (rows.length === 0) {
        setParseResult({
          success: false,
          textbooks: [],
          totalProblems: 0,
          errors: ["CSV 파일에 데이터가 없습니다. 헤더 행 아래에 데이터를 추가해주세요."],
        })
        return
      }

      const textbooks = convertCSVToTextbooks(rows)
      const totalProblems = textbooks.reduce((sum, tb) => sum + (tb.totalProblems || 0), 0)

      setParseResult({
        success: true,
        textbooks,
        totalProblems,
        errors: [],
      })
    } catch (error) {
      setParseResult({
        success: false,
        textbooks: [],
        totalProblems: 0,
        errors: ["CSV 파일 파싱 중 오류가 발생했습니다. 파일 형식을 확인해주세요."],
      })
    }
  }

  const handleUpload = async () => {
    if (!parseResult?.success || parseResult.textbooks.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      await onUpload(parseResult.textbooks)

      clearInterval(progressInterval)
      setUploadProgress(100)

      setTimeout(() => {
        setOpen(false)
        resetState()
      }, 1000)
    } catch (error) {
      setParseResult({
        ...parseResult,
        errors: ["업로드 중 오류가 발생했습니다."],
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = generateCSVTemplate()
    const blob = new Blob(["\ufeff" + template], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "교재_답안_템플릿.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetState = () => {
    setFile(null)
    setParseResult(null)
    setUploadProgress(0)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetState()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="border-[#3d5a80] text-[#3d5a80] hover:bg-[#3d5a80]/10 bg-transparent">
          <Upload className="w-4 h-4 mr-2" />
          CSV 업로드
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-[#3d5a80]">CSV로 교재 답안 일괄 등록</DialogTitle>
          <DialogDescription>CSV 파일을 업로드하여 교재와 답안을 일괄로 등록할 수 있습니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 템플릿 다운로드 */}
          <div className="flex items-center justify-between p-3 bg-[#3d5a80]/5 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#3d5a80]" />
              <span className="text-sm text-[#3d5a80]">템플릿 파일이 필요하신가요?</span>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-[#3d5a80]">
              <Download className="w-4 h-4 mr-1" />
              다운로드
            </Button>
          </div>

          {/* 파일 업로드 영역 */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? "border-[#3d5a80] bg-[#3d5a80]/10" : "border-[#3d5a80]/30"}
              ${file ? "bg-[#3d5a80]/5" : ""}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-[#3d5a80]" />
                <div className="text-left">
                  <p className="font-medium text-[#3d5a80]">{file.name}</p>
                  <p className="text-sm text-[#3d5a80]/60">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button variant="ghost" size="icon" onClick={resetState} className="ml-2">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto mb-4 text-[#3d5a80]/40" />
                <p className="text-[#3d5a80] mb-2">CSV 파일을 드래그하거나 클릭하여 선택하세요</p>
                <p className="text-sm text-[#3d5a80]/60 mb-4">지원 형식: .csv (UTF-8 인코딩 권장)</p>
                <label>
                  <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                  <Button variant="outline" asChild className="cursor-pointer bg-transparent">
                    <span>파일 선택</span>
                  </Button>
                </label>
              </>
            )}
          </div>

          {/* 파싱 결과 */}
          {parseResult && (
            <div className="space-y-3">
              {parseResult.success ? (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    <strong>{parseResult.textbooks.length}개</strong> 교재, 총{" "}
                    <strong>{parseResult.totalProblems}개</strong> 문제가 감지되었습니다.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    {parseResult.errors.map((error, i) => (
                      <p key={i}>{error}</p>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              {/* 교재 목록 미리보기 */}
              {parseResult.success && parseResult.textbooks.length > 0 && (
                <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto">
                  <p className="text-sm font-medium text-[#3d5a80] mb-2">교재 목록:</p>
                  <ul className="space-y-1">
                    {parseResult.textbooks.map((tb, i) => (
                      <li key={i} className="text-sm text-[#3d5a80]/80 flex justify-between">
                        <span>{tb.title}</span>
                        <span className="text-[#3d5a80]/60">
                          {tb.subUnits?.length || 0}개 소단원, {tb.totalProblems}문제
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 업로드 진행률 */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-center text-[#3d5a80]/60">{uploadProgress < 100 ? "업로드 중..." : "완료!"}</p>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!parseResult?.success || isUploading}
              className="bg-[#3d5a80] hover:bg-[#3d5a80]/90"
            >
              {isUploading ? "업로드 중..." : "등록하기"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
