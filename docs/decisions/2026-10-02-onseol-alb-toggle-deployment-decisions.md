# ALB 사용 전환과 API 배포 성공 판정 — DEV-94

## 배경

필요할 때 서비스를 사용하고 비사용 기간에는 ALB 과금을 멈추는 것이 요구사항이다. ALB 제거 후 API DNS도 제거되었지만 배포 워크플로가 공개 URL만 검사하여 실패했다. 컨테이너 실행만으로는 사용 가능한 서비스 배포가 성공했다고 볼 수 없다. 사용자는 잠시 중단을 허용하고 ALB 전환 구성 및 배포 검증 정비를 승인했다.

## 결정과 근거

- 같은 Terraform 상태에서 `minimal`/`service` 프로필로 공개 접속을 전환한다. EC2/RDS/VPC는 공통으로 유지하고 ALB·리스너·API DNS만 선택적으로 관리한다. 서로 다른 상태로 복제하면 공통 자원의 이중 소유와 별도 상태 마이그레이션이 생기므로 기존 소유권을 유지한다.
- 기본 `enable_alb`는 false다. 운영 명령에는 프로필을 명시하고 공개 서비스를 사용할 때 service를 선택한다.
- ALB 전환 때문에 최신 AMI로 EC2를 교체하지 않는다. AMI 변경은 lifecycle에서 제외하고 명시적인 `-replace` 계획으로 OS 업그레이드를 수행한다. 다른 교체 원인은 숨기지 않는다.
- ALB 비사용 중에는 빌드만 수행하고 서비스 배포 job을 skipped로 표시한다. 성공한 이미지 빌드는 서비스 사용 가능 확인을 의미하지 않는다.
- ALB 사용 중에는 해당 실행 SHA 이미지로 교체하고 내부 health와 공개 HTTPS health가 모두 200이어야 배포 성공이다. 원격 명령은 오류 시 즉시 중단하고 migration/startup을 기다린다.
- gram 서버에서 API를 운영하는 것도 가능하지만 RDS 사설 접속, HTTPS, 상시 실행 및 AWS 자격 증명 구성이 필요하다. 이번 작업에서 호스팅 이전은 수행하지 않는다.

## 산출물

- Terraform ALB 선택 옵션, 두 프로필, 기존 상태 moved 블록, EC2 AMI 교체 방지.
- Actions build/deploy 분리, SHA 이미지 배포, 내부·외부 공통 health 검사.
- 실제 HTTP 서버와 curl을 사용하는 health 회귀 테스트와 PR 검증 workflow.
- 인프라 운영 절차 갱신.

## 검증

- 실제 HTTP 테스트 6개 통과: 200, 503, startup 재시도, redirect 거부, 연결 실패, 실제 workflow의 SSM payload 전달.
- Terraform validate 통과.
- minimal 계획: 추가/삭제 0, 배포 역할에 ALB 조회 권한만 변경 1. EC2/RDS 교체 없음.
- service 계획 및 적용: ALB·리스너·DNS 4개 추가, 배포 역할 권한 변경 1, 삭제 0. EC2/RDS 유지.
- workflow에서 추출한 동일 SSM 배포 명령으로 현재 v1 SHA 이미지를 실제 교체했다. 첫 실행에서 heredoc 인용 오류를 발견하여 실패 재현 테스트를 추가하고 수정했다. 두 번째 실행은 SSM Success, 내부 health 200, 공개 HTTPS health 200 및 ALB target healthy를 확인했다.
- lint/typecheck 및 기존 API 311개·web 289개·admin 59개 테스트 통과. 테스트에서 의도적으로 발생시킨 오류 로그와 공통 패키지의 기존 React 감지 경고가 있었으나 검증 실패는 없었다.
- GitHub Actions actionlint 통과. 수정한 workflow의 Actions 실행은 v1 병합 후 확인해야 하며, 로컬/SSM 검증을 Actions 성공으로 주장하지 않는다.
- DB 조회 공개 `/public/stats` 200 확인. ALB 비사용 전환 계획은 ALB·리스너·DNS 4개 삭제만 포함하고 EC2/RDS 변경이 없다.
- 독립 리뷰에서 SHA pull뿐 아니라 run 이미지도 검증하도록 테스트를 보강했다. 기존 `awk && mv`가 오류 전파를 약화시키는 경로도 순차 명령으로 수정하고 실패 시 교체 단계로 진행하지 않는 회귀 검증을 추가했다.

## 남은 일

- 독립 리뷰 및 PR 검증.
- 사용자의 종료 프로필 선택에 따라 ALB 비사용 전환 또는 공개 서비스 유지. 답변 전에는 공개 접속을 유지한다.
- gram 호스팅 이전은 별도 결정.
