# Firestore 데이터베이스 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: topbrain-literacy-pt)
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

## 2. Firestore 데이터베이스 생성

1. Firebase Console에서 "Firestore Database" 선택
2. "데이터베이스 만들기" 클릭
3. 보안 규칙 선택:
   - 개발 중: "테스트 모드에서 시작" 선택
   - 프로덕션: "프로덕션 모드에서 시작" 선택
4. 위치 선택 (asia-northeast3 - 서울 권장)
5. "사용 설정" 클릭

## 3. Firebase Authentication 설정

1. Firebase Console에서 "Authentication" 선택
2. "시작하기" 클릭
3. "Sign-in method" 탭 선택
4. "Google" 제공업체 활성화
5. 프로젝트의 공개용 이름과 지원 이메일 설정
6. "저장" 클릭

## 4. Firebase 설정 정보 가져오기

1. Firebase Console에서 프로젝트 설정 (⚙️) 클릭
2. "일반" 탭에서 "내 앱" 섹션으로 스크롤
3. 웹 앱 추가 (</> 아이콘)
4. 앱 닉네임 입력
5. Firebase SDK 구성 정보 복사

## 5. 환경 변수 설정

`.env.local` 파일을 생성하고 Firebase 설정 정보를 입력:

\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# 관리자 이메일 설정 (쉼표로 구분, 자동으로 대표자 권한 부여)
NEXT_PUBLIC_ADMIN_EMAILS=your-email@example.com,another-admin@example.com
\`\`\`

## 6. 관리자 계정 자동 승인 설정

시스템은 다음 두 가지 방식으로 대표자 계정을 자동으로 승인합니다:

### 방법 1: 첫 번째 사용자
- 시스템에 가입하는 첫 번째 사용자는 자동으로 "대표자" 역할로 승인됩니다.
- 별도의 승인 절차 없이 바로 모든 기능을 사용할 수 있습니다.

### 방법 2: 관리자 이메일 목록
- `.env.local` 파일의 `NEXT_PUBLIC_ADMIN_EMAILS`에 등록된 이메일로 로그인하는 사용자는 자동으로 "대표자" 역할로 승인됩니다.
- 여러 관리자를 쉼표로 구분하여 등록할 수 있습니다.

예시:
\`\`\`env
NEXT_PUBLIC_ADMIN_EMAILS=ceo@topbrain.com,director@topbrain.com
\`\`\`

## 7. Firestore 컬렉션 구조

### users (신규)
- 사용자 계정 정보 및 권한 관리
- 필드:
  - id: Firebase UID
  - email: 이메일 주소
  - displayName: 표시 이름
  - photoURL: 프로필 사진 URL (선택)
  - role: "대표자" | "원장" | "강사" | "학생" | null
  - status: "pending" | "approved" | "rejected"
  - createdAt: 생성 시간
  - updatedAt: 수정 시간
  - approvedBy: 승인한 사용자 ID (선택)
  - approvedAt: 승인 시간 (선택)

### students
- 학생 정보 저장
- 필드: name, personalId, password, grade, phone, parentPhone, totalProblems, correctAnswers, averageScore, totalLearningTime, lastActivity

### textbooks
- 교재 정보 저장
- 필드: title, level, page, totalProblems, problems[]

### learning_sessions
- 학습 세션 기록
- 필드: studentId, textbookId, startTime, endTime, readingTime, solvingTime, totalQuestions, correctCount, results{}

### reports
- 학생 리포트 저장
- 필드: studentId, studentName, date, type, status, content{}

### admins
- 관리자 정보 저장
- 필드: personalId, password, name

## 8. 역할 기반 권한 시스템

### 역할 계층
1. **대표자**: 모든 권한 보유
   - 모든 역할 부여 가능 (대표자, 원장, 강사, 학생)
   - 모든 데이터 접근 및 수정 가능
   - 사용자 승인 및 거부 권한
   
2. **원장**: 제한된 관리 권한
   - 강사와 학생 역할만 부여 가능
   - 학생 및 교재 관리 가능
   - 리포트 작성 및 전송 가능
   
3. **강사**: 교육 관련 권한
   - 학생 관리 및 리포트 작성 가능
   - 교재 관리 가능
   - 학습 세션 기록 가능
   
4. **학생**: 학습 권한
   - 자신의 학습 데이터만 접근 가능
   - 교재 학습 및 문제 풀이 가능

### 사용자 승인 프로세스
1. 사용자가 구글 로그인으로 가입
2. 시스템이 자동 승인 조건 확인:
   - 첫 번째 사용자인가?
   - 관리자 이메일 목록에 포함되어 있는가?
3. 조건 충족 시: 자동으로 "대표자" 역할로 승인
4. 조건 미충족 시: "pending" 상태로 대기
5. 대표자 또는 원장이 사용자 관리 페이지(/admin/users)에서 역할 부여 및 승인
6. 승인된 사용자만 서비스 이용 가능

## 9. Firestore 보안 규칙 (프로덕션용)

Firebase Console > Firestore Database > 규칙 탭에서 다음 규칙 적용:

\`\`\`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['대표자', '원장']);
    }
    
    // Students collection
    match /students/{studentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['대표자', '원장', '강사'];
    }
    
    // Textbooks collection
    match /textbooks/{textbookId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['대표자', '원장', '강사'];
    }
    
    // Learning sessions collection
    match /learning_sessions/{sessionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Reports collection
    match /reports/{reportId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['대표자', '원장', '강사'];
    }
    
    // Admins collection
    match /admins/{adminId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['대표자', '원장'];
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == '대표자';
    }
  }
}
\`\`\`

## 10. 사용 예시

### 학생 데이터 가져오기
\`\`\`typescript
import { getAllStudents } from '@/lib/firestore'

const students = await getAllStudents()
\`\`\`

### 학습 세션 저장
\`\`\`typescript
import { createLearningSession, updateStudentStats } from '@/lib/firestore'

const sessionId = await createLearningSession({
  studentId: 'student123',
  textbookId: 'textbook456',
  textbookName: '문해력 기초 A',
  page: 1,
  startTime: new Date(),
  readingTime: 120,
  solvingTime: 300,
  totalQuestions: 10,
  correctCount: 8,
  results: { /* ... */ }
})

await updateStudentStats('student123', 8, 10, 420, 80)
\`\`\`

## 11. 개발 환경에서 테스트

1. 개발 서버를 실행합니다: `npm run dev`
2. 브라우저에서 `http://localhost:3000`에 접속
3. 로그인 페이지에서 "Google로 로그인" 클릭
4. 구글 계정으로 로그인
5. 첫 번째 사용자는 자동으로 대표자 권한을 받고 `/admin` 페이지로 이동
6. 추가 사용자는 승인 대기 상태가 되며 `/pending` 페이지로 이동
7. 대표자는 `/admin/users` 페이지에서 대기 중인 사용자를 승인하고 역할을 부여할 수 있습니다

## 12. 패키지 설치

Firebase SDK가 자동으로 설치됩니다:
- firebase
- firebase/app
- firebase/firestore
- firebase/auth

## 13. 문제 해결

### Firebase 연결 오류
- `.env.local` 파일의 환경 변수가 올바른지 확인하세요.
- Firebase Console에서 웹 앱이 등록되어 있는지 확인하세요.
- 개발 서버를 재시작하세요.

### 인증 오류
- Firebase Console에서 Google 로그인이 활성화되어 있는지 확인하세요.
- 승인된 도메인 목록에 localhost가 포함되어 있는지 확인하세요.

### 권한 오류
- Firestore 보안 규칙이 올바르게 설정되어 있는지 확인하세요.
- 사용자의 role과 status가 올바르게 설정되어 있는지 Firestore Console에서 확인하세요.
- 첫 번째 사용자가 자동으로 대표자 권한을 받았는지 확인하세요.

### 자동 승인이 작동하지 않는 경우
- `.env.local` 파일에 `NEXT_PUBLIC_ADMIN_EMAILS`가 올바르게 설정되어 있는지 확인하세요.
- 이메일 주소가 정확히 일치하는지 확인하세요 (대소문자 구분).
- 개발 서버를 재시작하세요.
