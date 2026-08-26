# 온설 OpenAPI/Swagger 도입 결정 기록

## 배경

사용자가 Swagger를 활용해 OpenAPI 문서를 추가해달라고 요청했다. 확인이 필요한 지점 두 가지를 먼저 물었다.

## 결정 1: NestJS CLI 플러그인으로 DTO를 자동 추론한다

`apps/api-server`엔 이미 DTO가 많다(`CreateRequestDto`, `AdminRequestResponseDto` 등). 매 필드에 `@ApiProperty()`를 손으로 붙이는 대신, `nest-cli.json`의 `compilerOptions.plugins`에 `"@nestjs/swagger"`를 추가해 빌드 시 TS 타입 + `class-validator` 데코레이터(`@IsString()`, `@MinLength()` 등)에서 OpenAPI 스키마를 자동 추론하게 했다. 보일러플레이트 증가보다 추론 품질을 우선한다는 사용자 확인에 따른 결정.

실제로 잘 추론되는지 실측 확인: `CreateRequestDto`(`@MinLength(1) @MaxLength(500) body: string`)가 별도 데코레이터 없이 `{"type":"object","properties":{"body":{"type":"string","minLength":1,"maxLength":500}}}`로 정확히 변환됨을 curl로 확인했고, `SignupDto`의 `email` 필드는 Swagger UI에서 `user@example.com` 형태의 예시값까지 자동 생성됨을 눈으로 확인했다.

각 컨트롤러엔 `@ApiTags('...')`만 수동으로 붙였다 — 이건 플러그인이 자동으로 못 채워주는 부분이고(그룹핑용 태그는 의도/네이밍이 필요해 추론 대상이 아님), 8개 컨트롤러뿐이라 부담이 적었다.

## 결정 2: 프로덕션에서도 계속 열어두되, 추측 어려운 경로로 — 서브도메인 분리는 배포 인프라 결정 후로 미룬다

사용자는 처음에 "admin처럼 추측하기 힘든 도메인에 따로 여는 게 좋겠다"고 답했는데, 확인해보니 진짜 별도 서브도메인(DNS 레벨)을 의미했다. 하지만 이 프로젝트엔 아직 배포 인프라가 전혀 없다(Docker, 리버스 프록시, DNS 관리 등 전부 미정 — `apps/web`/`apps/admin`/`apps/api-server` 전부 로컬 개발 상태). 진짜 서브도메인 분리는 실제 호스팅이 정해져야 의미가 있는 결정이라, 이 사실을 알리고 다시 물어본 결과 "일단 보류 — 배포 결정 후 진행"으로 확정했다.

처음엔 `SwaggerModule`을 `SWAGGER_DOCS_PATH` 환경변수(무작위 문자열 포함 경로, `/docs`/`/api-docs`/`/swagger` 같은 흔한 경로가 아님)로 메인 API 위에 마운트하는 것으로 임시 운영했다.

## 추가 결정 (후속): 경로 대신 별도 포트로 — "다른 포트로 열 수 없냐"는 질문에 대한 답

사용자가 이후 "swagger를 다른 포트로 열 수는 없냐"고 물었다. 실제로 가능했고, 오히려 이게 `apps/admin`이 별도 포트를 쓰는 것과 정확히 같은 패턴이라 더 일관성 있는 선택이었다 — 포트 자체가 분리되면 굳이 경로까지 무작위 문자열일 필요가 없어서, `SWAGGER_DOCS_PATH`(경로)를 없애고 `SWAGGER_PORT`(기본값 8081)로 교체, 경로는 단순 `/`로 되돌렸다.

구현 방식: `@nestjs/swagger` v11은 `swagger-ui-express`가 아니라 `swagger-ui-dist`(정적 자산만)를 내부적으로 쓰고, `SwaggerModule.setup(path, app, document)`는 `INestApplication` 인스턴스가 필요해서 순수 Express 서버로 대체할 수 없었다. 대신 컨트롤러/프로바이더가 전혀 없는 빈 Nest 모듈(`SwaggerDocsModule`)을 하나 더 만들어 `NestFactory.create()`로 별도 앱 인스턴스를 띄우고, 거기에 (실제 앱에서 생성한) 같은 `openApiDocument` 객체를 `SwaggerModule.setup('', swaggerApp, openApiDocument)`로 얹은 뒤 `SWAGGER_PORT`로 `listen()`했다 — `AppModule`을 통째로 다시 부트스트랩하지 않아 DB 커넥션 풀 등이 중복되지 않는다.

호스트-헤더 기반 게이팅(같은 포트, DNS만 다르게)이나 진짜 서브도메인 분리는 여전히 실제 배포 인프라가 정해진 뒤의 이야기 — 지금은 "같은 프로세스, 다른 포트"가 인프라 없이 당장 달성 가능한 가장 가까운 형태다.

## 산출물

- `apps/api-server`: `@nestjs/swagger` 의존성 추가, `nest-cli.json`에 플러그인 등록, `src/config/env.schema.ts`에 `SWAGGER_PORT` 필드(`SWAGGER_DOCS_PATH`를 대체), `src/main.ts`에 `DocumentBuilder` + 별도 포트로 뜨는 빈 `SwaggerDocsModule`, 8개 컨트롤러 전부에 `@ApiTags(...)`.
- `pnpm-workspace.yaml`: `@nestjs/swagger`가 전이 의존성으로 끌고 온 `@scarf/scarf`(익명 텔레메트리 핑거) 빌드 스크립트를 명시적으로 차단(`allowBuilds: { '@scarf/scarf': false }`) — pnpm이 승인 안 된 빌드 스크립트를 만나면 placeholder를 자동 추가하고 비대화형 설치를 막는데, 그 placeholder를 실제 값으로 채운 것.

## 검증

- `pnpm --filter api-server lint/typecheck/test(56)/build` 모두 통과.
- 실제 서버 기동 후 curl로: 메인 API 포트(8080)에선 `/`, `/api-reference-x7k2m9`, `/docs` 전부 404 — 문서가 전혀 안 남아있음을 확인. 별도 포트(8081)의 `/`는 200.
- `8081/-json`(OpenAPI 스펙)에서 24개 경로, `CreateRequestDto` 등 실제 스키마가 클래스 데코레이터 그대로 반영됨을 확인.
- Chrome에서 8081 포트의 Swagger UI 실제 렌더링 확인 — 태그별 그룹핑(auth/health/...) 그대로 유지.
