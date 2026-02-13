# 변동점 관리 시스템 (Change Point Management System)

자동차 부품 개발사의 변동점 관리를 위한 전산 시스템입니다.

## 기술 스택

### Backend
- Node.js + NestJS
- Prisma ORM
- PostgreSQL (Railway Managed DB)
- JWT + Refresh Token
- RBAC + Scope 기반 접근제어
- Soft Delete 적용

### Frontend
- Next.js + TypeScript
- Tailwind + shadcn/ui
- Fully Responsive Design
- PWA 지원
- 모바일 하단 탭 네비게이션 구조

### Infrastructure
- Railway 배포
- GitHub 연동 자동 배포
- PostgreSQL 관리형 DB

## 주요 기능

1. 변동점 등록 및 관리
   - 1차사/2차사 변동점 등록
   - 모바일 등록 지원
   - 사진 첨부 기능

2. 승인 프로세스
   - 1차사 검토
   - 담당중역 승인
   - 상태 관리 (Draft → Submitted → Reviewed → Approved)

3. 보고서 생성
   - 월별 취합
   - 고객사 제출용 엑셀 생성

4. 권한 관리
   - ADMIN: 시스템 관리자
   - TIER1_EDITOR: 1차사 담당자
   - TIER2_EDITOR: 2차사 담당자
   - TIER1_REVIEWER: 1차사 검토자
   - EXEC_APPROVER: 전담중역
   - CUSTOMER_VIEWER: 고객사 열람자

## 설치 방법

### 요구사항
- Node.js 18 이상
- pnpm 8 이상
- PostgreSQL 15 이상

### 로컬 개발 환경 설정

1. 저장소 클론
\`\`\`bash
git clone <repository-url>
cd change-point-management-system
\`\`\`

2. 의존성 설치
\`\`\`bash
pnpm install
\`\`\`

3. 환경 변수 설정
\`\`\`bash
cp .env.example .env
# .env 파일 수정
\`\`\`

4. 데이터베이스 마이그레이션
\`\`\`bash
cd packages/database
pnpm prisma migrate dev
\`\`\`

5. 개발 서버 실행
\`\`\`bash
# 루트 디렉토리에서
pnpm dev
\`\`\`

### 모바일 PWA 설치

1. Chrome 브라우저로 접속
2. 메뉴에서 "홈 화면에 추가" 선택
3. 설치 확인 후 홈 화면에서 실행

## 배포 방법

1. Railway CLI 설치
\`\`\`bash
npm i -g @railway/cli
\`\`\`

2. Railway 로그인
\`\`\`bash
railway login
\`\`\`

3. 프로젝트 연결
\`\`\`bash
railway link
\`\`\`

4. 배포
\`\`\`bash
railway up
\`\`\`

## 라이선스

Copyright © 2024 All rights reserved.
