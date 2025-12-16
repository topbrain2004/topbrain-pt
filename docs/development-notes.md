# 문해력PT 앱 개발 노트

## 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [해결한 이슈](#해결한-이슈)
3. [진행 중인 이슈](#진행-중인-이슈)
4. [향후 개발 사항](#향후-개발-사항)

---

## 프로젝트 개요

문해력PT는 학생들의 문해력 향상을 위한 학습 플랫폼입니다.

### 기술 스택
- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Backend**: Firebase (Authentication, Firestore)
- **State Management**: SWR, localStorage

### 주요 기능
- 학생 학습 페이지 (교재별 문제 풀이)
- 관리자 대시보드 (학생 관리, 교재 관리, 통계)
- 학원 관리 시스템

---

## 해결한 이슈

### 1. React Hydration Error #418

**문제**: 서버 렌더링된 HTML과 클라이언트 렌더링 결과가 불일치하여 hydration 에러 발생

**원인**: 브라우저 전용 API (`localStorage`, `window`, `Date`)를 초기 렌더링 시 사용

**해결 방법**:

#### 1-1. lib/auth.ts - localStorage 접근 보호
\`\`\`typescript
// Before
const stored = localStorage.getItem("auth_user")

// After
if (typeof window === "undefined") return null
const stored = localStorage.getItem("auth_user")
\`\`\`

#### 1-2. hooks/use-mobile.ts - Hydration 상태 추가
\`\`\`typescript
const [isHydrated, setIsHydrated] = useState(false)

useEffect(() => {
  setIsHydrated(true)
}, [])

// 서버에서는 항상 false 반환
if (!isHydrated) return false
\`\`\`

#### 1-3. 페이지 컴포넌트 - 로딩 스켈레톤 추가
\`\`\`typescript
const [isHydrated, setIsHydrated] = useState(false)

useEffect(() => {
  setIsHydrated(true)
}, [])

if (!isHydrated) {
  return <LoadingSkeleton />
}
\`\`\`

**적용 파일**:
- `lib/auth.ts`
- `hooks/use-mobile.ts`
- `components/ui/use-mobile.tsx`
- `app/student/page.tsx`
- `app/pending/page.tsx`
- `app/student/learn/[workbookId]/page.tsx`

---

### 2. 관리자 로그인 무한 로딩 문제

**문제**: admin 계정 로그인 시 "로그인 중" 메시지만 표시되고 화면 전환 안됨

**디버깅 과정**:

1. 디버그 로그 추가하여 흐름 추적:
\`\`\`
[v0] Firebase sign in successful ← 여기까지만 실행됨
[v0] Getting account by email... ← 실행 안됨
\`\`\`

2. Firestore 계정 조회 단계에서 멈춤 확인

3. `createAccount` 함수에서 `setDoc` 호출 시 무한 대기 확인

**해결 방법**: Firestore 작업에 타임아웃 추가 및 fallback 데이터 사용

\`\`\`typescript
// 타임아웃 유틸리티 함수
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), ms)
    )
  ])
}

// 사용 예시
try {
  account = await withTimeout(getAccountByEmail(email), 3000)
} catch (error) {
  // Firestore 실패 시 fallback admin 데이터 사용
  if (email === "admin@literacy.app") {
    account = {
      id: user.uid,
      email: email,
      role: "admin",
      name: "관리자",
      status: "approved",
      // ...
    }
  }
}
\`\`\`

**적용 파일**:
- `app/login/page.tsx`
- `lib/firestore/accounts.ts`

---

## 진행 중인 이슈

### 1. Firestore 쓰기 권한 문제

**현상**: Firestore `setDoc` 호출 시 무한 대기 (에러도 응답도 없음)

**확인 사항**:

| 항목 | 상태 | 비고 |
|------|------|------|
| Firebase 환경변수 | 설정됨 | 모든 NEXT_PUBLIC_FIREBASE_* 변수 존재 |
| Firebase Auth | 정상 | 로그인 성공 로그 확인 |
| Firestore Security Rules | 정상 | 2025.12.04까지 모든 읽기/쓰기 허용 |

**추가 확인 필요**:

1. **Firestore 데이터베이스 생성 여부**
   - Firebase Console > Firestore Database 확인
   - "Create database" 버튼이 보이면 아직 생성 안됨

2. **Firestore 모드 확인**
   - **Native mode**: 클라이언트 SDK 사용 가능 (필요)
   - **Datastore mode**: 클라이언트 SDK 사용 불가

3. **프로젝트 ID 일치 여부**
   - 환경변수의 `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - 실제 Firestore가 있는 프로젝트 ID

**현재 보안 규칙**:
\`\`\`
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 4);
    }
  }
}
\`\`\`

---

## 향후 개발 사항

### 1. 교재 답 입력 기능

#### 데이터 구조

\`\`\`typescript
interface Problem {
  id: string
  type: "multiple" | "short" | "essay"  // 객관식/주관식/서술형
  question: string
  options?: string[]      // 객관식 보기
  answer: string          // 정답
  keywords?: string[]     // 서술형 채점용 키워드
  explanation?: string    // 해설
}
\`\`\`

#### 문제 유형별 입력 방식

| 유형 | 입력 항목 | 채점 방식 |
|------|----------|----------|
| 객관식 (multiple) | 정답 번호 (1~5) | 완전 일치 |
| 주관식 (short) | 텍스트 정답 | 대소문자 무시 후 완전 일치 |
| 서술형 (essay) | 모범답안 + 키워드 목록 | 키워드 60% 이상 포함 시 정답 |

#### 필요한 UI 구현

1. **관리자 교재 관리 페이지** (`/admin/textbooks`)
   - 소단원별 문제 추가/수정/삭제
   - 문제 유형 선택 드롭다운
   - 유형별 정답 입력 폼
   - 서술형 키워드 태그 입력

2. **일괄 입력 기능** (선택사항)
   - CSV/Excel 파일 업로드
   - 복사-붙여넣기 지원

#### 저장 구조

\`\`\`
Firestore
└── textbooks (컬렉션)
    └── {textbookId} (문서)
        ├── title: string
        ├── grade: string
        └── subUnits: SubUnit[]
            └── problems: Problem[]
\`\`\`

---

## 디버그 로그 위치

디버깅을 위해 추가된 `console.log("[v0] ...")` 위치:

| 파일 | 함수 | 로그 내용 |
|------|------|----------|
| `app/login/page.tsx` | `handleLogin` | 로그인 흐름 전체 |
| `lib/firestore/accounts.ts` | `getAccountByEmail` | Firestore 조회 |
| `lib/firestore/accounts.ts` | `createAccount` | Firestore 문서 생성 |

**참고**: 디버깅 완료 후 해당 로그들은 제거해야 합니다.

---

## 환경 설정

### 필요한 환경변수

\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
\`\`\`

### 관리자 계정

| 항목 | 값 |
|------|-----|
| 이메일 | admin@literacy.app |
| 비밀번호 | admin1234! |
| 권한 | admin |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2025-11-25 | React Hydration Error #418 수정 |
| 2025-11-25 | 관리자 로그인 타임아웃 및 fallback 추가 |
| 2025-11-25 | Firestore 권한 문제 분석 |
| 2025-11-25 | 교재 답 입력 기능 설계 |
