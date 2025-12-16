"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAllReports } from "@/lib/firestore/reports"
import { getAuthFromStorage } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Send, Download, FileText } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { ReportViewModal } from "@/components/reports/report-view-modal"

interface Report {
  id: string
  studentName: string
  date: string
  type: string
  status: "sent" | "pending"
}

export default function ReportsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingReport, setViewingReport] = useState<any | null>(null) // Using any for now to avoid extensive type sync in this fix iteration

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const auth = getAuthFromStorage()
        if (!auth) {
          router.push("/login")
          return
        }

        const data = await getAllReports()
        // Map Firestore data to UI interface
        const mappedReports: Report[] = data.map((r: any) => ({
          id: r.id,
          studentName: r.studentName || "Unknown",
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-",
          type: r.title || "학습 리포트",
          status: (r.status as "sent" | "pending") || "pending" // Use actual status or default to pending
        }))
        setReports(mappedReports)
      } catch (error) {
        console.error("Failed to fetch reports:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [router])

  const filteredReports = reports.filter((report) =>
    report.studentName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleSendReport = (reportId: string) => {
    alert(`리포트 ${reportId}가 카카오톡으로 발송되었습니다!`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#3d5a80] mb-2">리포트 관리</h1>
          <p className="text-[#3d5a80]/70 text-lg">학습 리포트를 조회하고 발송합니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#3d5a80]">리포트 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3d5a80]/40" />
                <Input
                  placeholder="학생 이름으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#3d5a80]/30"
                />
              </div>
            </div>

            {/* Reports Table */}
            <div className="rounded-lg border border-[#3d5a80]/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#3d5a80] hover:bg-[#3d5a80]">
                    <TableHead className="text-white">학생 이름</TableHead>
                    <TableHead className="text-white">날짜</TableHead>
                    <TableHead className="text-white">리포트 유형</TableHead>
                    <TableHead className="text-white">상태</TableHead>
                    <TableHead className="text-white text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-[#cfe8e9]/20">
                      <TableCell className="font-semibold text-[#3d5a80]">{report.studentName}</TableCell>
                      <TableCell className="text-[#3d5a80]/70">{report.date}</TableCell>
                      <TableCell className="text-[#3d5a80]/70">{report.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            report.status === "sent" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {report.status === "sent" ? "발송 완료" : "발송 대기"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#3d5a80] hover:bg-[#3d5a80] hover:text-white"
                            onClick={() => setViewingReport(report as any)} // Cast needed because of type mismatch in Admin page vs DB Schema
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            보기
                          </Button>
                          {report.status === "pending" && (
                            <Button
                              onClick={() => handleSendReport(report.id)}
                              size="sm"
                              className="bg-[#ffc107] hover:bg-[#ffd54f] text-[#3d5a80]"
                            >
                              <Send className="w-4 h-4 mr-1" />
                              발송
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#3d5a80] hover:bg-[#3d5a80] hover:text-white"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ReportViewModal
        report={viewingReport}
        isOpen={!!viewingReport}
        onClose={() => setViewingReport(null)}
      />
    </div>
  )
}
