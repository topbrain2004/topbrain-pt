"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building2, Plus, Edit, Trash2, Users } from 'lucide-react'
import { getAllAcademies, createAcademy, updateAcademy, deleteAcademy, type Academy } from "@/lib/firestore/academies"
import { getDirectorAccounts, type Account } from "@/lib/firestore/accounts"
import { BackButton } from "@/components/ui/back-button"

export default function AcademiesManagementPage() {
  const router = useRouter()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [directors, setDirectors] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAcademy, setEditingAcademy] = useState<Academy | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    directorId: "",
  })

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
          // Smart redirect
          if (authData.role === "원장") router.push("/director")
          else if (authData.role === "학생") router.push("/student")
          else router.push("/login")
          return
        }

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
      const [academiesData, directorsData] = await Promise.all([getAllAcademies(), getDirectorAccounts()])
      console.log("[v0] Loaded directors:", directorsData)
      setAcademies(academiesData)
      setDirectors(directorsData)
    } catch (error) {
      console.error("Failed to load data:", error)
      alert("데이터를 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.address || !formData.phone || !formData.email || !formData.directorId) {
      alert("모든 필드를 입력해주세요.")
      return
    }

    try {
      if (editingAcademy) {
        await updateAcademy(editingAcademy.id, formData)
        alert("학원 정보가 수정되었습니다.")
      } else {
        const academyId = await createAcademy(formData)
        console.log("[v0] Created academy with ID:", academyId)

        const { updateAccount } = await import("@/lib/firestore/accounts")
        await updateAccount(formData.directorId, {
          academyId: academyId, // Use the Firestore document ID
          academyName: formData.name,
        })

        console.log("[v0] Updated director account:", formData.directorId, "with academyId:", academyId)
        alert("학원이 등록되었습니다.")
      }

      setIsDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error("Failed to save academy:", error)
      alert("학원 저장에 실패했습니다.")
    }
  }

  const handleEdit = (academy: Academy) => {
    setEditingAcademy(academy)
    setFormData({
      name: academy.name,
      address: academy.address,
      phone: academy.phone,
      email: academy.email,
      directorId: academy.directorId,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (academyId: string) => {
    if (!confirm("정말 이 학원을 삭제하시겠습니까?")) {
      return
    }

    try {
      await deleteAcademy(academyId)
      alert("학원이 삭제되었습니다.")
      loadData()
    } catch (error) {
      console.error("Failed to delete academy:", error)
      alert("학원 삭제에 실패했습니다.")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
      directorId: "",
    })
    setEditingAcademy(null)
  }

  const getDirectorName = (directorId: string) => {
    const director = directors.find((d) => d.id === directorId)
    return director?.displayName || "알 수 없음"
  }



  // ... imports

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 font-serif">학원 관리</h1>
          <p className="text-gray-500">학원 정보 및 원장 배정을 관리합니다</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">전체 학원</CardTitle>
              <Building2 className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{academies.length}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">등록된 원장</CardTitle>
              <Users className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{directors.length}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">배정 대기 원장</CardTitle>
              <Users className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {directors.filter((d) => !academies.some((a) => a.directorId === d.id)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>학원 목록</CardTitle>
                <CardDescription>학원을 등록하고 원장을 배정하세요</CardDescription>
              </div>
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open)
                  if (!open) resetForm()
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="gradient">
                    <Plus className="w-4 h-4 mr-2" />
                    학원 추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingAcademy ? "학원 수정" : "학원 추가"}</DialogTitle>
                    <DialogDescription>학원 정보를 입력하고 원장을 배정하세요</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">학원명</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="예: 탑브레인 강남점"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">주소</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="서울시 강남구..."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">전화번호</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="02-1234-5678"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">이메일</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="academy@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="directorId">원장 배정</Label>
                      <Select
                        value={formData.directorId}
                        onValueChange={(value) => setFormData({ ...formData, directorId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="원장을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {directors.length === 0 ? (
                            <div className="px-2 py-6 text-sm text-gray-500 text-center">
                              등록된 원장이 없습니다.<br />
                              먼저 원장 계정을 생성해주세요.
                            </div>
                          ) : (
                            directors.map((director) => (
                              <SelectItem key={director.id} value={director.id}>
                                {director.displayName} ({director.email})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" variant="gradient" className="flex-1">
                        {editingAcademy ? "수정" : "추가"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false)
                          resetForm()
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : academies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">등록된 학원이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학원명</TableHead>
                      <TableHead>주소</TableHead>
                      <TableHead>전화번호</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>원장</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {academies.map((academy) => (
                      <TableRow key={academy.id}>
                        <TableCell className="font-semibold text-gray-900">{academy.name}</TableCell>
                        <TableCell className="text-sm">{academy.address}</TableCell>
                        <TableCell className="text-sm">{academy.phone}</TableCell>
                        <TableCell className="text-sm">{academy.email}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-600">{getDirectorName(academy.directorId)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(academy)}
                              className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(academy.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
