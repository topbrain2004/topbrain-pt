"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserPlus, Trash2, Eye, EyeOff } from 'lucide-react'
import { getAuthFromStorage } from "@/lib/auth"
import { signUp } from "@/lib/auth"
import { createAccount, getAccountsByCreator, deleteAccount, type Account } from "@/lib/firestore/accounts"
import { BackButton } from "@/components/ui/back-button"

export default function AccountManagementPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [newAccount, setNewAccount] = useState({
    username: "",
    password: "",
    displayName: "",
    academyName: "",
  })

  useEffect(() => {
    const auth = getAuthFromStorage()
    if (!auth || auth.role !== "관리자") {
      router.push("/login")
      return
    }

    loadAccounts(auth.uid)
  }, [router])

  const loadAccounts = async (creatorId: string) => {
    setIsLoading(true)
    try {
      const data = await getAccountsByCreator(creatorId)
      setAccounts(data.filter(a => a.role === "원장"))
    } catch (error) {
      console.error("Failed to load accounts:", error)
    }
    setIsLoading(false)
  }

  const handleCreateAccount = async () => {
    if (!newAccount.username || !newAccount.password || !newAccount.displayName || !newAccount.academyName) {
      alert("모든 필드를 입력해주세요.")
      return
    }

    setIsCreating(true)
    try {
      const auth = getAuthFromStorage()
      if (!auth) return

      const email = `${newAccount.username}@literacy.app`
      const user = await signUp(email, newAccount.password)

      await createAccount({
        email: email,
        displayName: newAccount.displayName,
        role: "원장",
        academyId: newAccount.academyName.toLowerCase().replace(/\s+/g, '-'),
        createdBy: auth.uid,
        createdAt: new Date().toISOString(),
        status: "approved",
      })

      await loadAccounts(auth.uid)
      setIsDialogOpen(false)
      setNewAccount({ username: "", password: "", displayName: "", academyName: "" })
      alert("원장 계정이 생성되었습니다.")
    } catch (error: any) {
      console.error("Failed to create account:", error)
      if (error.code === "auth/email-already-in-use") {
        alert("이미 사용 중인 아이디입니다.")
      } else {
        alert("계정 생성에 실패했습니다.")
      }
    }
    setIsCreating(false)
  }

  const handleDeleteAccount = async (accountId: string, email: string) => {
    const username = email.split('@')[0]
    if (!confirm(`${username} 계정을 삭제하시겠습니까?`)) return

    try {
      await deleteAccount(accountId)
      const auth = getAuthFromStorage()
      if (auth) await loadAccounts(auth.uid)
      alert("계정이 삭제되었습니다.")
    } catch (error) {
      console.error("Failed to delete account:", error)
      alert("계정 삭제에 실패했습니다.")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3d5a80] mx-auto mb-4"></div>
          <p className="text-[#3d5a80]">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#cfe8e9] to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BackButton />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#3d5a80] mb-2">원장 계정 관리</h1>
            <p className="text-[#3d5a80]/70">원장 계정을 생성하고 관리합니다</p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#3d5a80] hover:bg-[#2c4058]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            원장 계정 생성
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-[#3d5a80]">등록된 원장 계정</CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#3d5a80]/60">등록된 원장 계정이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => {
                  const username = account.email.split('@')[0]
                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border border-[#3d5a80]/20 rounded-lg hover:bg-[#cfe8e9]/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#3d5a80] rounded-full flex items-center justify-center text-white font-semibold">
                          {account.displayName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-[#3d5a80]">{account.displayName}</p>
                          <p className="text-sm text-[#3d5a80]/60">아이디: {username}</p>
                          <p className="text-xs text-[#3d5a80]/50">학원 ID: {account.academyId}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAccount(account.id, account.email)}
                          className="border-red-500 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#3d5a80]">원장 계정 생성</DialogTitle>
              <DialogDescription>
                새로운 원장 계정을 생성합니다. 생성된 아이디와 비밀번호를 원장에게 전달하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">원장 이름</Label>
                <Input
                  id="displayName"
                  placeholder="홍길동"
                  value={newAccount.displayName}
                  onChange={(e) => setNewAccount({ ...newAccount, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academyName">학원 이름</Label>
                <Input
                  id="academyName"
                  placeholder="탑브레인 강남점"
                  value={newAccount.academyName}
                  onChange={(e) => setNewAccount({ ...newAccount, academyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">아이디</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="director123"
                  value={newAccount.username}
                  onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="8자 이상"
                    value={newAccount.password}
                    onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isCreating}
              >
                취소
              </Button>
              <Button
                onClick={handleCreateAccount}
                disabled={isCreating}
                className="bg-[#3d5a80] hover:bg-[#2c4058]"
              >
                {isCreating ? "생성 중..." : "계정 생성"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
