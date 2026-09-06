# class-validator → zod(nestjs-zod) 전면 마이그레이션 + 프론트 타입 공유

## 배경

api/web 공유 util 조사(같은 날 `2026-09-01-onseol-shared-package-spike-decisions.md`) 중 사용자가 "class-validator가 데코레이터 기반인지, NestJS가 꼭 그걸 써야 하는 건 아닌지, zod로 마이그레이션하면 백엔드/프론트 DTO·타입을 공통으로 뺄 수 있는지"를 물었다. 답: class-validator는 NestJS의 기본 선택일 뿐 강제 사항이 아니고, zod는 `z.infer`로 스키마에서 타입을 직접 뽑아내므로 검증 로직과 타입을 동시에 공유할 수 있어 — 실제로 응답 타입(`RequestResponseDto` 등)이 백엔드/프론트에 손으로 두 번 정의돼 있던 문제(직전 스파이크에서 발견)를 해결하는 데 정확히 맞는 도구.

사용자가 "새 DTO부터 zod로 시작"보다 "전면 마이그레이션 먼저, 그다음 새 DTO"를 제안. 다만 (1) 검증 엔진 교체(보안 민감 auth DTO 포함)와 (2) 프론트 폼 검증 추가는 위험 성격이 달라서 한 라운드에 묶지 말고 나누자고 역제안 → 사용자 승인("네 좋아요 진행해주세요"). 이번 라운드는 (1)만 — 프론트 폼 검증(2)은 별도 라운드로 남김.

## 결정: nestjs-zod

`class-validator` 데코레이터 클래스를 순수 `type` + zod 스키마로 바꾸면, 이 프로젝트가 `@ApiProperty()` 없이 순수하게 클래스 정적 분석(`@nestjs/swagger` CLI 플러그인)에 의존해온 Swagger 자동 문서화가 깨진다(실제로 사용자가 Swagger를 켜보고 "스키마가 10개밖에 없다"고 지적한 것도 이 문제의 증상 — 21개 DTO 중 class-validator 클래스인 10개만 인식되고 나머지 순수 `type` 11개는 애초에 안 보였음). `nestjs-zod`(2026-07 기준 활발히 관리 중, NestJS 11/zod 4 호환 확인)의 `createZodDto()`가 zod 스키마를 진짜 클래스로 감싸줘서 이 문제를 해결.

## 아키텍처

- **`packages/shared/src/dto.ts`** — 모든 요청/응답 zod 스키마가 이 파일 하나에. 처음엔 `dto/author.ts`, `dto/requests.ts` 등으로 나눴다가 되돌림 — 같은 패키지 안에서 파일 간 import를 하면 `apps/api-server`의 Node 네이티브 TS strip(빌드 없음, 상대경로 import를 해석 못 함)과 `ts-jest`(패키지 이름으로 자기 자신을 참조하면 `TS2209: ambiguous project root`) 양쪽에서 서로 다른 이유로 깨짐. 파일 하나, 내부 import 없음으로 양쪽 다 회피.
- **응답 스키마의 날짜 필드는 전부 `z.string()`, `z.date()` 아님.** `createZodDto()`가 스키마의 *출력* 타입 기준으로 클래스 필드 타입을 정하기 때문에 `z.date()`를 쓰면 매퍼가 실제로 `Date`를 반환해야 하는데, 진짜 HTTP로 나가는 값은 문자열이라 타입이 어긋남. 각 매퍼가 `.toISOString()`(nullable이면 `?.toISOString() ?? null`)을 직접 호출 — 스키마 레벨 `.transform()` 대신 명시적으로.
- **`packages/shared/package.json`에 `"type": "module"`을 넣지 말 것.** Node의 `[MODULE_TYPELESS_PACKAGE_JSON]` 경고를 없애려고 한 번 넣었다가 `ts-jest`가 이 패키지 파일을 아예 트랜스파일 안 하게 돼서(`SyntaxError: Cannot use import statement outside a module`) 되돌림. 경고는 무해하니 그냥 둠.
- 요청 검증: `apps/api-server/src/common/zod-validation.ts`의 `ZodValidationPipe`(`nestjs-zod`의 `createZodValidationPipe`) — 실패 시 `BadRequestException(messages: string[])`을 던지도록 커스텀 `createValidationException`을 넣어서 기존 class-validator `ValidationPipe`와 정확히 같은 응답 모양을 유지 → `common/filters/app-exception.filter.ts`는 전혀 수정 안 해도 됨. `app.module.ts`에 `APP_PIPE`/`APP_INTERCEPTOR`(`ZodSerializerInterceptor`)로 전역 등록, `main.ts`의 기존 `app.useGlobalPipes(new ValidationPipe(...))`는 제거.
- 모든 요청 스키마에 `.strict()` — 기존 `forbidNonWhitelisted: true`와 동일하게 미선언 필드는 400(`"Unrecognized key: ..."`).
- 응답 DTO는 단일 객체를 반환하는 라우트에만 `@ZodResponse({ type: XDto })`를 붙임(실제 직렬화 + Swagger 노출 둘 다 이걸로 됨) — `PaginatedDto<T>` 페이지네이션 엔벨로프를 감싸는 라우트(`/requests/feed`, `/requests/mine`, `/replies/mine`, `/users/.../requests`, `/users/.../replies`)와 `/admin/moderation/hidden`(request+reply 합성 객체)은 의도적으로 제외 — 타입 공유 자체는 되지만 Swagger/런타임 이중검증 계층은 없음. 범용 엔벨로프를 zod로 감싸는 건 이번 라운드 범위 밖으로 명시적으로 미룸.
- `apps/api-server/src/openapi.ts`: `DocumentBuilder`에 `.addServer(API_PUBLIC_URL)` 추가(Swagger UI "Try it out"이 문서 전용 프로세스 자신이 아니라 실제 API로 요청을 보내게) + `cleanupOpenApiDoc()`으로 문서 후처리(zod DTO 스키마 포함 문서에 필수). `.env.example`의 `CORS_ORIGIN`에 `http://localhost:8081`(Swagger 포트) 추가 — 문서 페이지에서 실제 API로 크로스오리진 요청이 가능하도록. 두 실행 모드(`start:swagger`만 vs `start:swagger`+`start:dev` 동시)는 그대로 유지, 후자일 때만 "Try it out"이 실제로 동작.
- `apps/admin`이 이번에 처음으로 `packages/shared`를 사용 — admin 전용 응답 DTO(`AdminRequestResponseDto`, `AdminReplyResponseDto`, `SettingsResponseDto`)도 공유 스키마로 옮기면서 admin의 손중복 타입을 `shared/dto`의 `import type`으로 교체.
- `apps/web`도 요청/응답 타입을 `shared/dto`에서 `import type`으로 가져옴(zod 런타임 값이 아니라 타입만 — 프론트 번들에 zod가 안 실림, 실제로 빌드 산출물에서 grep으로 확인함). `packages/api`의 `CurrentUser`는 필드가 `UserResponseDto`와 정확히 같아서 그 타입으로 통합.

## 전환된 DTO 21개

**요청 검증(10)**: signup, login, reset-password, update-nickname, update-profile-visibility, create-request, create-reply, create-report, update-settings, issue-password-reset-link.

**응답(11)**: request-response, my-request-log-entry, feed-item(+authorSlot 확장은 `.extend()`로 합성), reply-response, my-answer-log-entry, user-response, settings, public-profile(3종: profile/request-item/reply-item), admin-request, admin-reply.

## 작업 방식

핵심 패턴(요청 검증 + 응답 직렬화 + Swagger 노출 + 프론트 타입 공유)을 `requests`/`replies` 모듈에서 직접 실제 curl 테스트까지 포함해 완전히 검증한 뒤(위 세 가지 툴체인 함정을 이 단계에서 발견/해결), 나머지 19개는 포크에 위임 — 정확히 같은 패턴을 그대로 따르도록 이미 검증된 파일들을 템플릿으로 지정. 포크가 자기 워크트리에서 기반 코드를 (내 커밋 전이라 안 보여서) 지시문만 보고 재구성했는데, diff 결과 5개 기반 파일 + 이미 전환해둔 6개 파일 전부 내 실제 커밋과 바이트 단위로 동일 — 재구성이 정확했음을 확인 후 포크의 나머지 작업분만 내 브랜치에 그대로 반영.

## 검증

- `packages/shared`, `apps/api-server`, `apps/web`, `apps/admin` 전부 lint/typecheck/test/build 통과(api-server 158/158, web 124/124, admin 19/19).
- 실서버 curl(포크 + 별도로 나도 독립적으로 재확인): 이메일/비밀번호/닉네임/targetType/uuid 등 각 검증 규칙이 정확한 한국어 메시지로 400을 반환하는 것, `.strict()`가 미선언 필드를 거부하는 것, 정상 요청의 응답 모양(날짜가 문자열로, nullable 필드가 `null`로)이 맞는 것 확인.
- Swagger 문서: 스키마 10개 → 22개로 증가, `servers` 필드가 실제 API 주소를 가리키는 것 확인.
- 프론트 번들에 zod 런타임이 안 실리는 것을 빌드 산출물 grep으로 확인(`import type`만 쓴 효과).

## 남은 일 (다음 라운드, 아직 미착수)

- 프론트 폼 검증 추가 — 이번에 공유해둔 zod 스키마를 실제 폼(회원가입/로그인/닉네임 등)에 연결. 에러 메시지 타이밍(blur/submit/실시간) 같은 UX 결정이 필요해서 의도적으로 분리.
- "공유 검증 규칙(zod)" 백로그 항목이었던 닉네임 최대 20자 매직넘버 중복 문제는 이번 마이그레이션으로 자연히 해결됨(`updateNicknameSchema`의 `.max(20)`이 유일한 소스).
