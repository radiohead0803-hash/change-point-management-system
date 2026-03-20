# 변동점 관리시스템 (Change Point Management System)

**(주)캠스** - 현대/기아자동차 부품 협력사를 위한 변동점 관리 전산 시스템

자동차 부품 제조 현장에서 발생하는 4M 변경, 공정 변동, 신규/변동 항목을 체계적으로 접수-검토-승인하고, 월별 보고서를 생성하여 고객사(현대/기아)에 제출하기 위한 웹 기반 관리 시스템입니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Monorepo** | Turborepo + pnpm 8.15.1 Workspaces |
| **Backend** | NestJS 10 (TypeScript) |
| **Frontend** | Next.js 14.1 (App Router, TypeScript) |
| **ORM** | Prisma 5.22 |
| **Database** | PostgreSQL 15+ (Railway Managed) |
| **인증** | JWT + Refresh Token (Passport.js) |
| **UI** | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| **상태관리** | TanStack React Query 5 |
| **테이블** | TanStack React Table 8 |
| **폼** | React Hook Form 7 + Zod |
| **차트** | Recharts |
| **엑셀** | ExcelJS |
| **PWA** | next-pwa |
| **배포** | Railway (GitHub 연동 자동 배포) |

---

## 프로젝트 구조

```
change-point-management-system/
├── apps/
│   ├── api/                        # NestJS 백엔드 API
│   │   └── src/
│   │       ├── auth/               # 인증 (JWT, Passport, RBAC Guard)
│   │       ├── change-events/      # 변동점 CRUD + 분류코드 관리
│   │       ├── excel/              # 월별 엑셀 보고서 생성
│   │       ├── inspection/         # 점검 템플릿/항목/결과
│   │       ├── notifications/      # 알림 (승인요청, 승인완료, 보완요청)
│   │       ├── users/              # 사용자 + 회사(협력사) 관리
│   │       ├── settings/           # 정책 설정
│   │       ├── prisma/             # PrismaService
│   │       ├── common/             # 공통 필터 (HttpExceptionFilter)
│   │       ├── bootstrap.service.ts
│   │       ├── health.controller.ts
│   │       └── main.ts
│   │
│   └── web/                        # Next.js 프론트엔드
│       ├── app/
│       │   ├── dashboard/          # 대시보드 (차트, 통계, AI 인사이트)
│       │   ├── change-events/
│       │   │   ├── new/            # 변동점 신규 등록
│       │   │   ├── [id]/           # 변동점 상세/수정
│       │   │   ├── my/             # 내 요청 목록
│       │   │   └── approvals/      # 승인함
│       │   ├── admin/
│       │   │   ├── master-data/    # 분류체계 관리
│       │   │   ├── codes/          # 공통코드 관리
│       │   │   ├── vehicles/       # 차종현황 관리
│       │   │   ├── suppliers/      # 협력사현황 관리
│       │   │   ├── users/          # 사용자 관리
│       │   │   └── settings/       # 시스템 설정
│       │   ├── analytics/          # 분석
│       │   ├── report/             # 보고서
│       │   ├── notifications/      # 알림
│       │   ├── profile/            # 프로필
│       │   ├── help/               # 도움말/관리기준
│       │   └── login/              # 로그인
│       └── src/
│           ├── components/
│           │   ├── ui/             # shadcn/ui (Button, Input, Toast 등)
│           │   ├── layout/         # RootLayout, Sidebar, MobileNav
│           │   ├── change-events/  # TagSelector, ClassificationGuide
│           │   └── settings/       # PolicySettings
│           ├── contexts/           # React Context
│           ├── lib/                # API 클라이언트, 유틸리티
│           ├── providers/          # QueryClient, Theme 등
│           └── types/              # TypeScript 타입 정의
│
├── packages/
│   └── database/                   # Prisma ORM 공유 패키지 (@cpms/database)
│       └── prisma/
│           ├── schema.prisma       # DB 스키마 정의
│           ├── seed.ts             # 초기 데이터 (관리자 + 분류체계)
│           └── migrations/         # DB 마이그레이션
│
├── railway.toml                    # Railway API 배포 설정
├── railway-web.toml                # Railway Web 배포 설정
├── turbo.json                      # Turborepo 파이프라인
├── pnpm-workspace.yaml             # pnpm 워크스페이스
└── tsconfig.json                   # 루트 TypeScript 설정
```

---

## 주요 기능

### 1. 변동점 등록 및 관리
- 1차사/2차사 변동점 등록 (임시저장 DRAFT 지원)
- 3대 분류체계 기반 분류: 4M 17항목, 4M외 17항목, 96항목
- 다중 태그 분류 (PRIMARY + TAG)
- 첨부파일 업로드 (최대 5MB, 이미지/문서)
- 조치 결과 기록: 조치시점, 조치방안, 조치결과, 품질검증

### 2. 승인 프로세스
- 다단계 승인 플로우 (상세 내용은 아래 "승인 플로우" 참조)
- 인라인 승인/반려 기능 (승인함 페이지)
- 승인/반려 시 자동 알림 생성

### 3. 대시보드 및 분석
- 월별 추이 차트 (Recharts)
- 상태별 파이차트
- AI 인사이트
- 분류별/공장별/라인별 통계

### 4. 엑셀 보고서
- 월별 취합 보고서 자동 생성 (ExcelJS)
- 고객사(현대/기아) 제출용 포맷

### 5. 점검 관리
- 점검 템플릿 생성/관리
- 다양한 항목 유형 (TEXT, SELECT, RADIO, CHECKBOX, NUMBER, DATE)
- 변동점별 점검 결과 일괄 등록

### 6. 알림 시스템
- 승인 요청, 승인 완료, 보완 요청, 제출 알림
- 읽음/안읽음 관리, 전체 읽음 처리

### 7. 기초정보 관리 (모두 DB 기반)
- **분류체계 관리** (`/admin/master-data`): 변경 분류(Class) > 카테고리(Category) > 항목(Item) CRUD
- **공통코드 관리** (`/admin/codes`): 시스템 공통코드 DB 관리
- **차종현황 관리** (`/admin/vehicles`): 차종 정보 DB 기반 CRUD
- **협력사현황 관리** (`/admin/suppliers`): 협력사(TIER1/TIER2/CUSTOMER) DB 관리

### 8. 사용자 관리
- 사용자 CRUD (관리자 전용)
- 비밀번호 초기화 및 최초 로그인 시 변경 강제
- 프로필 수정

### 9. PWA / 모바일
- Progressive Web App 지원
- 모바일 반응형 UI (MobileNav)
- Apple-style Glassmorphism 디자인

---

## DB 테이블 구조

| 테이블 | 모델 | 설명 |
|--------|------|------|
| `users` | User | 사용자 (역할, 팀, 직급, 회사 연결) |
| `companies` | Company | 회사 (TIER1/TIER2/CUSTOMER) |
| `change_classes` | ChangeClass | 변경 분류 (4M, 4M외, 96항목) |
| `change_categories` | ChangeCategory | 변경 카테고리 (계층 구조, depth) |
| `change_items` | ChangeItem | 변경 세부 항목 |
| `change_events` | ChangeEvent | **변동점** (핵심 테이블) |
| `change_event_tags` | ChangeEventTag | 변동점 다중 분류 태그 |
| `policy_settings` | PolicySetting | 정책 설정 (JSON 기반, 유효기간) |
| `inspection_templates` | InspectionTemplate | 점검 템플릿 |
| `inspection_items` | InspectionItem | 점검 항목 |
| `inspection_results` | InspectionResult | 점검 결과 |
| `attachments` | Attachment | 첨부파일 (Base64 저장) |
| `notifications` | Notification | 알림 |

> 모든 테이블은 Soft Delete (`deletedAt`) 패턴을 적용합니다.

---

## 역할/권한 체계 (RBAC)

| 역할 | 코드 | 권한 |
|------|------|------|
| **시스템 관리자** | `ADMIN` | 전체 시스템 관리, 사용자/회사/분류체계/설정 관리 |
| **1차사 담당자** | `TIER1_EDITOR` | 변동점 등록/수정, 2차사 변동점 검토 |
| **1차사 검토자** | `TIER1_REVIEWER` | 제출된 변동점 검토(REVIEWED), 보완 반려(REVIEW_RETURNED) |
| **전담중역** | `EXEC_APPROVER` | 검토 완료된 변동점 최종 승인(APPROVED)/반려(REJECTED) |
| **2차사 담당자** | `TIER2_EDITOR` | 자사 변동점 등록/수정/제출 |
| **고객사 열람자** | `CUSTOMER_VIEWER` | 승인 완료된 변동점 열람 전용 |

---

## 승인 플로우

```
[DRAFT] ──제출──> [SUBMITTED] ──1차검토──> [REVIEWED] ──최종승인──> [APPROVED] ──마감──> [CLOSED]
  임시저장            접수           │         1차승인         │       최종승인        완료
                                    │                         │
                                    └──보완반려──> [REVIEW_RETURNED]
                                                               │
                                                  [REJECTED] <─┘ 반려
```

| 상태 | 코드 | 설명 |
|------|------|------|
| 임시저장 | `DRAFT` | 작성 중, 필수항목 미입력 허용 |
| 접수 | `SUBMITTED` | 제출 완료, 검토 대기 |
| 보완요청 | `REVIEW_RETURNED` | 1차 검토자가 보완 요청 |
| 1차승인 | `REVIEWED` | 1차 검토 통과, 최종 승인 대기 |
| 최종승인 | `APPROVED` | 전담중역 승인 완료 |
| 완료 | `CLOSED` | 최종 마감 |
| 반려 | `REJECTED` | 전담중역 반려 |

### 운영 프로세스
- **매일**: 변동점 발생 시 즉시 등록 및 점검
- **매주**: 주간 종합 점검 및 검토
- **매월**: 월간 취합 보고서 생성 후 고객사(HMC/KIA) 제출

---

## 배포 정보

Railway 클라우드에 2개 서비스로 배포되어 운영 중입니다.

| 서비스 | URL | 설정 파일 |
|--------|-----|-----------|
| **API** | https://change-point-management-system-production.up.railway.app | `railway.toml` |
| **Web** | https://change-point-management-system-web-production-4176.up.railway.app | `railway-web.toml` |

### API 서비스 환경변수

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 URL (Railway DB 자동 생성) |
| `JWT_SECRET` | JWT 토큰 암호화 키 |
| `JWT_REFRESH_SECRET` | Refresh Token 암호화 키 |
| `FRONTEND_URL` | Web 서비스 URL (CORS) |
| `NODE_ENV` | `production` |

### Web 서비스 환경변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_API_URL` | API 서비스 URL + `/api` |
| `NODE_ENV` | `production` |

---

## 로컬 개발 환경 설정

### 요구사항
- Node.js 18+
- pnpm 8.15.1
- PostgreSQL 15+

### 설치 및 실행

```bash
# 1. 의존성 설치
corepack enable
pnpm install

# 2. 환경변수 설정
cp .env.example .env
```

`.env` 파일 편집:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/change_point_db"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-jwt-refresh-secret"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

```bash
# 3. Prisma 클라이언트 생성 및 DB 마이그레이션
cd packages/database
npx prisma generate
npx prisma migrate dev
cd ../..

# 4. 초기 데이터 시딩 (관리자 계정 + 분류체계)
cd packages/database
npx prisma db seed
cd ../..

# 5. 개발 서버 실행
pnpm dev
```

| 서비스 | 주소 |
|--------|------|
| API | http://localhost:3000 |
| Web | http://localhost:3001 |
| Swagger | http://localhost:3000/api |

### 초기 관리자 계정
- ID: `admin`
- PW: `1234`

---

## API 엔드포인트 요약

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/auth/login` | 로그인 |
| `POST` | `/api/auth/register` | 회원가입 |
| `POST` | `/api/auth/refresh` | 토큰 재발급 |
| `GET/POST` | `/api/change-events` | 변동점 목록/등록 |
| `GET/PATCH/DELETE` | `/api/change-events/:id` | 변동점 상세/수정/삭제 |
| `GET` | `/api/change-events/monthly/:year/:month` | 월별 변동점 조회 |
| `GET/POST/PATCH/DELETE` | `/api/change-events/codes/*` | 분류체계(Class/Category/Item) CRUD |
| `POST` | `/api/change-events/:eventId/attachments` | 첨부파일 업로드 |
| `GET` | `/api/excel/monthly/:year/:month` | 월별 엑셀 보고서 다운로드 |
| `GET/POST/PATCH/DELETE` | `/api/inspection/*` | 점검 템플릿/항목/결과 CRUD |
| `GET/POST/PATCH/DELETE` | `/api/users` | 사용자 CRUD |
| `GET/POST/PATCH/DELETE` | `/api/users/companies` | 회사(협력사) CRUD |
| `GET/PATCH` | `/api/notifications` | 알림 조회/읽음 처리 |
| `GET` | `/api/health` | 헬스체크 |

> Swagger 문서: http://localhost:3000/api

---

## 분류체계

시스템은 현대/기아자동차의 변동점 관리 기준에 따라 3대 분류체계를 사용합니다.

| 분류 | 코드 | 항목수 | 설명 |
|------|------|--------|------|
| **4M 변경 필수 신고** | `FOUR_M` | 17 | VAATZ 신고 시스템 통해 신고 필수 (MAN/MACHINE/MATERIAL/METHOD) |
| **4M 기준 외 관리대상** | `NON_FOUR_M` | 17 | 협력사 담당 중역 주관 변동점 담당제 |
| **신기술/집중관리/신규&변동** | `CP_96` | 96 | 신기술(3) + 집중관리(9) + 신규&변동(84) |

> 분류체계는 Seed 데이터로 초기 적재되며, 관리자 화면(`/admin/master-data`)에서 CRUD 가능합니다.

---

## 라이선스

Copyright (c) 2024-2026 (주)캠스. All rights reserved.
