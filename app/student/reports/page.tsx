"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Loader2 } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { getReportsByStudent } from "@/lib/firestore/reports"
import { Report } from "@/lib/firestore/types"
import { ReportViewModal } from "@/components/reports/report-view-modal"
import { format } from "date-fns"
import { getAuthFromStorage } from "@/lib/auth"

export default function StudentReportsPage() {
    const router = useRouter()
    const [reports, setReports] = useState<Report[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [viewingReport, setViewingReport] = useState<Report | null>(null)

    useEffect(() => {
        const auth = getAuthFromStorage()

        if (!auth) {
            router.push("/login")
            return
        }

        const fetchReports = async () => {
            try {
                // Only fetch if studentId is available (Director/Admin might not have it in this context, but this is student page)
                // For Directors testing 'Student Mode', we might need to handle it, but for now strict check.
                if (auth.studentId) {
                    const data = await getReportsByStudent(auth.studentId)
                    // Only show SENT reports to students
                    const sentReports = data.filter(r => r.status === 'sent')
                    setReports(sentReports)
                }
            } catch (error) {
                console.error("Failed to fetch reports:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchReports()
    }, [router])

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <BackButton />
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 font-serif">내 리포트</h1>
                    <p className="text-gray-500 text-lg">발행된 학습 리포트를 확인하세요.</p>
                </div>

                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl text-gray-900">리포트 목록</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" /></div>
                        ) : reports.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500">아직 발행된 리포트가 없습니다.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-100 hover:bg-gray-100 border-none">
                                        <TableHead className="text-gray-700 font-semibold">종류</TableHead>
                                        <TableHead className="text-gray-700 font-semibold">기간/대상</TableHead>
                                        <TableHead className="text-gray-700 font-semibold">발행일</TableHead>
                                        <TableHead className="text-gray-700 font-semibold text-right">작업</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reports.map((report) => (
                                        <TableRow key={report.id} className="hover:bg-gray-50 border-gray-100">
                                            <TableCell>
                                                {report.type === 'monthly' ? (
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">월간 리포트</span>
                                                ) : (
                                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">완북 인증서</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-gray-900">{report.date}</TableCell>
                                            <TableCell className="text-gray-500">
                                                {report.sentAt ? format(report.sentAt, 'yyyy-MM-dd') : format(report.createdAt, 'yyyy-MM-dd')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900" onClick={() => setViewingReport(report)}>
                                                    <FileText className="w-4 h-4 mr-1" />
                                                    상세보기
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
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
