# packages/ui 폴더 재구성 (components/hooks/providers)

## 배경

`useDismissOnOutsideClick`/`MoreMenu` 추출(PR #117) 이후, `packages/ui/src`에 컴포넌트 7개 + 훅 1개 + provider 1개가 flat하게 섞여 있는 상태가 됐다. 사용자가 "packages/ui 도 폴더구조 상세하게 해야겠다"고 요청.

## 결정

`src/`를 `components/`(React 컴포넌트 + `.stories.tsx`), `hooks/`(순수 훅), `providers/`(context provider — 현재 `QueryProvider` 하나)로 분리. `package.json`의 `exports` map은 서브패스 이름(`"./MoreMenu"` 등)을 그대로 유지하고 물리 경로만 갱신 — `apps/web`/`apps/admin`의 `import ... from "ui/X"` 구문은 전혀 안 바뀜.

**"필요해지기 전엔 구조 손대지 말자"는 이 프로젝트의 기존 원칙에 반하는 것 아닌가** — 처음엔 이 이유로 반대했으나 사용자가 정정: 종류별 폴더 분리는 `packages/ui`가 이미 "컴포넌트/훅/provider"를 별개 개념으로 문서화해온 것(`packages/ui/AGENTS.md`의 "What belongs here")을 물리 구조로 반영하는 것뿐이라, 아직 없는 유연성/추상화를 미리 만드는 게 아님 — `AdminRequestDto` 별칭이나 통합 Card 컴포넌트처럼 실제로 반대했던 "조기 추상화"와는 다른 종류의 결정. 상세 논거는 `[[organize_by_kind_not_speculative]]`(Claude 메모리).

## 아이콘(`icons.tsx`)

`MoreMenu`가 쓰던 kebab 아이콘을 처음엔 `icons/MoreIcon.tsx`(컴포넌트당 파일 하나, `components/`와 동일 패턴)로 분리했다가, 사용자가 "web에서처럼 icons.tsx에 다 넣고 export하면 안 되냐"고 재확인 요청 → 이 프로젝트의 "한 파일에 컴포넌트 여러 개 넣지 않기" 규칙을 근거로 처음엔 반대했으나, 재검토 후 정정: 그 규칙은 상태/로직을 가진 진짜 컴포넌트가 다른 파일 안에 숨는 걸 막기 위한 것(`ResetPasswordForm.tsx`에 컴포넌트가 숨어있던 실제 사고가 계기)인데, 아이콘은 `className`만 받는 순수 `<svg>` 마크업이라 숨을 복잡도 자체가 없음 — `apps/web/app/components/shared/icons.tsx`와 같은 모양(파일 하나에 아이콘 여러 개)으로 최종 결정. `apps/web`의 아이콘 세트 자체를 옮긴 건 아님 — `apps/admin`이 아이콘을 전혀 안 써서 지금은 공유할 이유가 없음(`packages/ui/AGENTS.md` "What belongs here" 규칙).

## 검증

`pnpm --filter ui/web/admin/storybook-app` lint/typecheck/test 전부 통과. 파일 이동뿐이라 렌더링 결과물 변화 없음(시각적 확인 대상 없음).

## 관련 PR

원래 스택은 #117 → #118 → #119였는데, #118/#119가 각자 base 브랜치(서로의 브랜치)로 머지되고 `v1`으로는 안 올라가는 문제가 있었음(스택 PR 각각이 자기 base로만 머지되고, 최종적으로 `v1`에 올리는 단계가 빠졌던 것) — `[[pr_splitting_default]]` 메모리에 기록된 대로, 이 내용을 `v1`에 실제로 반영하는 **PR #120**을 별도로 열어서 해결. `v1`에는 이 PR을 통해 반영됨.
