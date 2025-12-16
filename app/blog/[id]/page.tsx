"use client"

import { useEffect, useState } from "react"
import { getBlogPostById } from "@/lib/firestore/blog"
import { BlogPost } from "@/lib/firestore/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, ArrowLeft, Share2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

// Simple Markdown Parser Component
const SimpleMarkdown = ({ content }: { content: string }) => {
    if (!content) return null;

    const lines = content.split('\n');

    return (
        <div className="space-y-4 text-lg leading-relaxed text-slate-700 dark:text-slate-300">
            {lines.map((line, index) => {
                // Headers
                if (line.startsWith('### ')) {
                    return <h3 key={index} className="text-2xl font-bold mt-8 mb-4 text-slate-900 dark:text-slate-100">{line.replace('### ', '')}</h3>;
                }
                if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-3xl font-bold mt-10 mb-6 text-slate-900 dark:text-slate-100 border-b pb-2">{line.replace('## ', '')}</h2>;
                }
                if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-4xl font-extrabold mt-12 mb-8 text-slate-900 dark:text-slate-100">{line.replace('# ', '')}</h1>;
                }

                // List items
                if (line.trim().startsWith('- ')) {
                    return (
                        <div key={index} className="flex gap-2 ml-4">
                            <span className="text-primary mt-1.5">•</span>
                            <span>{renderInline(line.replace('- ', ''))}</span>
                        </div>
                    );
                }
                if (line.trim().match(/^\d+\. /)) {
                    return (
                        <div key={index} className="flex gap-2 ml-4">
                            <span className="text-primary font-bold mt-0">{line.match(/^\d+\./)?.[0]}</span>
                            <span>{renderInline(line.replace(/^\d+\. /, ''))}</span>
                        </div>
                    );
                }

                // Quote
                if (line.startsWith('> ')) {
                    return (
                        <blockquote key={index} className="border-l-4 border-primary pl-4 py-2 italic bg-slate-50 dark:bg-slate-900 rounded-r my-4">
                            {renderInline(line.replace('> ', ''))}
                        </blockquote>
                    );
                }

                // Empty line
                if (line.trim() === '') {
                    return <div key={index} className="h-2"></div>;
                }

                // Regular paragraph
                return <p key={index} className="mb-2">{renderInline(line)}</p>;
            })}
        </div>
    );
};

// Helper for inline bold/italic
const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};


export default function BlogPostPage({ params }: { params: { id: string } }) {
    const [post, setPost] = useState<BlogPost | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const data = await getBlogPostById(params.id)
                if (data) {
                    setPost(data)
                } else {
                    setError(true)
                }
            } catch (e) {
                console.error(e)
                setError(true)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [params.id])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        )
    }

    if (error || !post) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold mb-4">게시글을 찾을 수 없습니다.</h2>
                <Link href="/blog">
                    <Button>목록으로 돌아가기</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 pb-20">
            {/* Header Image with Overlay */}
            <div className="relative h-[400px] w-full bg-slate-900">
                <img
                    src={post.thumbnailUrl}
                    alt={post.title}
                    className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 container mx-auto">
                    <div className="max-w-4xl mx-auto space-y-4">
                        <Link href="/blog" className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" /> 목록으로
                        </Link>
                        <div className="flex gap-2 mb-4">
                            {post.keywords.map(k => (
                                <Badge key={k} className="bg-primary hover:bg-primary/90 text-white border-0">#{k}</Badge>
                            ))}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight shadow-sm">
                            {post.title}
                        </h1>
                        <div className="flex items-center gap-4 text-white/80 text-sm md:text-base mt-4">
                            <span className="flex items-center gap-2">
                                <User className="h-4 w-4" /> {post.author}
                            </span>
                            <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> {post.createdAt?.toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 mt-12">
                <article className="max-w-3xl mx-auto bg-white dark:bg-slate-950 p-2 md:p-0">
                    <SimpleMarkdown content={post.content} />

                    <div className="mt-12 pt-8 border-t flex justify-between items-center">
                        <Link href="/blog">
                            <Button variant="outline">다른 글 보기</Button>
                        </Link>
                        <Button variant="ghost" className="gap-2" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                            <Share2 className="h-4 w-4" /> 공유하기
                        </Button>
                    </div>
                </article>
            </div>
        </div>
    )
}
