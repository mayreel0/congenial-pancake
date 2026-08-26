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

## 추가 결정 (후속): docs 전용 엔트리포인트 — "스웨거만 켜는 명령어는 없냐"는 질문에 대한 답

`main.ts`는 여전히 real API(`PORT`)와 Swagger(`SWAGGER_PORT`)를 한 프로세스에서 같이 띄운다. 사용자가 "스웨거만 켤 수 있는 명령어"를 물어서, 별도 엔트리포인트 `src/swagger-only.ts`를 추가했다 — `AppModule`은 (실제 컨트롤러/DTO를 스캔해 문서를 만들어야 하니) 여전히 인스턴스화하지만, `app.listen(PORT)`를 호출하지 않아 그 프로세스에서는 실제 API가 아예 리스닝되지 않는다. `DocumentBuilder` 설정과 빈 `SwaggerDocsModule`은 `src/openapi.ts`로 뽑아서 `main.ts`/`swagger-only.ts` 둘 다 재사용한다(정의가 두 곳에 중복되지 않도록).

`pnpm --filter api-server start:swagger`(또는 `start:swagger:watch`)로 실행한다. `.env`는 여전히 필요하지만(`AppModule` 인스턴스화 자체엔 유효한 `DATABASE_URL` 형식이 필요) 실제로 DB 쿼리는 한 번도 안 나간다.

## 추가 결정 (후속): 서버를 평소대로 켤 땐 Swagger가 아예 안 열리게 — "서버 열었을 때 스웨거는 안 열리게 할 수 없냐"는 질문에 대한 답

바로 앞 결정까지도 `main.ts`(즉 평소 쓰는 `start`/`start:dev`)는 여전히 real API와 Swagger를 한 프로세스에서 같이 띄우고 있었다 — `start:swagger`는 어디까지나 "추가 옵션"이었지, 평소 서버 실행에서 Swagger를 빼는 방법은 아니었다. 사용자가 이 지점을 정확히 짚어서, `main.ts`에서 Swagger 관련 코드를 전부 제거했다 — 이제 `pnpm --filter api-server start:dev`를 실행하면 `SWAGGER_PORT`는 아예 열리지 않는다(연결 자체가 거부됨, 404가 아니라). Swagger가 필요하면 `start:swagger`를 **별도 프로세스로** 따로 켜야 한다 — 두 프로세스는 완전히 독립적이라 동시에 켜도(각자 다른 포트) 안 켜도 문제없다.

이걸로 이번 라운드에서 세 번 연속 같은 방향(문서가 메인 API에서 점점 더 멀어지는 방향)으로 조정됐다: 메인 포트 위의 무작위 경로 → 메인 프로세스 안의 별도 포트 → 완전히 별도 프로세스. 매번 "이전 버전을 보고 나서 다음 단계를 요청"하는 패턴이었다 — 결과적으로 최종 상태가 처음부터 명확했던 게 아니라 반복적으로 좁혀졌다는 점을 기록해둔다.

## 산출물

- `apps/api-server`: `@nestjs/swagger` 의존성 추가, `nest-cli.json`에 플러그인 등록, `src/config/env.schema.ts`에 `SWAGGER_PORT` 필드(`SWAGGER_DOCS_PATH`를 대체), `src/openapi.ts`(신규 — `buildOpenApiDocument()` 헬퍼 + 빈 `SwaggerDocsModule`), `src/main.ts`(최종적으로 Swagger 관련 코드 전부 제거 — real API만 부트스트랩), `src/swagger-only.ts`(신규 — docs 전용 엔트리포인트, 유일하게 Swagger를 띄우는 곳), `package.json`에 `start:swagger`/`start:swagger:watch` 스크립트, 8개 컨트롤러 전부에 `@ApiTags(...)`.
- `pnpm-workspace.yaml`: `@nestjs/swagger`가 전이 의존성으로 끌고 온 `@scarf/scarf`(익명 텔레메트리 핑거) 빌드 스크립트를 명시적으로 차단(`allowBuilds: { '@scarf/scarf': false }`) — pnpm이 승인 안 된 빌드 스크립트를 만나면 placeholder를 자동 추가하고 비대화형 설치를 막는데, 그 placeholder를 실제 값으로 채운 것.

## 검증

- `pnpm --filter api-server lint/typecheck/test(56)/build` 모두 통과.
- 실제 서버 기동 후 curl로: 메인 API 포트(8080)에선 `/`, `/api-reference-x7k2m9`, `/docs` 전부 404 — 문서가 전혀 안 남아있음을 확인. 별도 포트(8081)의 `/`는 200.
- `8081/-json`(OpenAPI 스펙)에서 24개 경로, `CreateRequestDto` 등 실제 스키마가 클래스 데코레이터 그대로 반영됨을 확인.
- `start:swagger` 실행 후 curl로: 8080은 connection refused(포트 자체가 안 열림), 8081만 200 — 진짜 "스웨거만" 켜졌음을 확인. Chrome에서도 8081 Swagger UI 정상 렌더링 확인.
- Chrome에서 8081 포트의 Swagger UI 실제 렌더링 확인 — 태그별 그룹핑(auth/health/...) 그대로 유지.
- **최종 상태 재확인**: `start:dev`만 실행했을 때 8080은 정상 응답, 8081은 connection refused(리스닝 자체를 안 함, 404가 아님)를 curl로 확인. 이어서 `start:swagger`를 별도로 같이 켜서 8080/8081 둘 다 동시에 정상 응답하는 것도 확인 — 두 프로세스가 서로 완전히 독립적임을 실증.
