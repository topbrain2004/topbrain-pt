"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Mail, LogOut } from "lucide-react"
import { getAuthInstance } from "@/lib/firebase"
import { signOut } from "@firebase/auth"
import { getUserById } from "@/lib/firestore/users"

export default function PendingPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)

    if (typeof window !== "undefined") {
      const authData = localStorage.getItem("auth")
      if (authData) {
        const parsed = JSON.parse(authData)
        setUserEmail(parsed.email || "")
        setUserName(parsed.displayName || "")
      }
    }
  }, [])

  const handleCheckStatus = async () => {
    setIsChecking(true)
    try {
      const authData = localStorage.getItem("auth")
      if (!authData) {
        router.push("/login")
        return
      }

      const parsed = JSON.parse(authData)
      const user = await getUserById(parsed.uid)

      if (!user) {
        alert("사용자 정보를 찾을 수 없습니다.")
        return
      }

      if (user.status === "approved") {
        localStorage.setItem(
          "auth",
          JSON.stringify({
            ...parsed,
            role: user.role,
            status: "approved",
          }),
        )

        if (user.role === "학생") {
          router.push("/student")
        } else {
          router.push("/admin")
        }
      } else if (user.status === "rejected") {
        alert("계정 승인이 거부되었습니다. 관리자에게 문의하세요.")
      } else {
        alert("아직 승인 대기 중입니다. 잠시 후 다시 확인해주세요.")
      }
    } catch (error) {
      console.error("Status check error:", error)
      alert("상태 확인 중 오류가 발생했습니다.")
    } finally {
      setIsChecking(false)
    }
  }

  const handleLogout = async () => {
    try {
      const auth = getAuthInstance()
      if (auth) {
        await signOut(auth)
      }
      localStorage.removeItem("auth")
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-none">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-orange-500" />
            </div>
            <div className="h-8 bg-gray-100 rounded w-32 mx-auto animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-24 bg-gray-100 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-orange-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 font-serif">승인 대기 중</CardTitle>
          <CardDescription className="text-base">관리자의 승인을 기다리고 있습니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-900">
              <Mail className="w-4 h-4" />
              <span className="font-semibold">계정 정보</span>
            </div>
            <p className="text-sm text-gray-600">이름: {userName}</p>
            <p className="text-sm text-gray-600">이메일: {userEmail}</p>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <p>관리자가 귀하의 계정을 검토하고 있습니다.</p>
            <p>승인이 완료되면 서비스를 이용하실 수 있습니다.</p>
            <p className="text-orange-600 font-semibold">일반적으로 1-2일 이내에 승인이 완료됩니다.</p>
          </div>

          <div className="space-y-3">
            <Button onClick={handleCheckStatus} disabled={isChecking} className="w-full text-white" variant="gradient">
              {isChecking ? "확인 중..." : "승인 상태 확인"}
            </Button>
            <Button onClick={handleLogout} variant="outline" className="w-full bg-transparent">
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">문의사항이 있으시면 관리자에게 연락해주세요.</p>
        </CardContent>
      </Card>
    </div>
  )
}
