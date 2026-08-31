# api/web 공유 util 정리 — packages/shared 스파이크

## 배경

사용자가 전반적인 리팩토링을 하고 싶다고 하면서 "api랑 web 쪽에 유사하게 사용되는 util 함수들도 많다"고 지적. 실제로 조사해보니 진짜 중복은 두 파일뿐이었음:

- `pagination.dto.ts`(백엔드)/`pagination.ts`(프론트): `PaginatedDto<T>` 타입 + `DEFAULT_PAGE_SIZE`/`PAGE_SIZE_OPTIONS` 상수 + `parsePageParam`/`parsePageSizeParam` — 거의 완전히 동일.
- `kst-date.ts`(양쪽): `isValidDateString`/`yesterdayKstDateString` 두 함수만 동일하고, 나머지(`kstDayRange`/`kstDateRange` vs `addDaysToDateString`/`formatKoreanDate`)는 각 앱 고유 관심사라 안 겹침.

비슷해 보이지만 실제로는 중복이 아닌 것들도 확인: `author-display.ts`(백엔드, DTO 생성)와 `author-label.ts`(프론트, DTO 소비)는 같은 기능의 양면일 뿐, `nickname-discriminator.ts`는 백엔드만 계산.

## 문제: apps/api-server는 packages/* 워크스페이스 패키지를 한 번도 쓴 적이 없다

`packages/ui`/`api`/`utils`는 전부 "빌드 없음" 패턴 — `package.json`의 `exports`가 `src/*.ts` 소스를 그대로 가리키고, 소비하는 Next.js 앱들이 `next.config.ts`의 `transpilePackages`로 자기 빌드 과정에서 직접 트랜스파일한다. 이 메커니즘은 **Next.js 번들러 전용 기능**이라, `tsc` 기반의 `nest build`가 똑같이 raw `.ts` 워크스페이스 패키지를 문제없이 소비할 수 있을지는 검증된 적이 없었음.

## 실험 및 결론: 된다 — Node의 네이티브 TS strip 덕분

`utils` 패키지를 `apps/api-server`에 임시로 의존성 추가하고 `nest build` → 컴파일된 `dist/*.js`가 `require("utils")`만 남기고(번들링 안 함, 그냥 Node의 일반적인 CJS 의존성 참조) → 이 저장소가 루트 `.nvmrc`로 고정한 Node 24.14.0에서 `node -e "require('utils')"`를 직접 실행해보니 **타입 스트리핑이 기본 활성화돼 있어서 raw `.ts` 파일을 별도 빌드 없이 바로 실행함**을 확인. `nest build`(타입체크만) + Node 런타임(strip만, 컴파일 없음) 조합이 정확히 Next.js의 `transpilePackages`가 하는 일과 같은 결과를 낸다 — 도구는 다르지만 "빌드 없는 워크스페이스 패키지" 패턴 자체는 그대로 유지 가능.

**제약**: erasable 문법만 써야 함(타입 애너테이션, interface, type-only import) — `enum`, `namespace`, 생성자 파라미터 프로퍼티 등은 Node의 strip이 처리 못 해서 `apps/api-server`에서 타입체크는 통과해도 런타임에 죽을 수 있음. `packages/shared`에 뭘 추가하든 이 제약을 지켜야 함.

## 산출물

- 신규 `packages/shared`(`pagination.ts`, `kst-date.ts` — 위에서 확인한 진짜 겹치는 부분만) — `packages/ui`/`utils`와 같은 "빌드 없음" 구조, `exports` 맵으로 파일별 export.
- `apps/api-server/src/common/pagination.dto.ts`, `kst-date.ts`와 `apps/web/app/lib/pagination.ts`, `kst-date.ts`는 전부 얇은 재export shim으로 변경 — 기존 import 경로(`../common/pagination.dto`, `../lib/kst-date` 등)는 전혀 안 건드림. 각 앱 고유 함수(`kstDayRange`/`kstDateRange`, `addDaysToDateString`/`formatKoreanDate`)는 그대로 로컬에 남김.
- `apps/api-server/package.json`에 `"shared": "workspace:*"` 추가, `apps/web/package.json`도 동일, `apps/web/next.config.ts`의 `transpilePackages`에 `"shared"` 추가(apps/api-server는 이 설정에 해당하는 게 없음 — Node가 알아서 처리).
- `packages/shared`는 자체 테스트를 두지 않음(`packages/ui`/`utils`와 같은 선례) — 기존 `apps/api-server/src/common/kst-date.spec.ts`/`pagination.dto.spec.ts`(Jest)와 `apps/web/app/lib/kst-date.test.ts`(Vitest)가 재export shim을 통해 그대로 검증.

## 부수적으로 발견/수정한 버그

`apps/web/app/read/ReadFeed.test.tsx`의 "browses by KST day" 테스트가 `yesterdayKstDateString()`(인자 없이 호출 시 실제 시스템 시각 사용)의 반환값과 fetch mock의 하드코딩된 날짜("2026-08-30")가 우연히 일치하는 것에 의존하고 있었음 — 이 스파이크 작업 중 실제 날짜가 2026-08-31→09-01로 넘어가면서 우연의 일치가 깨져 테스트가 실패함(리팩토링 자체와 무관, 잠재해있던 버그가 시간이 지나며 드러난 것). `vi.useFakeTimers()`로 시계를 고정하는 방식은 이 테스트가 쓰는 RTL의 비동기 폴링(`findByText`)과 충돌해 타임아웃을 일으켜서, 대신 테스트가 기대하는 날짜 자체를 `yesterdayKstDateString()`/`addDaysToDateString()`로 실행 시점에 동적으로 계산하도록 고쳐 근본적으로 시간에 안전하게 만듦.

## 검증

- `packages/shared` lint/typecheck 통과.
- `apps/api-server` lint/typecheck/test(158/158)/build 통과. 실서버(watch 모드로 이미 떠있던 dev 서버가 자동 재시작)에 curl로 `/requests/feed` 재확인 — 200 정상 응답.
- `apps/web` lint/typecheck/test(124/124, 날짜 취약성 수정 포함)/build 통과.
- `apps/admin` typecheck 통과(영향 없음 확인 — `shared` 의존성 자체를 추가 안 했음).
