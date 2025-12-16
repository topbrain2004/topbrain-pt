import { signUp } from "../lib/auth"
import { createAccount } from "../lib/firestore/accounts"

// 기본 관리자 계정 정보
const ADMIN_USERNAME = "admin"
const ADMIN_EMAIL = "admin@literacy.app"
const ADMIN_PASSWORD = "admin1234!"
const ADMIN_DISPLAY_NAME = "시스템 관리자"

async function createAdminAccount() {
  try {
    console.log("관리자 계정 생성 중...")
    
    // Firebase Auth에 관리자 계정 생성
    const user = await signUp(ADMIN_EMAIL, ADMIN_PASSWORD)
    console.log("Firebase Auth 계정 생성 완료:", user.uid)
    
    // Firestore에 관리자 정보 저장
    const accountId = await createAccount({
      email: ADMIN_EMAIL,
      displayName: ADMIN_DISPLAY_NAME,
      role: "관리자",
      createdBy: "system",
      createdAt: new Date().toISOString(),
      status: "approved",
    })
    console.log("Firestore 계정 정보 저장 완료:", accountId)
    
    console.log("\n================================")
    console.log("관리자 계정 생성 완료!")
    console.log("================================")
    console.log("아이디:", ADMIN_USERNAME)
    console.log("이메일:", ADMIN_EMAIL)
    console.log("비밀번호:", ADMIN_PASSWORD)
    console.log("================================\n")
    
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      console.log("\n================================")
      console.log("관리자 계정이 이미 존재합니다!")
      console.log("================================")
      console.log("아이디:", ADMIN_USERNAME)
      console.log("이메일:", ADMIN_EMAIL)
      console.log("비밀번호:", ADMIN_PASSWORD)
      console.log("================================\n")
    } else {
      console.error("관리자 계정 생성 실패:", error)
      throw error
    }
  }
}

createAdminAccount()
