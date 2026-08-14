# pnpm minimumReleaseAge로 공식 latest 보일러플레이트 설치가 막힌 기록

날짜: 2026-08-15 KST
브랜치: `codex/onseol-next-boilerplate`
작업 단계: Next.js 보일러플레이트 생성

## 맥락

프론트엔드 보일러플레이트는 다음 기준으로 만들기로 결정했다.

- Node.js 22 이상 사용
- 패키지 매니저는 pnpm 사용
- `corepack use pnpm@latest-11`로 프로젝트의 pnpm 버전 고정
- Next.js, React, Tailwind CSS는 공식 문서 기준 `latest` 해석 사용
- 실제 해석된 정확한 버전은 `pnpm-lock.yaml`에 기록

작업 머신의 Node.js 버전은 `v24.14.0`이었다.

## 발생한 일

`create-next-app`은 repository worktree 루트에 바로 실행할 수 없었다.
이미 다음 tracked 파일이 있어서 충돌 가능성이 있다고 판단했기 때문이다.

- `AGENTS.md`
- `README.md`

기존 프로젝트 파일을 삭제하지 않으면서 공식 템플릿 산출물을 보존하기 위해, 임시 lowercase 디렉터리에 공식 템플릿을 생성한 뒤 필요한 보일러플레이트 파일만 worktree로 복사했다.

임시 템플릿 생성은 성공했고 주요 버전은 다음처럼 해석됐다.

- `next@16.3.1`
- `react@19.2.8`
- `react-dom@19.2.8`
- `tailwindcss@4.3.3`
- `@tailwindcss/postcss@4.3.3`
- `eslint-config-next@16.3.1`
- `typescript@5.9.3`

이후 `corepack use pnpm@latest-11`을 실행하자 `pnpm@11.21.0`이 설치되고 lockfile 검증/install이 진행됐다.
이 단계에서 다음 에러로 실패했다.

```text
ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION
```

pnpm은 lockfile의 13개 항목이 기본 minimum release age 기준을 통과하지 못했다고 판단했다.

## 원인

pnpm 11에는 너무 최근에 배포된 패키지 설치를 막는 supply-chain 보호 정책이 있다.
현재 정책은 사실상 패키지가 배포된 뒤 최소 24시간이 지나야 설치를 허용한다.
공식 `latest` 기준으로 Next.js를 해석했더니 매우 최근에 배포된 패키지가 선택됐다.

실패 메시지에서 확인한 주요 항목은 다음과 같다.

- `next@16.3.1`, 배포 시각 `2026-08-13T22:34:40Z`
- `eslint-config-next@16.3.1`, 배포 시각 `2026-08-13T22:34:10Z`
- `@next/*@16.3.1` 계열 패키지, 배포 시각 대략 `2026-08-13T22:32Z`
- `electron-to-chromium@1.5.406`, 배포 시각 `2026-08-14T02:02:44Z`

실패를 확인한 시각은 다음과 같다.

- UTC: `2026-08-14T16:11:26Z`
- KST: `2026-08-15 01:11:26 KST`

가장 늦게 mature 되는 항목은 `electron-to-chromium@1.5.406`이었다.
24시간 기준으로 mature 되는 시각은 다음과 같다.

- UTC: `2026-08-15T02:02:44Z`
- KST: `2026-08-15 11:02:44 KST`

관측 시각 기준 예상 대기 시간은 약 9시간 51분이었다.

## 선택지

### 선택지 A: 패키지가 mature 될 때까지 기다린다

처음 추천했던 기본 선택지다.

이 방식은 다음 두 결정을 모두 지킨다.

- 공식 문서 기준 `latest` 해석을 사용한다.
- pnpm 11의 supply-chain 보호 정책을 유지한다.

예상 재시도 시각:

- `2026-08-15 11:03 KST` 이후

주의점:

- 이후 다시 `latest`를 해석할 때 더 새로운 transitive package가 잡히면 같은 정책에 다시 걸릴 수 있다.
- 그 경우 새 실패 메시지에서 가장 늦은 publish timestamp를 다시 확인해야 한다.

### 선택지 B: `minimumReleaseAgeExclude`로 임시 예외 처리한다

사용자가 선택한 진행 방식이다.

이번 보일러플레이트 생성을 계속 진행하기 위해, maturity 정책에 걸린 패키지 계열만 좁게 예외 처리한다.
예외 후보는 다음과 같다.

- `next`
- `eslint-config-next`
- `@next/*`
- `electron-to-chromium`

이 방식은 지금 바로 보일러플레이트 PR을 진행할 수 있게 한다.
대신 pnpm 11의 release-age 보호를 일부 완화한다.

나중에 패키지가 mature 된 뒤에는 `minimumReleaseAgeExclude`를 제거할 수 있다.
제거 절차는 다음처럼 생각한다.

1. `pnpm-workspace.yaml`에서 `minimumReleaseAgeExclude` 항목을 제거한다.
2. `pnpm install`을 다시 실행한다.
3. lockfile과 install 검증이 통과하는지 확인한다.
4. 통과하면 예외 제거 커밋을 별도로 남긴다.

### 선택지 C: mature 된 이전 버전을 명시한다

기다리지 않고 진행할 수는 있지만, 현재의 "공식 문서 기준 latest 해석" 결정과 충돌한다.
사용자가 별도로 버전 정책을 바꾸기 전에는 선택하지 않는다.

## 현재 결정

이번 작업에서는 선택지 B를 사용한다.
즉, `minimumReleaseAgeExclude`로 좁은 예외를 추가하고 보일러플레이트 생성을 계속 진행한다.

단, 이 예외는 영구 정책이 아니라 bootstrap 단계의 임시 예외로 기록한다.
패키지가 mature 된 뒤 제거할 수 있는지 다시 확인한다.

## 후속 pnpm 11 build script 승인 이슈

`minimumReleaseAgeExclude`를 추가한 뒤 `pnpm install`을 다시 실행하자 release-age 검증은 통과했다.
하지만 다음 에러가 추가로 발생했다.

```text
ERR_PNPM_IGNORED_BUILDS
Ignored build scripts: unrs-resolver@1.12.2
```

pnpm 11은 install 중 실행되는 dependency build script도 명시적으로 승인하도록 요구한다.
`unrs-resolver`는 ESLint resolver 계열에서 사용하는 native dependency로, 보일러플레이트의 lint 검증에 필요한 dependency graph에 포함됐다.

처리는 `pnpm-workspace.yaml`에 다음처럼 좁게 기록한다.

```yaml
allowBuilds:
  unrs-resolver: true
ignoredBuiltDependencies:
  - sharp
```

`sharp`는 현재 보일러플레이트의 직접 기능에 필요하지 않으므로 generated 설정대로 ignored 상태를 유지한다.
`unrs-resolver`만 build 허용한다.

## 관련 명령

임시 템플릿 생성에 성공한 명령:

```bash
pnpm create next-app@latest /private/tmp/onseol-next-template-sip2qa --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm
```

실패한 명령:

```bash
corepack use pnpm@latest-11
```

진단에 사용한 명령:

```bash
node --version
corepack --version
pnpm config list
date -u '+%Y-%m-%dT%H:%M:%SZ'
date '+%Y-%m-%d %H:%M:%S %Z'
```

## 교훈

pnpm 11과 공식 `latest` dependency resolution을 함께 사용하면, 공식 release라도 너무 최근에 배포된 패키지는 설치가 막힐 수 있다.
앞으로 보일러플레이트나 dependency update를 할 때는 `latest`가 곧바로 설치 가능하다고 가정하지 말고, pnpm의 release-age 정책을 함께 확인한다.
