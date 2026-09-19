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

PostgreSQL 데이터베이스가 필요합니다(로컬 설치, Docker, 또는 Neon/Supabase 등 무료 클라우드 Postgres).

```bash
cp .env.example .env        # DATABASE_URL, SESSION_SECRET 채우기
npm install
npx prisma migrate dev --name init   # 최초 실행 시 베이스라인 마이그레이션 생성
npx prisma db seed          # 샘플 데이터(계정 3종 + 예시 품목) 생성
npm run dev                 # http://localhost:3000
```

> 마이그레이션 이력이 아직 없는 상태입니다(스키마를 SQLite → PostgreSQL로 막 전환함). 실제 Postgres에 처음 연결할 때 위 `prisma migrate dev --name init` 명령으로 베이스라인 마이그레이션을 생성해 커밋해 주세요. 이후에는 `prisma migrate dev`(개발)/`prisma migrate deploy`(배포)를 사용합니다.

### 테스트 계정 (시드 데이터 기준)

| 아이디 | 비밀번호 | 역할 |
| --- | --- | --- |
| `admin` | `admin1234` | 관리자 |
| `staff1` | `staff1234` | 담당자 |
| `viewer1` | `viewer1234` | 조회자 |

### 환경변수 (`.env`, `.env.example` 참고)

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
SESSION_SECRET="<openssl rand -base64 32 등으로 생성한 랜덤 문자열>"
```

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

## 알려진 이슈

- 현재 개발 환경(exFAT로 포맷된 외장 드라이브)에서는 Node.js `fs.readlink`가 일반 파일에도 `EISDIR` 오류를 반환하는 파일시스템 이슈로 `next build`(프로덕션 빌드)가 실패합니다. `next dev`는 정상 동작하며 전체 기능은 개발 서버 기준으로 검증되었습니다. NTFS/Linux 환경(예: Vercel, GitHub Actions CI)에서는 빌드가 정상적으로 동작함을 CI에서 확인했습니다.
- 인증/RBAC, 원가계산 → 승인 → 발송 전체 플로우, PDF/엑셀 출력, 역할별 접근 제어는 실제 브라우저 및 API 테스트로 검증되었습니다(전환 전 SQLite 기준). PostgreSQL 전환 후 실제 DB 연결 기준 재검증이 필요합니다.
- Prisma 마이그레이션 이력이 없는 상태(SQLite용 초기 마이그레이션은 제거함)이므로, CI에서는 `prisma db push`로 스키마를 동기화합니다. 실제 개발 DB에 연결되면 `prisma migrate dev --name init`으로 베이스라인 마이그레이션을 생성해 커밋하고, CI도 `prisma migrate deploy`로 되돌려야 합니다.
