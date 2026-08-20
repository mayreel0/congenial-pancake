---
title: RxJS 개요와 Nest.js에서의 위치
date: 2026-08-21
status: reference
scope: RxJS가 apps/api에서 강제되는 범위, 실제로 언제 필요한지
---

# RxJS 개요

## RxJS란

RxJS는 **비동기 이벤트 스트림을 다루는 라이브러리**다. 핵심 개념은 `Observable`(시간에 따라 여러 값을 방출할 수 있는 스트림)과 그 위에서 값을 가공하는 연산자(`map`, `filter`, `debounceTime`, `retry`, `switchMap` 등)다. Promise가 "값 하나를 나중에 준다"라면, Observable은 "값을 여러 번, 취소 가능하게, 시간차를 두고 준다"에 가깝다.

## Nest.js와의 관계 — 강제인가?

`rxjs`는 `@nestjs/core`의 의존성이라 `package.json`엔 항상 있다(peer dependency). 하지만 **애플리케이션 코드에서 직접 RxJS 문법을 써야 하는 건 아니다.**

- 지금 `apps/api`에 작성된 코드(`SessionService`, `SessionsRepository`, `HealthController` 등)는 전부 `async/await`이고 `Observable`을 하나도 안 쓴다. 이렇게 계속 가도 문제없다.
- Nest 내부적으로는 인터셉터(`Interceptor`)의 `intercept()`가 `Observable`을 반환하도록 설계되어 있고, 컨트롤러 핸들러가 `Promise`를 반환하면 Nest가 알아서 Observable처럼 다뤄준다 — 즉 프레임워크 내부 배관에 RxJS가 있을 뿐, 우리가 그 배관을 직접 조립할 필요는 없다.

## RxJS가 실제로 필요해지는 경우

- **WebSocket 게이트웨이나 microservice 트랜스포트**(TCP, Redis, gRPC 등)를 쓸 때 — 메시지 스트림을 다루는 API가 RxJS 기반이다.
- **커스텀 인터셉터**에서 응답을 가공/재시도/타임아웃 처리할 때(`retry()`, `timeout()` 같은 연산자).
- **디바운스/스로틀이 필요한 스트림**(예: 검색어 입력 스트림) — 이건 보통 프론트엔드 쪽 관심사라 이 백엔드에서 나올 일은 적다.

이 프로젝트 규모(단일 REST API, 상시 구동 서버)에서는 당분간 이런 케이스가 없을 가능성이 높다. RxJS를 미리 공부해두기보다, 실제로 스트림/재시도/구독-취소가 필요한 기능이 나오면 그때 해당 연산자만 찾아보는 걸 권장한다.

## 관련 문서

- 백엔드 구조 전반: `apps/api/AGENTS.md`
