# apps/web / apps/admin Vercel 배포

## 배경

`docs/decisions/2026-09-01-onseol-aws-deployment-phase1-decisions.md`가 `apps/api-server`의 AWS 배포를 다루는 동안, 같은 라운드에서 `apps/web`/`apps/admin`의 Vercel 배포도 병행 진행했는데 별도 기록이 없었다 — 이 문서로 채운다. Vercel 쪽 작업은 대시보드에서 직접 진행돼서 git 커밋으로 안 남기 때문에, 여기 기록해두지 않으면 아예 흔적이 없어짐.

## 결정

- `apps/web`, `apps/admin` 각각 별도 Vercel 프로젝트로 생성 — 모노레포라 프로젝트당 Root Directory를 다르게 설정해야 해서 하나로 합칠 수 없음.
- 두 프로젝트 다 **Production Branch를 `v1`으로 변경**. Vercel 기본값은 GitHub 저장소의 default branch(`main`)인데, 이 프로젝트의 실제 작업은 전부 `v1`으로 머지되므로(`main`은 무관한 히스토리 — `[[pr_base_branch_v1_not_main]]`) 반드시 바꿔야 함. 프로젝트 생성 화면 자체엔 브랜치 선택 옵션이 없어서, 일단 생성(이때 `main` 기준으로 최초 배포 1회 발생, 무시해도 됨) → Settings → Git → Production Branch 순서로 진행.
- 환경변수 `NEXT_PUBLIC_API_BASE_URL = https://api.onseol.com`를 두 프로젝트 모두에 설정 — **Secret/Sensitive 타입이 아니라 일반(Config/plaintext) 타입으로.** `NEXT_PUBLIC_` 접두사가 붙은 값은 Next.js가 빌드 시 클라이언트 번들에 그대로 박아 넣어 브라우저에서 누구나 볼 수 있으므로, Vercel의 Secret/Sensitive 옵션(대시보드에서 값을 다시 못 보게 숨기는 기능)을 써도 실질적인 보호 효과가 없고 나중에 값을 다시 확인 못 하는 불편함만 늘어남 — 진짜 시크릿에만 그 옵션을 쓴다.
- `next.config.ts`에 `NEXT_PUBLIC_*` 값을 별도로 등록할 필요 없음 — Next.js 컨벤션상 자동으로 클라이언트에 인라인됨.
- 관리자 서브도메인 값은 Vercel 대시보드의 도메인 설정 화면에만 입력 — 저장소에 커밋되는 어떤 파일에도 실제 값을 넣지 않음. 같은 이유로 이 라운드 중 발견된 문제: `infra/terraform/variables.tf`의 `admin_subdomain`을 처음에 `default`로 넣었다가 이 레포가 퍼블릭이라 그대로 노출됐던 걸 뒤늦게 발견 — `default` 제거하고 값도 교체함(자세한 내용은 AWS 배포 결정 문서 참고).

## 진행 상태 (2026-09-01)

- `apps/web`, `apps/admin` 둘 다 Vercel 배포 완료(기본 `*.vercel.app` 도메인으로 접근 가능), Production Branch `v1`, 환경변수 설정 완료.
- **아직 안 한 것**: 커스텀 도메인(`onseol.com`, 관리자 서브도메인) 연결 — Vercel이 도메인 추가 시 보여주는 A/CNAME 값을 Route 53에 반영하는 단계, 아직 시작 안 함. AWS API 배포(`terraform apply`)도 네임서버 전파 대기로 아직 안 끝남.
