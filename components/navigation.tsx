"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BookOpen, LogOut } from "lucide-react"
import { signOut, getAuthFromStorage } from "@/lib/auth"
import { useEffect, useState } from "react"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState("")

  useEffect(() => {
    const auth = getAuthFromStorage()
    if (auth) {
      setUserName(auth.displayName)
      setUserRole(auth.role)
    }
  }, [pathname])

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const auth = getAuthFromStorage()

    if (!auth) {
      router.push("/")
      return
    }

    // Route based on user role
    switch (auth.role) {
      case "관리자":
        router.push("/admin")
        break
      case "원장":
        router.push("/director")
        break
      case "학생":
        router.push("/student")
        break
      default:
        router.push("/")
    }
  }

  // Don't show navigation on login page, home page, or learning/result pages
  if (
    pathname === "/login" ||
    pathname === "/" ||
    pathname.startsWith("/student/learn/") ||
    pathname.startsWith("/student/results/")
  ) {
    return null
  }

  // Clean Navigation Design
  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-100 text-gray-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <button onClick={handleLogoClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-100 to-purple-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
            <div>
              <span className="font-bold font-serif text-sm sm:text-base md:text-lg text-gray-900">탑브레인 문해력PT</span>
              {userName && (
                <p className="text-xs text-gray-500 hidden sm:block">
                  {userName}님 ({userRole})
                </p>
              )}
            </div>
          </button>

          {/* Logout Button */}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-gray-600 hover:bg-gray-100 text-xs sm:text-sm px-2 sm:px-4"
          >
            <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            로그아웃
          </Button>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
