# 온설 RDS 비밀번호 자동 회전 대응 결정 기록

> 메모리 요약([[rds_password_rotation_fixed]])과 PR 기록을 대조해 재구성.

## 배경

`infra/terraform/rds.tf`의 `manage_master_user_password = true` 설정이 켜져 있으면, AWS가 기본값으로 **RDS 마스터 비밀번호를 7일마다 자동 회전**시킨다(누가 명시적으로 설정한 주기가 아니라 이 플래그를 켜는 순간 따라오는 AWS 기본 동작). 2026-09-09, 실제로 회전이 발생한 직후 배포(코드 변경 없이 같은 커밋 재배포)가 무한 크래시 루프에 빠짐 — 컨테이너 로그에는 "마이그레이션 적용 중..."만 반복되고 명확한 에러가 안 보여, 앱 드라이버(`postgres`)로 직접 진단용 컨테이너를 띄워서야 인증 실패임을 확인. `aws rds describe-events`로 정확히 회전 시각에 "Reset master credentials" 이벤트가 있었음을 확인해 근본 원인을 특정.

## 원인

EC2 인스턴스의 `/etc/onseol-api.env`는 **부팅 시 한 번만** `DATABASE_URL`을 굽는 구조였고, 배포 파이프라인(`deploy-api.yml`)은 OAuth/Resend/SES 같은 앱 시크릿만 갱신할 뿐 `DATABASE_URL`은 갱신하지 않았음 — 비밀번호가 회전되면 부팅 시 구운 값이 그대로 stale해짐.

## 결정: 배포할 때마다 Secrets Manager에서 DATABASE_URL을 다시 조립한다 (PR #170)

`.github/workflows/deploy-api.yml`의 기존 SSM 시크릿 갱신 단계를 확장해, RDS가 관리하는 시크릿에서 현재 `{username, password}`를 가져와 매 배포마다 `DATABASE_URL`을 재조립하도록 함 — 부팅 스크립트(`infra/terraform/templates/user-data.sh.tftpl`)가 이미 쓰던 것과 같은 방식. GitHub Actions 러너가 ARN/엔드포인트 조회를 하기 위해 `onseol-api-github-deploy` IAM 역할에 `rds:DescribeDBInstances`(이 DB로 범위 한정)를 추가했으나, **실제 비밀번호 값 자체는 여전히 EC2 인스턴스 내부에서만 조회**(`secretsmanager:GetSecretValue`) — 러너는 비밀번호 값을 직접 다루지 않음.

## 알려진 한계(의도적으로 미해결)

이 수정은 **배포 시점에만** `DATABASE_URL`을 갱신한다. 회전과 다음 배포 사이에 컨테이너가 배포와 무관한 이유로 재시작되면, 이론적으로 같은 stale-password 창이 다시 열릴 수 있음 — 이 규모에서는 복잡도 대비 가치가 낮다고 판단해 고치지 않기로 함(PR #170 본문에 명시).

## 검증

- 회전 이벤트 발생 직후 재배포로 재현, 수정 후 같은 시나리오에서 정상 배포 확인.
- SSM 명령 stdout으로 매 배포마다 `DATABASE_URL` 갱신 단계가 실제로 실행되는지 확인 가능하도록 로그 남김.
