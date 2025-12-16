"use client"

import { useEffect, useState } from "react"
import { getPublishedBlogPosts } from "@/lib/firestore/blog"
import { BlogPost } from "@/lib/firestore/types"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, ArrowRight } from "lucide-react" // Assuming lucide-react is available
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function BlogListPage() {
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const data = await getPublishedBlogPosts()
                setPosts(data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) {
        return (
            <div className="container mx-auto py-20 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-muted-foreground">최신 아티클을 불러오는 중입니다...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
            {/* Hero Section */}
            <div className="bg-primary text-primary-foreground py-20 px-4">
                <div className="container mx-auto text-center space-y-4">
                    <Badge variant="secondary" className="mb-4">TopBrain Literacy PT</Badge>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">문해력 인사이트 블로그</h1>
                    <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
                        국어 학습, 독서 습관, 그리고 입시 전략까지.<br />
                        Gemini AI가 분석하고 제안하는 깊이 있는 콘텐츠를 만나보세요.
                    </p>
                </div>
            </div>

            {/* Blog List */}
            <div className="container mx-auto py-12 px-4">
                {posts.length === 0 ? (
                    <div className="text-center py-20 border rounded-lg bg-card bg-white dark:bg-slate-900 shadow-sm">
                        <p className="text-xl text-muted-foreground">등록된 게시글이 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map((post) => (
                            <Link href={`/blog/${post.doc_id}`} key={post.doc_id} className="group">
                                <Card className="h-full overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-slate-900">
                                    <div className="aspect-video relative overflow-hidden bg-slate-200">
                                        <img
                                            src={post.thumbnailUrl}
                                            alt={post.title}
                                            className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <CardHeader className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {post.createdAt?.toLocaleDateString()}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {post.author}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                            {post.title}
                                        </h3>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground line-clamp-3 text-sm">
                                            {post.content.replace(/[#*`]/g, '').slice(0, 150)}...
                                        </p>
                                    </CardContent>
                                    <CardFooter className="pt-0">
                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {post.keywords.slice(0, 3).map(k => (
                                                <Badge key={k} variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                    #{k}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
