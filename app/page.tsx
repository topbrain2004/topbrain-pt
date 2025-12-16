import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserCheck, FileText, MessageSquare, CheckCircle } from 'lucide-react'

export default function HomePage() {
    return (
        <div className="min-h-screen bg-background">
            <section className="relative overflow-hidden py-12 md:py-20 px-4">
                <div className="max-w-6xl mx-auto text-center relative z-10">
                    <div className="mb-4 md:mb-6">
                        <span className="inline-block bg-orange-100 text-orange-800 px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold">
                            ✨ 프리미엄 문해력 온라인 코칭 시스템
                        </span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 text-balance leading-tight font-serif text-gray-900">
                        탑브레인 문해력PT
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-6 md:mb-8 max-w-2xl mx-auto text-pretty font-medium px-4 font-sans">
                        초중고 국어 문해력 훈련을 위한<br className="hidden md:block" /> 스마트한 학습 루틴 만들기
                    </p>

                    <div className="mt-8 md:mt-12 flex justify-center">
                        <Button
                            asChild
                            size="lg"
                            variant="gradient"
                            className="w-full max-w-xs shadow-xl hover:shadow-2xl transition-all text-lg md:text-xl h-14 md:h-16 font-bold rounded-2xl"
                        >
                            <Link href="/login">시작하기</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="py-12 md:py-20 px-4 bg-white/50">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 font-serif mb-4">
                            읽고 이해하는 힘, 여기서 완성됩니다.
                        </h2>
                        <p className="text-gray-500">체계적인 커리큘럼으로 문해력 근육을 키워보세요.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <div className="bg-white rounded-2xl p-6 shadow-lg border-none hover:-translate-y-1 transition-transform duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                                    <UserCheck className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">1:1 맞춤 훈련</h3>
                                    <p className="text-sm text-gray-500">개인별 수준에 맞는 지문 제공</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border-none hover:-translate-y-1 transition-transform duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                                    <FileText className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">메타인지 리포트</h3>
                                    <p className="text-sm text-gray-500">학습 현황을 한눈에 파악</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border-none hover:-translate-y-1 transition-transform duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center shrink-0">
                                    <MessageSquare className="w-6 h-6 text-pink-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">오답분석 피드백</h3>
                                    <p className="text-sm text-gray-500">틀린 이유를 완벽하게 분석</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border-none hover:-translate-y-1 transition-transform duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                    <CheckCircle className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">자동채점 시스템</h3>
                                    <p className="text-sm text-gray-500">빠르고 정확한 실시간 채점</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </section >

            <section className="py-12 md:py-20 px-4">
                <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-2xl md:text-3xl font-bold mb-4 font-serif">문해력 향상을 위한 오늘의 읽을거리</h2>
                        <p className="text-gray-300 mb-8 max-w-lg mx-auto">
                            탑브레인 AI가 엄선한 독서법과 학습 전략을 블로그에서 만나보세요.
                        </p>
                        <Button asChild size="lg" variant="secondary" className="font-bold">
                            <Link href="/blog">블로그 구경하기</Link>
                        </Button>
                    </div>
                    {/* Abstract overlapping circles for design */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                </div>
            </section>

            <footer className="bg-gray-900 text-white py-8 px-4">
                <div className="max-w-6xl mx-auto text-center">
                    <h3 className="text-xl font-bold mb-2 font-serif">탑브레인 문해력PT</h3>
                    <p className="text-gray-400 text-sm mb-4">프리미엄 문해력 코칭 시스템</p>
                    <p className="text-gray-600 text-xs">Copyright © 2025 탑브레인. All rights reserved.</p>
                </div>
            </footer>
        </div >
    )
}
