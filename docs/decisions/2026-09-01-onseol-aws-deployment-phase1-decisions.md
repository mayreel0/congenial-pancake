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
- **관리자 서브도메인은 `admin`이 아니라 임의 문자열** — `apps/admin/AGENTS.md`에 이미 있는 "추측 어려운 경로" 방침과 동일선상. 이 레포가 퍼블릭이라 실제 값은 어떤 커밋된 파일에도 넣지 않고 `terraform.tfvars`(gitignored)에만 둔다 — 처음엔 `variables.tf`의 `default`로 넣었다가 퍼블릭 레포에 그대로 노출된 걸 뒤늦게 발견해 되돌리고 값도 새로 교체함(git 히스토리에 남은 옛 값은 이미 노출된 것으로 간주, 재사용 안 함).
- **단계 분리**: Phase 1(EC2 1대 + ALB + RDS, 이번 라운드) → Phase 2(Auto Scaling Group, 미착수) — 한 번에 다 만들지 말고 나누자는 사용자 확인("쪼개서 가는게 이해가 쉽겠지").
- **관리 방식**: Terraform으로 작성하되 콘솔에서 직접 클릭하며 만들지는 않음 — "만들어진 리소스가 어떻게 생겼는지 정도만 확인해도 될 것 같습니다." 대신 로컬 state로 시작(S3 원격 백엔드는 나중에).

전체 리소스 정의는 `infra/terraform/`, 자세한 이유는 각 `.tf` 파일 주석과 `infra/terraform/README.md` 참고. `apps/api-server/Dockerfile`은 pnpm 워크스페이스(특히 `packages/shared`)를 포함하는 멀티스테이지 빌드 — 로컬에서 실제 빌드 + Postgres 컨테이너 붙여서 `/health` 200 확인 후에야 Terraform에 연결함.

## 실행 로그 (2026-09-01)

1. `terraform init` — 정상.
2. `terraform apply -target=aws_ecr_repository.api` 실행 시 `Error: No valid credential sources found` — AWS CLI 자격증명이 로컬에 없었음. IAM 사용자 생성(`AdministratorAccess`, 개인 학습 프로젝트라 세밀한 권한 분리는 나중으로) → 액세스 키 발급 → `aws configure`로 해결.
3. ECR 리포지토리 생성 성공 (`Apply complete! Resources: 1 added`).
4. 이미지 빌드 시도 중 `infra/terraform` 디렉토리에서 `docker build` 실행 → 빌드 컨텍스트/Dockerfile 경로가 다 어긋남. 원인: Dockerfile의 빌드 컨텍스트는 반드시 저장소 루트여야 함(`packages/shared`가 `apps/api-server` 바깥에 있어서 `COPY`하려면 그 경로가 컨텍스트 안에 있어야 함) — `-f apps/api-server/Dockerfile`은 Dockerfile *위치*만 지정할 뿐, 실제 범위는 마지막 `.`(컨텍스트)이 결정한다는 걸 명확히 함. 저장소 루트로 이동 후 재시도해서 해결.
5. `docker build --platform linux/amd64 ...` + `docker push` 완료.
6. 전체 `terraform apply` 진행 중 사용자가 "이 레포 퍼블릭인데 괜찮은 정보임?"이라고 질문 → 점검해보니 이 레포가 실제로 퍼블릭이고, 관리자 서브도메인 값을 `variables.tf`의 `default`와 이 문서에 그대로 커밋해뒀던 게 문제로 확인됨. 진짜 시크릿(DB 비밀번호/OAuth 시크릿/AWS 자격증명)은 원래부터 git에 안 들어가게 설계돼 있어서 그건 문제없었음 — 레포 전체를 프라이빗으로 바꿀 필요는 없다고 판단, 이 값만 새로 교체하고 `variables.tf`의 `default`를 제거해 `terraform.tfvars`(gitignored)로만 공급하도록 수정.

## 실행 로그 (2026-09-02/03) — 네임서버 전파부터 실제 서비스 기동까지

가비아→Route 53 네임서버 위임이 며칠째 전파 안 되던 문제(2026-09-01부터 대기)가, 알고 보니 가비아 관리 화면의 "네임서버 목록 보기" 옆에 별도로 숨어있는 "설정" 버튼을 안 눌러서 실제 변경이 저장 안 된 상태였음 — 화면에 목록은 보이는데 실제 등록 신청이 안 된 것. 그 버튼을 누르고 나서 `.com` 레지스트리(`dig @a.gtld-servers.net`으로 직접 확인, 캐시 영향 없음)에 정상 반영됨을 확인.

이후 `terraform apply` 진행 과정에서 **실제 자원 생성/앱 기동까지 총 7개의 진짜 버그**를 발견해 그때그때 고치며 진행함(전부 `infra/terraform` 코드 자체의 문제, 사용자 조작 실수 아님):

1. **`terraform.tfstate`에 없는 자원들** — ALB/타겟그룹/ECR/IAM 역할·인스턴스 프로파일/DB 서브넷 그룹/SSM 파라미터 7개가 이미 AWS에 존재하는데 이 로컬 state엔 기록이 없어 `apply`가 전부 "already exists"로 실패. 다른 시점/경로로 한 번 apply가 됐던 흔적으로 추정. `terraform import`로 12개 자원을 전부 state에 편입시켜 해결.
2. **`aws_security_group.ec2`의 `description`에 em dash(`—`) 포함** — AWS EC2 보안그룹 설명은 순수 ASCII만 허용하는데 이 문자 때문에 `CreateSecurityGroup`이 400으로 거부됨. ASCII 하이픈(`-`)으로 교체.
3. **예전 VPC에 남아있던 ALB/DB 서브넷 그룹** — 한 번 VPC가 재생성된 적이 있었던 듯, ALB/DB 서브넷 그룹이 옛날 VPC(`vpc-0782...`)의 서브넷/보안그룹을 계속 참조하고 있었음. AWS API가 "다른 VPC로의 서브넷 교체"를 in-place로 허용하지 않아 `terraform apply -replace=...`로 강제 재생성.
4. **RDS Postgres 16.4가 단종됨** — `variables.tf`의 `db_engine_version` 기본값이 더 이상 AWS RDS에 없는 마이너 버전이라 `CreateDBInstance` 실패. 현재 제공되는 16.x 중 최신인 16.15로 교체.
5. **EC2 루트 볼륨이 실제로는 2GB뿐** — `aws_instance.api`에 `root_block_device`를 명시 안 해서 AMI 기본값(매우 작음)을 그대로 씀. Docker 이미지(pnpm 모노레포 `node_modules` 포함) pull 도중 디스크가 꽉 차 `cloud-final.service` 자체가 실패 — 이게 SSM 에이전트 미등록의 원인이기도 했음(에이전트가 자기 상태를 디스크에 못 씀). `root_block_device { volume_size = 30, volume_type = "gp3" }`로 명시.
6. **AMI 필터가 "minimal" 변종까지 매칭** — `data "aws_ami" "al2023"`의 이름 필터 `"al2023-ami-*-x86_64"`가 표준판과 `al2023-ami-minimal-*-x86_64`(SSM 에이전트 기본 미탑재)를 둘 다 매칭, 실제론 minimal이 선택되고 있었음. 디스크 문제(5번)를 고친 뒤에도 SSM 등록이 계속 안 돼서 발견 — 필터를 `"al2023-ami-2023.*-x86_64"`로 좁혀 표준판만 매칭되게 수정.
7. **RDS가 SSL 연결을 요구하는데 커넥션 스트링에 옵션이 없음** — `drizzle-kit migrate`가 `no pg_hba.conf entry ... no encryption`으로 실패(`psql`은 기본적으로 SSL을 시도해서 문제없이 접속됐던 것과 대비). 마이그레이션용 스크립트와 `templates/user-data.sh.tftpl`이 만드는 실제 배포 앱의 `DATABASE_URL` 둘 다에 `?sslmode=require` 추가 — 실제 배포 앱도 똑같이 겪었을 문제라 함께 고침.

이 7개를 고치는 동안 EC2는 총 5번 재생성됨(state 정리 → VPC 불일치 → AMI/디스크 → SSL 커넥션스트링 → `admin_user_ids` 반영, 매번 스테이트리스라 안전). 이후 순서대로 완료:

- **DB 마이그레이션**: SSM 포트포워딩(`aws ssm start-session --document-name AWS-StartPortForwardingSessionToRemoteHost`)으로 프라이빗 RDS에 터널 연결 후 `drizzle-kit migrate` 실행 완료. 로컬에 `session-manager-plugin`이 없어서 먼저 설치(`brew install --cask session-manager-plugin`, 관리자 비번 필요해 사용자가 직접 설치).
- **SSM Parameter Store 실값**: OAuth 6개(`google`/`kakao`/`naver` × `client_id`/`client_secret`) 사용자가 직접 `aws ssm put-parameter`로 입력.
- **`admin_user_ids`**: DB가 UUID를 `defaultRandom()`으로 생성해서 로컬 개발 DB에서 쓰던 ID는 프로덕션 DB와 전혀 무관 — 실제 프로덕션 도메인(`onseol.com`, 이때 이미 Vercel 커스텀 도메인 연결까지 끝난 상태)에서 회원가입해서 얻은 진짜 UUID(`1b553582-0d9f-477b-af02-fb04635db4a2`)로 설정.
- **Vercel 커스텀 도메인**: `apps/web`→`onseol.com`(A 레코드), `apps/admin`→admin 서브도메인(CNAME) 둘 다 Route 53에 등록 완료. `api.onseol.com`을 실수로 Vercel 도메인으로 등록할 뻔한 걸 사전에 확인해서 막음(그 서브도메인은 AWS ALB 것, Vercel 것이 아님).
- 최종 확인: `https://api.onseol.com/health` → `200 {"status":"ok"}`, `/requests`(실제 DB 쿼리) → `200 []`.

## 완료 (2026-09-03)

카카오/네이버/구글 세 곳 다 `https://api.onseol.com/auth/<provider>/callback` redirect URI 등록 완료(`localhost`도 그대로 유지 — 로컬/프로덕션이 같은 client_id를 쓰고, 등록만 해두는 건 실질적 보안 비용이 없어서). 위 7개 버그 수정 사항도 `fix:`/`docs:` 커밋으로 `infra/aws-api-deploy`(PR #121)에 반영 완료.

추가로 재배포 한 번 더 진행: PR #121이 `v1`에서 갈라진 이후 `v1`에 38개 커밋이 쌓인 상태였고(`Dockerfile`은 이 브랜치에만 있고 `v1`엔 아직 머지 안 됨), `v1`을 이 브랜치로 머지해서 최신 앱 코드 + Dockerfile을 한 트리에서 빌드 → 재배포. `/public/stats`(첫 배포 이미지엔 없던 엔드포인트) 정상 응답 확인.

## 남은 일

- **PR #121을 `v1`에 머지할지 결정** — 지금 인프라 전체가 실제로 동작 확인됐으니 머지 여부/시점은 별도로 사용자 확인 필요. 이 문서 자체도 PR #121 브랜치에만 있어서, 머지 전까지는 `v1`에서 안 보임.
- Phase 2: Auto Scaling Group.
- (아이디어 단계, 미스코프) 개인 서버(`effective-doodle`)에 상태 페이지/Swagger/Storybook 호스팅.
- **향후 재배포 시 주의**: `Dockerfile`이 `v1`이 아니라 PR #121 브랜치에만 있으므로, PR #121이 머지되기 전까지는 재배포할 때마다 `v1`을 이 브랜치로 먼저 머지해야 함(이번처럼).
