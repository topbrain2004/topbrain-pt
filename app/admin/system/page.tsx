"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Database, Trash2, RefreshCw, PlayCircle, ShieldAlert, UserCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SystemPage() {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleAction = async (action: 'reset' | 'seed' | 'cleanup' | 'restore') => {
        if (!confirm("정말 실행하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return

        setLoading(action)
        setMessage(null)

        try {
            const res = await fetch('/api/debug/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || "Failed")

            setMessage({ type: 'success', text: data.message })
            router.refresh()
        } catch (e) {
            setMessage({ type: 'error', text: String(e) })
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8 flex items-center gap-3">
                    <Button variant="outline" onClick={() => router.back()}>← 뒤로가기</Button>
                    <h1 className="text-3xl font-bold text-[#3d5a80]">시스템 관리 (Developer Tools)</h1>
                </div>

                {message && (
                    <Alert className={`mb-6 ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        {message.type === 'success' ? <PlayCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <AlertTitle>{message.type === 'success' ? "완료" : "오류"}</AlertTitle>
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-6">
                    <Card className="border-red-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-700">
                                <Trash2 className="w-5 h-5" />
                                데이터 초기화
                            </CardTitle>
                            <CardDescription>
                                모든 학생의 학습 이력과 계정을 삭제합니다. <br />
                                <strong>단, '윤온유' 학생 계정은 삭제되지 않고 학습 이력만 0으로 초기화됩니다.</strong>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => handleAction('reset')}
                                disabled={!!loading}
                                variant="destructive"
                                className="w-full bg-red-600 hover:bg-red-700"
                            >
                                {loading === 'reset' ? "초기화 중..." : "전체 데이터 초기화 실행"}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-700">
                                <Database className="w-5 h-5" />
                                테스트 데이터 생성 (윤온유)
                            </CardTitle>
                            <CardDescription>
                                '윤온유' 학생에게 <strong>최근 2일치 가짜 학습 기록</strong>을 생성합니다. <br />
                                그래프 및 통계 화면 테스트용입니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => handleAction('seed')}
                                disabled={!!loading}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                {loading === 'seed' ? "생성 중..." : "테스트 데이터 주입하기"}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-yellow-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-700">
                                <ShieldAlert className="w-5 h-5" />
                                고아 데이터 정리 (Fix Sync)
                            </CardTitle>
                            <CardDescription>
                                계정은 삭제되었으나 프로필이 남아있는 '유령 학생'을 찾아 삭제합니다. <br />
                                관리자 목록의 인원 수가 맞지 않을 때 사용하세요.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => handleAction('cleanup')}
                                disabled={!!loading}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                            >
                                {loading === 'cleanup' ? "정리 중..." : "데이터 무결성 검사 및 복구"}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-green-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-700">
                                <UserCheck className="w-5 h-5" />
                                윤온유 계정 복구 (Emergency Restore)
                            </CardTitle>
                            <CardDescription>
                                '윤온유' 테스트 계정이 실수로 삭제되어 로그인이 안 될 때 복구합니다. <br />
                                <strong>ID: 윤온유</strong> (비밀번호: 기존 동일)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => handleAction('restore')}
                                disabled={!!loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                                {loading === 'restore' ? "복구 중..." : "계정 복구 실행"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
