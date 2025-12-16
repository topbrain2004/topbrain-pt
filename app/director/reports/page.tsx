"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Plus, Loader2, Calendar, Trash2 } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { getReportsByAcademy, createReport, generateMonthlyStats, deleteReport } from "@/lib/firestore/reports" // Updated import




import { getStudentsByAcademyId, Student } from "@/lib/firestore/students"
import { Report } from "@/lib/firestore/types"
import { format } from "date-fns"
import { ReportViewModal } from "@/components/reports/report-view-modal"

export default function DirectorReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [viewingReport, setViewingReport] = useState<Report | null>(null)

  // New Report State
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM")) // YYYY-MM
  const [academyId, setAcademyId] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { getAuthFromStorage } = await import("@/lib/auth")
      const authData = getAuthFromStorage()

      if (!authData) {
        router.push("/login")
        return
      }

      if (authData.role !== "원장" || !authData.academyId) {
        router.push("/login")
        return
      }

      setAcademyId(authData.academyId)
      fetchData(authData.academyId)
    }

    checkAuthAndLoad()
  }, [router])

  const fetchData = async (aid: string) => {
    try {
      setIsLoading(true)
      const [fetchedReports, fetchedStudents] = await Promise.all([
        getReportsByAcademy(aid),
        getStudentsByAcademyId(aid)
      ])
      setReports(fetchedReports)
      setStudents(fetchedStudents)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!selectedStudentId || !selectedMonth || !academyId) return

    try {
      setIsGenerating(true)
      const student = students.find(s => s.id === selectedStudentId)
      if (!student) throw new Error("Student not found")

      const [year, month] = selectedMonth.split("-").map(Number)
      // generateMonthlyStats expects 0-indexed month
      const stats = await generateMonthlyStats(selectedStudentId, year, month - 1)

      const reportData: any = {
        studentId: student.id,
        studentName: student.name,
        academyId: academyId,
        date: selectedMonth,
        type: "monthly",
        status: "draft",
        content: {
          ...stats
        },
        // TODO: Call AI for comment draft here
        teacherComment: "",
      }

      await createReport(reportData)
      setIsOpen(false)
      fetchData(academyId) // Refresh list
    } catch (error) {
      console.error("Failed to generate report:", error)
      alert("리포트 생성 중 오류가 발생했습니다.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendReport = async (reportId: string) => {
    if (!confirm("리포트를 발송하시겠습니까? 학생이 바로 확인할 수 있게 됩니다.")) return

    try {
      const { updateReport } = await import("@/lib/firestore/reports")
      await updateReport(reportId, { status: "sent", sentAt: new Date() })
      fetchData(academyId!)
      alert("리포트가 발송되었습니다.")
    } catch (error) {
      console.error("Failed to send report:", error)
      alert("발송 중 오류가 발생했습니다.")
    }
  }

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null)

  const handleDeleteClick = (report: Report) => {
    console.log("Delete clicked for:", report.id)
    setReportToDelete(report)
    setIsDeleteDialogOpen(true)
  }

  const executeDeleteReport = async () => {
    if (!reportToDelete) return

    try {
      console.log("Executing delete for:", reportToDelete.id)
      await deleteReport(reportToDelete.id)
      alert("리포트가 삭제되었습니다.")
      setIsDeleteDialogOpen(false)
      setReportToDelete(null)
      if (academyId) {
        fetchData(academyId)
      }
    } catch (error) {
      console.error("Failed to delete report:", error)
      const message = error instanceof Error ? error.message : "알 수 없는 오류"
      alert(`삭제 중 오류가 발생했습니다: ${message}`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BackButton />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 font-serif">리포트 관리</h1>
            <p className="text-gray-500 text-lg">학습 리포트를 생성하고 관리합니다.</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="text-white gap-2">
                <Plus className="w-4 h-4" /> 리포트 생성
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>월간 리포트 생성</DialogTitle>
                <DialogDescription>
                  리포트를 생성할 학생과 기간을 선택해주세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">학생 선택</label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="학생을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.grade})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">기간 선택 (월)</label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                      type="month"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-8"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>취소</Button>
                <Button onClick={handleGenerateReport} disabled={isGenerating || !selectedStudentId}>
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  생성하기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">리포트 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" /></div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">생성된 리포트가 없습니다.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>학생명</TableHead>
                    <TableHead>종류</TableHead>
                    <TableHead>기간/대상</TableHead>
                    <TableHead>생성일</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.studentName}</TableCell>
                      <TableCell>
                        {report.type === 'monthly' ? (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">월간</span>
                        ) : (
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">완북</span>
                        )}
                      </TableCell>
                      <TableCell>{report.date}</TableCell>
                      <TableCell>{report.createdAt ? format(report.createdAt, 'yyyy-MM-dd') : '-'}</TableCell>
                      <TableCell>
                        {report.status === 'sent' ? (
                          <span className="text-green-600 font-bold text-sm">발송됨</span>
                        ) : (
                          <span className="text-gray-500 text-sm">작성중</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setViewingReport(report)}>
                            보기
                          </Button>
                          {report.status !== 'sent' && (
                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleSendReport(report.id)}>
                              발송
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteClick(report)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Detail Modal */}
      <ReportViewModal
        report={viewingReport}
        isOpen={!!viewingReport}
        onClose={() => setViewingReport(null)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리포트 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 리포트를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={executeDeleteReport}>삭제하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
