# 역할 기반 권한 시스템 가이드

## 역할 구조

### 1. 대표자 (CEO)
- **권한**: 전체 시스템 관리
- **접근 가능 페이지**: `/admin/*`
- **기능**:
  - 모든 학원 관리 (생성, 수정, 삭제)
  - 모든 사용자 승인 및 역할 부여 (대표자, 원장, 강사, 학생)
  - 모든 학생 데이터 조회 및 관리
  - 모든 교재 관리
  - 전체 통계 및 리포트 조회

### 2. 원장 (Academy Director)
- **권한**: 소속 학원 관리
- **접근 가능 페이지**: `/director/*`
- **기능**:
  - 소속 학원 학생만 조회 및 관리
  - 강사 및 학생 역할 부여 (본인 학원에만)
  - 본인 학원 학생의 교재 및 리포트 관리
  - 본인 학원 통계 조회
- **제한**:
  - 다른 학원 데이터 접근 불가
  - 대표자 및 원장 역할 부여 불가

### 3. 강사 (Instructor)
- **권한**: 학생 교육 관리
- **접근 가능 페이지**: `/admin/*` (제한된 기능)
- **기능**:
  - 소속 학원 학생 조회
  - 교재 관리
  - 학습 세션 기록
  - 리포트 작성
- **제한**:
  - 사용자 승인 및 역할 부여 불가
  - 학원 관리 불가

### 4. 학생 (Student)
- **권한**: 본인 학습 데이터만 접근
- **접근 가능 페이지**: `/student/*`
- **기능**:
  - 교재 학습
  - 문제 풀이
  - 본인 학습 기록 조회
  - 본인 리포트 조회

## 데이터 분리

### 학원 기반 데이터 분리
- 각 학원은 고유 ID(`academyId`)를 가짐
- 원장은 `academyId`가 할당됨
- 학생은 `academyId`로 학원에 소속됨
- 원장은 본인의 `academyId`와 일치하는 학생만 조회 가능

### 데이터 접근 규칙
\`\`\`typescript
// 대표자: 모든 데이터 접근
const students = await getAllStudents()

// 원장: 소속 학원 데이터만 접근
const academy = await getAcademyByDirectorId(userId)
const students = await getStudentsByAcademyId(academy.id)

// 학생: 본인 데이터만 접근
const student = await getStudentById(userId)
\`\`\`

## 승인 프로세스

### 신규 사용자 가입
1. Google 로그인으로 가입
2. 시스템 자동 확인:
   - 첫 번째 사용자? → 대표자로 자동 승인
   - NEXT_PUBLIC_ADMIN_EMAILS에 포함? → 대표자로 자동 승인
   - 그 외 → 승인 대기 상태
3. 대표자 또는 원장이 `/admin/users`에서 역할 부여 및 승인

### 역할 부여 규칙
- **대표자**: 모든 역할 부여 가능
- **원장**: 강사 및 학생 역할만 부여 가능
- 원장 또는 강사 역할 부여 시 학원 배정 필수

## 라우팅

### 로그인 후 리다이렉트
\`\`\`typescript
// 역할에 따른 리다이렉트
if (role === "학생") {
  router.push("/student")
} else if (role === "원장") {
  router.push("/director")
} else if (role === "대표자" || role === "강사") {
  router.push("/admin")
}
\`\`\`

### 권한 체크
각 페이지는 `useEffect`에서 권한을 확인:
\`\`\`typescript
useEffect(() => {
  const auth = localStorage.getItem("auth")
  if (!auth) {
    router.push("/login")
    return
  }

  const authData = JSON.parse(auth)
  if (authData.role !== "원장") {
    router.push("/login")
    return
  }
}, [router])
\`\`\`

## 환경 변수

### NEXT_PUBLIC_ADMIN_EMAILS
자동으로 대표자 권한을 받을 이메일 목록 (쉼표로 구분):
\`\`\`env
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,ceo@example.com
\`\`\`

## 보안 고려사항

1. **클라이언트 측 권한 체크**: 현재는 localStorage 기반
2. **서버 측 검증 필요**: 프로덕션 환경에서는 서버 측 권한 검증 추가 필요
3. **Firestore 보안 규칙**: FIRESTORE_SETUP.md 참고하여 데이터베이스 레벨에서 권한 제어

## 사용 예시

### 학원 등록 (대표자만)
1. `/admin/academies`로 이동
2. "학원 추가" 버튼 클릭
3. 학원 정보 입력 및 원장 배정
4. 저장

### 사용자 승인 (대표자 또는 원장)
1. `/admin/users`로 이동
2. 승인 대기 중인 사용자 확인
3. 역할 선택:
   - 대표자/학생: 즉시 승인
   - 원장/강사: 학원 선택 후 승인

### 학생 조회 (원장)
1. `/director/students`로 이동
2. 소속 학원 학생만 표시됨
3. 학생 상세보기 및 관리
