"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Report } from "@/lib/firestore/types"
import { format } from "date-fns"
import { CheckCircle, XCircle } from "lucide-react"

interface ReportViewModalProps {
    report: Report | null
    isOpen: boolean
    onClose: () => void
}

export function ReportViewModal({ report, isOpen, onClose }: ReportViewModalProps) {
    if (!report) return null

    const { content } = report

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        {report.type === 'monthly' ? "📅 월간 학습 리포트" : "🎉 완북 인증서"}
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                            ({report.date})
                        </span>
                    </DialogTitle>
                    <DialogDescription className="flex justify-between items-center mt-2">
                        <span>학생: <span className="font-semibold text-primary">{report.studentName}</span></span>
                        <span className="text-xs text-slate-400">
                            생성일: {report.createdAt ? format(new Date(report.createdAt), "yyyy-MM-dd HH:mm") : "-"}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* 1. Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl text-center border shadow-sm">
                            <div className="text-sm text-slate-500 mb-1">총 학습 문항</div>
                            <div className="text-3xl font-bold text-slate-900">{content.totalProblems}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl text-center border shadow-sm">
                            <div className="text-sm text-slate-500 mb-1">정답 문항</div>
                            <div className="text-3xl font-bold text-green-600">{content.correctAnswers}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl text-center border shadow-sm">
                            <div className="text-sm text-slate-500 mb-1">평균 점수</div>
                            <div className="text-3xl font-bold text-blue-600">{content.averageScore}점</div>
                        </div>
                        {content.attendanceDays !== undefined && (
                            <div className="bg-slate-50 p-4 rounded-xl text-center border shadow-sm">
                                <div className="text-sm text-slate-500 mb-1">출석일</div>
                                <div className="text-3xl font-bold text-purple-600">{content.attendanceDays}일</div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 2. Domain Analysis */}
                        {(() => {
                            const validDomains = content.domainScores
                                ? Object.entries(content.domainScores).filter(([_, score]: [string, any]) => score.total > 0)
                                : []

                            if (validDomains.length === 0) return null

                            return (
                                <div className="border rounded-xl p-6 shadow-sm bg-white">
                                    <h3 className="font-bold mb-4 text-lg text-slate-800 flex items-center gap-2">
                                        📊 영역별 성취도
                                    </h3>
                                    <div className="space-y-4">
                                        {validDomains.map(([domain, score]: [string, any]) => (
                                            <div key={domain} className="space-y-1">
                                                <div className="flex justify-between text-sm font-medium">
                                                    <span className="text-slate-600">{domain}</span>
                                                    <span className="text-slate-900">{score.score}%</span>
                                                </div>
                                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${score.score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}

                        {/* 3. Weekly Learning Trend (Simple Bar Chart) */}
                        {content.weeklyTrend && (
                            <div className="border rounded-xl p-6 shadow-sm bg-white flex flex-col">
                                <h3 className="font-bold mb-4 text-lg text-slate-800 flex items-center gap-2">
                                    📈 주차별 학습량
                                </h3>
                                <div className="flex items-end justify-between flex-1 gap-2 h-40 pt-4">
                                    {content.weeklyTrend.map((week: any) => {
                                        const max = Math.max(...content.weeklyTrend!.map((w: any) => w.count)) || 1
                                        const height = (week.count / max) * 100
                                        return (
                                            <div key={week.label} className="flex flex-col items-center flex-1">
                                                <div className="w-full bg-indigo-50 rounded-t-md relative group flex items-end justify-center" style={{ height: '100%' }}>
                                                    <div
                                                        className="w-4/5 bg-indigo-500 rounded-t-md transition-all duration-500 group-hover:bg-indigo-600"
                                                        style={{ height: `${height}%` }}
                                                    />
                                                    <div className="absolute -top-8 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {week.count}문제
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-2 font-medium">{week.label}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4. Textbook Performance Table */}
                    {content.textbookStats && (
                        <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                            <div className="bg-slate-50 px-6 py-4 border-b">
                                <h3 className="font-bold text-lg text-slate-800">📚 교재별 학습 현황</h3>
                            </div>
                            <div className="p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                        <tr>
                                            <th className="px-6 py-3">교재명</th>
                                            <th className="px-6 py-3 text-center">총 문항</th>
                                            <th className="px-6 py-3 text-center">정답</th>
                                            <th className="px-6 py-3 text-right">정답률</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {Object.entries(content.textbookStats).map(([name, stat]: [string, any]) => (
                                            <tr key={name} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 font-medium text-slate-700">{name}</td>
                                                <td className="px-6 py-3 text-center text-slate-600">{stat.total}</td>
                                                <td className="px-6 py-3 text-center text-green-600">{stat.correct}</td>
                                                <td className="px-6 py-3 text-right font-bold text-slate-900">{stat.score}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 5. Teacher Comment */}
                    {report.teacherComment && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 shadow-sm">
                            <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                                👩‍🏫 선생님 코멘트
                            </h3>
                            <div className="bg-white/50 p-4 rounded-lg border border-yellow-100">
                                <p className="text-yellow-800 whitespace-pre-wrap leading-relaxed">{report.teacherComment}</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={onClose}>닫기</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
