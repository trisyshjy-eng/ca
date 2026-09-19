# 제조원가 기반 제안단가 산출 시스템

업체/품목별 제안요청이 들어오면 제조원가를 표준화된 방식으로 자동 계산하고, 이를 기반으로 제안단가(견적가)를 산출·이력화하는 웹 애플리케이션입니다.

## 배경 및 목적

- 담당자별로 다른 엑셀 계산 기준을 하나의 표준 계산 방식으로 통일
- 원가 → 제안단가 산출 자동화로 수작업 절감
- 산출 이력의 데이터베이스화로 조회·통계·감사 지원

## 기술 스택

- **프론트엔드/백엔드**: Next.js 16 (App Router, Server Actions) + TypeScript
- **데이터베이스**: PostgreSQL + Prisma ORM
- **인증/권한**: JWT 세션(jose) + bcrypt, 역할(관리자/담당자/조회자) 기반 접근 제어
- **문서 출력**: PDF(puppeteer-core + 로컬 Edge/Chrome 헤드리스 렌더링), 엑셀(exceljs)
- **테스트**: Vitest

## 시작하기

PostgreSQL 데이터베이스가 필요합니다. 현재 Supabase 사용을 기준으로 합니다.

```bash
cp .env.example .env        # DATABASE_URL, DIRECT_URL, SESSION_SECRET 채우기
npm install
npx prisma migrate deploy   # 마이그레이션 적용 (스키마 변경 시에는 `migrate dev` 사용)
npx prisma db seed          # 샘플 데이터(계정 3종 + 예시 품목) 생성
npm run dev                 # http://localhost:3000
```

### 테스트 계정 (시드 데이터 기준)

| 아이디 | 비밀번호 | 역할 |
| --- | --- | --- |
| `admin` | `admin1234` | 관리자 |
| `staff1` | `staff1234` | 담당자 |
| `viewer1` | `viewer1234` | 조회자 |

### 환경변수 (`.env`, `.env.example` 참고)

Supabase는 연결 풀러(pgbouncer)를 앞단에 두므로, 런타임용 풀링 연결(`DATABASE_URL`)과 마이그레이션용 다이렉트 연결(`DIRECT_URL`)을 분리해서 지정합니다. Project Settings → Database에서 두 URL을 확인할 수 있습니다.

```
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
SESSION_SECRET="<openssl rand -base64 32 등으로 생성한 랜덤 문자열>"
```

> **주의**: 대시보드의 "Direct connection" 문자열(`db.<project-ref>.supabase.co:5432`)은 IPv6 전용이라 IPv4 전용 네트워크에서는 연결이 안 될 수 있습니다(`P1001: Can't reach database server`). 이 경우 `DIRECT_URL`도 위처럼 Session Pooler 호스트(`aws-0-<region>.pooler.supabase.com`)의 5432번 포트를 사용하세요. 비밀번호에 `! @ # $` 등 URL 예약 문자가 있으면 반드시 percent-encoding(`encodeURIComponent`)해야 합니다.

## 주요 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 (webpack — 아래 알려진 이슈 참고) |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | 원가계산 엔진 단위 테스트 실행 |
| `npm run lint` | ESLint 검사 |
| `npx prisma studio` | DB 데이터 GUI로 확인 |
| `npx prisma migrate dev` | 스키마 변경 시 마이그레이션 생성/적용 |

## 핵심 기능

1. **원가 마스터 관리**: 원물/자재(수율·보존율 반영), 노무비(공정별 시간당 임금), 제조간접비/외주가공비 배부율
2. **품목 관리**: 배합비(BOM)·혼합비율 구성, 포장비, 공정 사용 내역 — 배합비 합계 검증 포함
3. **제안요청 관리**: 업체/담당자/품목/요청수량 등록
4. **원가 계산 → 제안단가 산출 → 승인 → 발송**: `src/lib/costEngine.ts`의 계산 로직을 기반으로 재료비·노무비·제조간접비·포장비·외주가공비를 합산하고, 마진율/마진액 방식의 제안단가(세전/세후)와 결정 소매가 대비 차액을 산출. 관리자 승인 후 발송 처리
5. **문서 출력**: 확정된 제안단가를 PDF 제안서 / 엑셀 견적서로 다운로드
6. **산출 이력 조회**: 업체/기간 검색, 변경 전/후 이력(HistoryLog) 조회
7. **사용자/권한 관리**: 관리자만 접근, 계정 생성/역할 변경/비밀번호 재설정

## 프로젝트 구조

```
prisma/                      # 스키마, 마이그레이션, 시드 스크립트
src/
  lib/
    costEngine.ts            # 원가/마진/부가세 계산 순수 함수 (+ costEngine.test.ts)
    auth/                    # 세션(JWT), DAL(requireSession/requireRole), 역할 정의
    prisma.ts, history.ts, documents.ts, pdf.ts
  proxy.ts                   # 라우트 보호(구 middleware)
  app/
    login/                   # 로그인 화면 + Server Action
    (dashboard)/             # 인증 필요 화면 그룹 (사이드바 레이아웃)
      dashboard/  materials/  products/  proposals/  history/  users/
    api/proposals/[id]/{pdf,excel}/route.ts   # 문서 다운로드 API
```

## 원가 계산 로직 요약

```
원물중량 = 구매중량 × 수율
100g당원가 = 원물원가 ÷ 원물중량 × 100
실사용중량 = 목표패키지중량 × 배합비 × 혼합비율
재료비 = Σ(실사용중량 × 100g당원가 ÷ 100)
노무비 = Σ(작업시간 × 시간당임금)
제조간접비 = (재료비 또는 노무비) × 배부율
제조원가 = 재료비 + 노무비 + 제조간접비 + 포장비
총원가 = 제조원가 + 외주가공비

제안단가(세전) = 총원가 × (1 + 마진율)   또는   총원가 + 마진액
제안단가(세후) = 제안단가(세전) × (1 + 부가세율)
차액 = 결정소매가 - 제안단가(세후)
```

자세한 구현과 검증은 `src/lib/costEngine.ts` / `src/lib/costEngine.test.ts` 참고.

## 알려진 이슈 / TODO

### 배포 전 반드시 처리해야 할 것

- **PDF 생성이 Vercel에서 그대로 동작하지 않음**: `src/lib/pdf.ts`는 로컬에 설치된 Edge/Chrome 실행 파일 경로(`msedge.exe` 등)를 찾아 `puppeteer-core`로 구동합니다. Vercel 서버리스 함수에는 브라우저가 없으므로, 배포 전 [`@sparticuz/chromium`](https://github.com/Sparticuz/chromium) + `puppeteer-core` 조합(서버리스용 경량 Chromium 바이너리)으로 교체해야 합니다. 엑셀 출력(exceljs)은 브라우저에 의존하지 않으므로 영향 없음.
- **시드 계정 비밀번호가 데모용으로 단순함** (`admin1234` 등): 실제 운영 DB에 그대로 시드하지 말고, 운영 배포 시 관리자 비밀번호를 재설정하거나 시드 스크립트를 운영용으로 분리하세요.
- Vercel 배포 시 `DATABASE_URL`(풀링)/`DIRECT_URL`(다이렉트)/`SESSION_SECRET` 환경변수를 프로젝트에 등록해야 합니다.

### 기능적으로 미흡한 부분

- **반응형 UI 미세 조정 미완료**: 기본 반응형 CSS(`globals.css`)만 적용되어 있고, 태블릿 폭 기준 실사용 테스트(표 가로 스크롤, 사이드바 접힘 등)는 하지 않았습니다. 스펙의 "PC·태블릿 반응형 지원" 요구사항 대비 추가 점검이 필요합니다.
- **자동화된 E2E 테스트 없음**: 원가계산 엔진은 Vitest 단위테스트로, 나머지 화면/플로우는 이번 개발 과정에서 curl 기반 API 테스트와 1회 수동 브라우저 테스트로 검증했습니다. 회귀 방지를 위한 Playwright 등 E2E 테스트 스위트는 아직 없습니다.

### 참고 사항 (차단 요소 아님)

- 현재 개발 환경(exFAT로 포맷된 외장 드라이브, `E:` 드라이브)에서는 Node.js `fs.readlink`가 일반 파일에도 `EISDIR` 오류를 반환하는 파일시스템 이슈로 이 머신에서 `next build`가 실패합니다. `next dev`는 정상 동작하며, GitHub Actions CI(Ubuntu/ext4)와 Vercel(Linux)에서는 문제없이 빌드됨을 확인했습니다.
- 인증/RBAC, 원가계산 → 제안단가 산출 → 승인 → 발송 전체 플로우, PDF/엑셀 출력, 역할별 접근 제어, 마이그레이션은 실제 Supabase(PostgreSQL) 연결 기준으로 검증 완료.
