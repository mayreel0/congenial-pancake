# apps/api-server AWS 배포 (Phase 1) — 결정 기록 + 실행 로그

## 배경

지금까지 배포 인프라는 전부 "Deferred to Planning"으로 미뤄져 있었다(`2026-08-14-onseol-product-decisions.md`) — CI는 PR 제목 체크 하나뿐, Dockerfile/vercel.json 같은 배포 설정은 하나도 없었다. `apps/admin` 분리 당시(`2026-08-25-onseol-admin-app-split-decisions.md`)에도 "실제 배포 인프라는 전혀 없는 상태"였고 정적 export만 미리 켜둔 게 전부였다.

사용자가 "슬슬 배포 관련해서도 다루고 싶다"고 하면서 시작됨. 보유 인프라 확인 결과: 도메인(`onseol.com`, 가비아 등록) + Vercel 계정은 있고, 개인 서버(quartz 기반 `effective-doodle`)는 있지만 정적 사이트만 운영해본 경험이라 프로덕션 API 호스팅에는 안 쓰기로 함.

## 결정: 매니지드 플랫폼이 아니라 AWS VPS

Railway/Render 같은 매니지드 플랫폼을 먼저 추천했으나(git push 배포, TLS 자동, 운영 부담 적음), 사용자가 명시적으로 거절 — "AWS로 여러가지 해보고싶어서 예를들어 로드밸런서도 추가해서 스케일 업 스케일 아웃도 해보고싶고." 학습 목적이 명확해서 AWS 직접 구성으로 방향 전환.

`2026-08-21-onseol-backend-structure-decisions.md`에 있던 "백엔드는 개인 서버에서 상시 구동"이라는 예전 결정은 이 라운드로 대체됨 — 그 문서 작성 시점엔 실제 서버가 없었고, 지금은 AWS로 명확히 정해짐.

## 아키텍처 결정들

- **커스텀 VPC, NAT 게이트웨이 없음**: EC2를 프라이빗 서브넷+NAT 대신 퍼블릭 서브넷에 두고 보안그룹으로 ALB만 인바운드 허용 — NAT Gateway의 상시 비용(~$32/mo)을 개인 프로젝트에서 낼 이유가 없다고 판단. RDS만 프라이빗 서브넷(인터넷 라우트 없음).
- **EC2 접속은 SSM Session Manager만, SSH 키/22번 포트 없음** — 사용자가 "IAM 권한으로 하겠습니다"로 명시적 선택. 장기 자격증명이 인스턴스에 남지 않음.
- **RDS 마스터 비밀번호는 Terraform이 아니라 AWS(Secrets Manager)가 관리**(`manage_master_user_password = true`) — 로컬 state 파일(아직 S3 원격 백엔드 없음)에 비밀번호 평문이 남는 걸 피하려는 선택. EC2는 부팅 시 `aws secretsmanager get-secret-value`로 가져옴.
- **앱 시크릿(OAuth 클라이언트 등)은 SSM Parameter Store SecureString**, Terraform은 `CHANGE_ME` 플레이스홀더만 생성(`ignore_changes`로 이후 수동 값이 다음 apply에 안 덮어써지게 함) — 같은 이유로 실제 시크릿 값이 Terraform state에 안 남게.
- **Docker + ECR 사용** — 처음 계획엔 없었는데 사용자가 "배포를 위해 도커파일을 활용하거나 하지는 않습니까?"라고 직접 지적해서 반영. `.nvmrc`로 Node 24.14.0을 고정한 이 repo 특성상 EC2에 매번 nvm/pnpm 셋업하는 것보다 고정 런타임 이미지가 안정적이고, 나중에 ECS/Fargate로 넘어갈 발판도 됨.
- **관리자 서브도메인은 `admin`이 아니라 임의 문자열**(`rn929nney`) — `apps/admin/AGENTS.md`에 이미 있는 "추측 어려운 경로" 방침과 동일선상.
- **단계 분리**: Phase 1(EC2 1대 + ALB + RDS, 이번 라운드) → Phase 2(Auto Scaling Group, 미착수) — 한 번에 다 만들지 말고 나누자는 사용자 확인("쪼개서 가는게 이해가 쉽겠지").
- **관리 방식**: Terraform으로 작성하되 콘솔에서 직접 클릭하며 만들지는 않음 — "만들어진 리소스가 어떻게 생겼는지 정도만 확인해도 될 것 같습니다." 대신 로컬 state로 시작(S3 원격 백엔드는 나중에).

전체 리소스 정의는 `infra/terraform/`, 자세한 이유는 각 `.tf` 파일 주석과 `infra/terraform/README.md` 참고. `apps/api-server/Dockerfile`은 pnpm 워크스페이스(특히 `packages/shared`)를 포함하는 멀티스테이지 빌드 — 로컬에서 실제 빌드 + Postgres 컨테이너 붙여서 `/health` 200 확인 후에야 Terraform에 연결함.

## 실행 로그 (2026-09-01)

1. `terraform init` — 정상.
2. `terraform apply -target=aws_ecr_repository.api` 실행 시 `Error: No valid credential sources found` — AWS CLI 자격증명이 로컬에 없었음. IAM 사용자 생성(`AdministratorAccess`, 개인 학습 프로젝트라 세밀한 권한 분리는 나중으로) → 액세스 키 발급 → `aws configure`로 해결.
3. ECR 리포지토리 생성 성공 (`Apply complete! Resources: 1 added`).
4. 이미지 빌드 시도 중 `infra/terraform` 디렉토리에서 `docker build` 실행 → 빌드 컨텍스트/Dockerfile 경로가 다 어긋남. 원인: Dockerfile의 빌드 컨텍스트는 반드시 저장소 루트여야 함(`packages/shared`가 `apps/api-server` 바깥에 있어서 `COPY`하려면 그 경로가 컨텍스트 안에 있어야 함) — `-f apps/api-server/Dockerfile`은 Dockerfile *위치*만 지정할 뿐, 실제 범위는 마지막 `.`(컨텍스트)이 결정한다는 걸 명확히 함. 저장소 루트로 이동 후 재시도해서 해결.
5. `docker build --platform linux/amd64 ...` + `docker push` 완료.

## 남은 일

- `terraform apply`(전체) — VPC/ALB/RDS/EC2 생성, 아직 미실행.
- apply 후: SSM Parameter Store에 실제 OAuth 시크릿 값 채우기, 각 OAuth 프로바이더 콘솔에 프로덕션 redirect URI 등록.
- DB 마이그레이션(SSM 포트포워딩으로 프라이빗 RDS 접근 — `infra/terraform/README.md` 참고).
- `apps/web`/`apps/admin`의 Vercel 프로젝트 설정 + 커스텀 도메인 연결(이번 라운드 스코프 밖, 이 AWS 스택과 별개).
- Phase 2: Auto Scaling Group.
- (아이디어 단계, 미스코프) 개인 서버(`effective-doodle`)에 상태 페이지/Swagger/Storybook 호스팅.
