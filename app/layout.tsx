import type React from "react"
import type { Metadata } from "next"

import { Inter, Merriweather } from "next/font/google"
import "./globals.css"
import { Navigation } from "@/components/navigation"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-merriweather",
  display: "swap",
})

export const metadata: Metadata = {
  title: "탑브레인 문해력PT - 프리미엄 문해력 코칭 시스템",
  description: "온라인 수강시설화된 프리미엄 문해력 학습 플랫폼",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} ${merriweather.variable} font-sans antialiased min-h-screen bg-background text-foreground flex flex-col`}>
        <Navigation />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  )
}
