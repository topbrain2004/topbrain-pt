"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, UserCheck, UserX, Shield, Clock } from 'lucide-react'
import { getAllUsers, approveUser, rejectUser, canAssignRole, type User } from "@/lib/firestore/users"
import { getAllAcademies, type Academy } from "@/lib/firestore/academies"
import Navigation from "@/components/navigation"
import { BackButton } from "@/components/ui/back-button"

export default function UsersManagementPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [academies, setAcademies] = useState<Academy[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all")
  const [selectedAcademies, setSelectedAcademies] = useState<Record<string, string>>({})

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { refreshAuth, getAuthFromStorage } = await import("@/lib/auth")
        await refreshAuth()
        const authData = getAuthFromStorage()

        if (!authData) {
          router.push("/login")
          return
        }

        if (authData.role !== "관리자") {
          if (authData.role === "원장") router.push("/director")
          else if (authData.role === "학생") router.push("/student")
          else router.push("/login")
          return
        }

        setCurrentUserRole(authData.role)
        setCurrentUserId(authData.uid)
        loadData()
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [allUsers, allAcademies] = await Promise.all([getAllUsers(), getAllAcademies()])
      setUsers(allUsers)
      setAcademies(allAcademies)
    } catch (error) {
      console.error("Failed to load data:", error)
      alert("데이터를 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (userId: string, role: "대표자" | "원장" | "강사" | "학생") => {
    if (!canAssignRole(currentUserRole, role)) {
      alert("이 역할을 부여할 권한이 없습니다.")
      return
    }

    // Check if role requires academy assignment
    if (role === "원장" || role === "강사") {
      const academyId = selectedAcademies[userId]
      if (!academyId) {
        alert("학원을 선택해주세요.")
        return
      }

      try {
        await approveUser(userId, role, currentUserId, academyId)
        alert("사용자가 승인되고 학원에 배정되었습니다.")
        loadData()
        // Clear selection
        setSelectedAcademies((prev) => {
          const newState = { ...prev }
          delete newState[userId]
          return newState
        })
      } catch (error) {
        console.error("Failed to approve user:", error)
        alert("사용자 승인에 실패했습니다.")
      }
    } else {
      // Student or 대표자 doesn't need academy
      try {
        await approveUser(userId, role, currentUserId)
        alert("사용자가 승인되었습니다.")
        loadData()
      } catch (error) {
        console.error("Failed to approve user:", error)
        alert("사용자 승인에 실패했습니다.")
      }
    }
  }

  const handleReject = async (userId: string) => {
    if (!confirm("정말 이 사용자를 거부하시겠습니까?")) {
      return
    }

    try {
      await rejectUser(userId)
      alert("사용자가 거부되었습니다.")
      loadData()
    } catch (error) {
      console.error("Failed to reject user:", error)
      alert("사용자 거부에 실패했습니다.")
    }
  }

  const filteredUsers = users.filter((user) => {
    if (filter === "all") return true
    if (filter === "pending") return user.status === "pending"
    if (filter === "approved") return user.status === "approved"
    return true
  })

  const pendingCount = users.filter((u) => u.status === "pending").length

  const getAcademyName = (academyId?: string) => {
    if (!academyId) return "-"
    const academy = academies.find((a) => a.id === academyId)
    return academy?.name || "알 수 없음"
  }



  // ... imports

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 font-serif">사용자 관리</h1>
          <p className="text-gray-500">사용자 승인 및 권한 관리</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">전체 사용자</CardTitle>
              <Users className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">승인 대기</CardTitle>
              <Clock className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">승인 완료</CardTitle>
              <UserCheck className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {users.filter((u) => u.status === "approved").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-gray-900">사용자 목록</CardTitle>
                <CardDescription className="text-gray-500">사용자를 승인하고 권한을 부여하세요</CardDescription>
              </div>
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">승인 대기</SelectItem>
                  <SelectItem value="approved">승인 완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">사용자가 없습니다.</div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="border border-gray-100 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg text-gray-900">{user.displayName}</h3>
                              {user.status === "pending" && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  <Clock className="w-3 h-3 mr-1" />
                                  승인 대기
                                </Badge>
                              )}
                              {user.status === "approved" && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  승인 완료
                                </Badge>
                              )}
                              {user.status === "rejected" && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                                  <UserX className="w-3 h-3 mr-1" />
                                  거부됨
                                </Badge>
                              )}
                              {user.role && (
                                <Badge className="bg-gray-900 text-white">
                                  <Shield className="w-3 h-3 mr-1" />
                                  {user.role}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <p className="text-xs text-gray-500">
                              가입일: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                            {user.academyId && (
                              <p className="text-sm text-gray-600">소속 학원: {getAcademyName(user.academyId)}</p>
                            )}
                          </div>
                        </div>

                        {user.status === "pending" && (
                          <div className="flex flex-col gap-3 pt-3 border-t">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">역할 선택</label>
                                <Select
                                  onValueChange={(role: any) => {
                                    // If role doesn't need academy, approve immediately
                                    if (role === "대표자" || role === "학생") {
                                      handleApprove(user.id, role)
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="역할 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {canAssignRole(currentUserRole, "대표자") && (
                                      <SelectItem value="대표자">대표자</SelectItem>
                                    )}
                                    {canAssignRole(currentUserRole, "학생") && (
                                      <SelectItem value="학생">학생</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                  학원 배정 (원장/강사)
                                </label>
                                <Select
                                  value={selectedAcademies[user.id] || ""}
                                  onValueChange={(academyId) => {
                                    setSelectedAcademies((prev) => ({
                                      ...prev,
                                      [user.id]: academyId,
                                    }))
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="학원 선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {academies.map((academy) => (
                                      <SelectItem key={academy.id} value={academy.id}>
                                        {academy.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {canAssignRole(currentUserRole, "원장") && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(user.id, "원장")}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                  disabled={!selectedAcademies[user.id]}
                                >
                                  원장으로 승인
                                </Button>
                              )}
                              {canAssignRole(currentUserRole, "강사") && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(user.id, "강사")}
                                  className="flex-1 bg-gray-900 hover:bg-black text-white"
                                  disabled={!selectedAcademies[user.id]}
                                >
                                  강사로 승인
                                </Button>
                              )}
                              <Button variant="destructive" size="sm" onClick={() => handleReject(user.id)}>
                                거부
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
