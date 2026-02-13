# 변동점 관리 시스템 (Change Point Management System)

자동차 부품 개발사의 변동점 관리를 위한 전산 시스템입니다.

## 프로젝트 구조

```
change-point-management-system/
├── apps/
│   ├── api/                  # NestJS 백엔드 API 서버
│   │   └── src/
│   │       ├── auth/         # 인증 (JWT, @Public 데코레이터)
│   │       ├── change-events/# 변동점 CRUD
│   │       ├── excel/        # 엑셀 보고서 생성
│   │       ├── inspection/   # 점검 템플릿/항목/결과
│   │       ├── settings/     # 정책 설정
│   │       ├── health.controller.ts  # 헬스체크 엔드포인트
│   │       └── main.ts       # 앱 진입점
│   └── web/                  # Next.js 프론트엔드
│       └── src/
│           ├── app/
│           │   ├── api/health/   # 헬스체크 API route
│           │   ├── change-events/# 변동점 페이지
│           │   ├── dashboard/    # 대시보드
│           │   ├── login/        # 로그인
│           │   └── admin/        # 관리자
│           ├── components/
│           │   ├── ui/           # shadcn/ui 컴포넌트
│           │   ├── layout/       # 레이아웃 컴포넌트
│           │   ├── change-events/# 변동점 관련 컴포넌트
│           │   └── settings/     # 설정 컴포넌트
│           ├── lib/              # API 클라이언트, 유틸리티
│           └── types/            # TypeScript 타입 정의
├── packages/
│   └── database/             # Prisma ORM 공유 패키지
│       └── prisma/
│           └── schema.prisma # DB 스키마 정의
├── railway.toml              # Railway 배포 설정 (API용)
├── railway.api.toml          # Railway API 서비스 설정
├── railway.web.toml          # Railway Web 서비스 설정
├── turbo.json                # Turborepo 빌드 파이프라인
└── pnpm-workspace.yaml       # pnpm 워크스페이스 설정
```

## 기술 스택

### Backend (`apps/api`)
- **Runtime**: Node.js 18+
- **Framework**: NestJS 10
- **ORM**: Prisma 5.22.0
- **Database**: PostgreSQL 15+ (Railway Managed DB)
- **인증**: JWT + Refresh Token (Passport.js)
- **접근제어**: RBAC + @Public 데코레이터 (전역 JwtAuthGuard)
- **API 문서**: Swagger (NestJS Swagger)
- **보안**: Helmet, CORS, Compression
- **엑셀**: ExcelJS
- **Soft Delete**: 전체 모델 적용

### Frontend (`apps/web`)
- **Framework**: Next.js 14.1.0
- **Language**: TypeScript 5.3
- **스타일링**: Tailwind CSS 3.4 + shadcn/ui (Radix UI)
- **상태관리**: TanStack React Query 5
- **테이블**: TanStack React Table 8
- **폼**: React Hook Form 7 + Zod 유효성 검증
- **HTTP**: Axios
- **PWA**: next-pwa
- **테마**: next-themes (다크모드 지원)

### Infrastructure
- **빌드**: Turborepo + pnpm 8.15.1 워크스페이스
- **배포**: Railway (GitHub 연동 자동 배포)
- **DB**: Railway PostgreSQL

## 데이터 모델

| 모델 | 설명 |
|------|------|
| `User` | 사용자 (역할 기반 접근제어) |
| `Company` | 회사 (TIER1, TIER2, CUSTOMER) |
| `ChangeClass` | 변경 분류 (4M, 외주 17항목, CP 96항목) |
| `ChangeCategory` | 변경 카테고리 (계층 구조) |
| `ChangeItem` | 변경 항목 |
| `ChangeEvent` | 변동점 이벤트 (핵심 모델) |
| `ChangeEventTag` | 변동점 태그 (다중 분류) |
| `PolicySetting` | 정책 설정 (JSON 기반) |
| `InspectionTemplate` | 점검 템플릿 |
| `InspectionItem` | 점검 항목 |
| `InspectionResult` | 점검 결과 |
| `Attachment` | 첨부파일 |

## 주요 기능

### 1. 변동점 등록 및 관리
- 1차사/2차사 변동점 등록
- 4M, 외주 17항목, CP 96항목 분류 체계
- 다중 태그 분류 지원
- 모바일 등록 지원
- 사진 첨부 기능 (최대 5MB)

### 2. 승인 프로세스
- 상태 흐름: `DRAFT` → `SUBMITTED` → `REVIEWED` → `APPROVED`
- 반려: `REVIEW_RETURNED`, `REJECTED`
- 완료: `CLOSED`
- 1차사 검토 → 담당중역 승인

### 3. 점검 관리
- 점검 템플릿 생성/관리
- 다양한 항목 유형 (TEXT, SELECT, RADIO, CHECKBOX, NUMBER, DATE)
- 변동점별 점검 결과 기록

### 4. 보고서 생성
- 월별 취합 보고서
- 고객사 제출용 엑셀 생성 (ExcelJS)

### 5. 권한 관리 (RBAC)
| 역할 | 설명 |
|------|------|
| `ADMIN` | 시스템 관리자 |
| `TIER1_EDITOR` | 1차사 담당자 |
| `TIER2_EDITOR` | 2차사 담당자 |
| `TIER1_REVIEWER` | 1차사 검토자 |
| `EXEC_APPROVER` | 전담중역 |
| `CUSTOMER_VIEWER` | 고객사 열람자 |

### 6. 정책 설정
- 글로벌/고객사/프로그램/접수월 단위 정책
- JSON 기반 유연한 설정 구조
- 유효기간 관리

## API 엔드포인트

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| `GET` | `/api/health` | 헬스체크 | 불필요 |
| `POST` | `/api/auth/login` | 로그인 | 불필요 |
| `POST` | `/api/auth/register` | 회원가입 | 불필요 |
| `POST` | `/api/auth/refresh` | 토큰 재발급 | Refresh Token |
| `GET/POST` | `/api/change-events` | 변동점 목록/등록 | JWT |
| `GET/PATCH/DELETE` | `/api/change-events/:id` | 변동점 상세/수정/삭제 | JWT |
| `GET` | `/api/excel/monthly-report` | 월별 보고서 다운로드 | JWT |
| `GET/POST` | `/api/inspection/templates` | 점검 템플릿 | JWT |
| `GET/POST` | `/api/inspection/items` | 점검 항목 | JWT |
| `GET/POST` | `/api/inspection/results` | 점검 결과 | JWT |
| `GET/PATCH` | `/api/settings` | 정책 설정 | JWT |

Swagger 문서: `http://localhost:3000/api`

## 설치 방법

### 요구사항
- Node.js 18 이상
- pnpm 8.15.1
- PostgreSQL 15 이상

### 로컬 개발 환경 설정

1. 저장소 클론
```bash
git clone https://github.com/radiohead0803-hash/change-point-management-system.git
cd change-point-management-system
```

2. 의존성 설치
```bash
corepack enable
pnpm install
```

3. 환경 변수 설정
```bash
cp .env.example .env
```
`.env` 파일을 열어 아래 값을 수정:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/change_point_db"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-jwt-refresh-secret"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

4. Prisma 클라이언트 생성 및 DB 마이그레이션
```bash
cd packages/database
npx prisma generate
npx prisma migrate dev
cd ../..
```

5. 개발 서버 실행
```bash
pnpm dev
```
- API 서버: http://localhost:3000
- Web 서버: http://localhost:3001
- Swagger: http://localhost:3000/api

### 모바일 PWA 설치

1. Chrome 브라우저로 Web 서버 URL 접속
2. 메뉴에서 "홈 화면에 추가" 선택
3. 설치 확인 후 홈 화면에서 실행

## Railway 배포

### 서비스 구성

Railway 프로젝트에 **2개 서비스**를 생성합니다:

| 서비스 | 설정 파일 | Start Command | Healthcheck |
|--------|-----------|---------------|-------------|
| **API** | `railway.toml` | `cd apps/api && node dist/main` | `/api/health` |
| **Web** | Railway UI 오버라이드 | `cd apps/web && npx next start --hostname 0.0.0.0 --port ${PORT:-3000}` | `/api/health` |

### API 서비스 환경변수

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 URL (Railway DB 추가 시 자동 생성) |
| `JWT_SECRET` | JWT 토큰 암호화 키 |
| `JWT_REFRESH_SECRET` | Refresh Token 암호화 키 |
| `FRONTEND_URL` | Web 서비스 URL (CORS 허용) |
| `NODE_ENV` | `production` |

### Web 서비스 환경변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_API_URL` | API 서비스 URL + `/api` |
| `NODE_ENV` | `production` |

### Web 서비스 Railway UI 설정

Web 서비스는 `railway.toml`이 API용이므로, Railway UI에서 직접 오버라이드:

- **Build Command**:
  ```
  corepack enable && corepack prepare pnpm@8.15.1 --activate && pnpm install --no-frozen-lockfile && cd packages/database && npx prisma generate && pnpm build && cd ../../apps/web && pnpm build
  ```
- **Start Command**:
  ```
  cd apps/web && npx next start --hostname 0.0.0.0 --port ${PORT:-3000}
  ```
- **Healthcheck Path**: `/api/health`

## 라이선스

Copyright © 2024 All rights reserved.
