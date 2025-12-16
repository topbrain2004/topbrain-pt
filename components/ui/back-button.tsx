"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface BackButtonProps {
    className?: string
    label?: string
    href?: string
}

export function BackButton({ className, label = "뒤로 가기", href }: BackButtonProps) {
    const router = useRouter()

    const handleBack = () => {
        if (href) {
            router.push(href)
        } else {
            router.back()
        }
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className={cn("gap-2 text-muted-foreground hover:text-foreground mb-4", className)}
        >
            <ArrowLeft className="w-4 h-4" />
            {label}
        </Button>
    )
}
