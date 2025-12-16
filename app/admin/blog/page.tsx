"use client"

import { useState, useEffect } from "react"
// import { useAuth } from "@/lib/hooks/use-auth" // Assuming this exists or I'll use direct auth
import { generateBlogContentAction } from "@/app/actions/blog-generation"
import { createBlogPost, getAllBlogPosts, deleteBlogPost } from "@/lib/firestore/blog"
import { getStorageInstance } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2, ExternalLink, RefreshCw } from "lucide-react"

export default function AdminBlogPage() {
    // Access control (simple check)
    // const { user, role } = useAuth() 
    // In a real app check role === 'admin'

    const [topic, setTopic] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [status, setStatus] = useState("")
    const [logs, setLogs] = useState<string[]>([])
    const [posts, setPosts] = useState<any[]>([])

    const router = useRouter()

    useEffect(() => {
        loadPosts()
    }, [])

    const loadPosts = async () => {
        try {
            const data = await getAllBlogPosts()
            setPosts(data)
        } catch (error) {
            console.error("Failed to load posts", error)
        }
    }

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
        setStatus(msg)
    }

    const handleGenerate = async () => {
        if (!topic.trim()) return

        setIsGenerating(true)
        setLogs([])
        addLog("자동화 프로세스 시작...")

        try {
            // 1. Text Generation
            addLog("Step 1/3: Gemini가 글을 작성중입니다...")
            const { title, content, imagePrompt } = await generateBlogContentAction(topic)
            addLog(`글 작성 완료: ${title}`)

            // 2. Image Generation & Upload
            addLog("Step 2/3: 이미지를 생성하고 있습니다...")
            // Using Pollinations for functional AI image generation without API key
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=800&height=600`

            addLog("이미지 생성 완료. Storage에 업로드 중...")
            const imageRes = await fetch(imageUrl)
            const imageBlob = await imageRes.blob()

            const storage = getStorageInstance()
            if (!storage) throw new Error("Firebase Storage가 초기화되지 않았습니다.")

            const storageRef = ref(storage, `blog/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`)
            await uploadBytes(storageRef, imageBlob)
            const downloadUrl = await getDownloadURL(storageRef)
            addLog("Storage 업로드 완료.")

            // 3. Firestore Save
            addLog("Step 3/3: DB에 저장 중...")
            await createBlogPost({
                title,
                content,
                thumbnailUrl: downloadUrl,
                keywords: [topic, "AI", "문해력"],
            }) // author, isPublished, createdAt handled by server function

            addLog("모든 작업 완료!")
            setTopic("")
            loadPosts() // Refresh list

        } catch (error: any) {
            console.error(error)
            addLog(`오류 발생: ${error.message}`)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("정말 삭제하시겠습니까?")) return
        try {
            await deleteBlogPost(id)
            loadPosts()
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">블로그 자동화 관리</h1>
                    <p className="text-muted-foreground">Gemini를 이용해 문해력 관련 콘텐츠를 자동으로 생성하고 배포합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 생성 패널 */}
                <Card className="border-2 border-primary/20">
                    <CardHeader>
                        <CardTitle>AI 원클릭 포스팅</CardTitle>
                        <CardDescription>
                            Gemini가 '8가지 작성 기준'에 맞춰 글과 그림을 생성하고 즉시 발행합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">주제 키워드</label>
                            <Input
                                placeholder="예: 수능 비문학 공부법, 초등 독서 습관"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                disabled={isGenerating}
                            />
                        </div>

                        <div className="bg-slate-950 text-slate-50 p-4 rounded-md h-[200px] overflow-y-auto text-xs font-mono">
                            {logs.length === 0 ? (
                                <span className="text-slate-500">대기 중...</span>
                            ) : (
                                logs.map((log, i) => <div key={i}>{log}</div>)
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isGenerating || !topic.trim()}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {status}
                                </>
                            ) : (
                                "AI 자동 생성 및 게시 시작"
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {/* 최근 게시글 목록 */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>최근 게시글 ({posts.length})</CardTitle>
                            <CardDescription>발행된 글 목록입니다.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={loadPosts}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto">
                            {posts.map((post) => (
                                <div
                                    key={post.doc_id}
                                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => window.open(`/blog/${post.doc_id}`, '_blank')}
                                >
                                    <img
                                        src={post.thumbnailUrl}
                                        alt={post.title}
                                        className="w-20 h-20 object-cover rounded-md bg-slate-200"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold truncate">{post.title}</h4>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {post.content.slice(0, 100)}...
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="secondary" className="text-[10px]">
                                                {post.createdAt?.toLocaleDateString()}
                                            </Badge>
                                            {post.keywords?.map((k: string) => (
                                                <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700 h-8 w-8"
                                        onClick={(e) => handleDelete(post.doc_id, e)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {posts.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground">
                                    게시글이 없습니다.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
