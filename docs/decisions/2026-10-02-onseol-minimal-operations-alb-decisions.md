# 최소 운영을 위한 ALB 임시 철거 결정

## 배경

AWS 비용에서 Elastic Load Balancing이 월 비용의 유의미한 부분을 차지하고 있었고, 당분간 공개 API를 상시 제공하기보다 인프라를 최소 운영 상태로 유지하기로 했다. `infra/terraform/README.md`에는 ALB와 리스너만 철거하고 나중에 전체 `terraform apply`로 복구하는 절차가 이미 마련되어 있었다.

## 결정

- `onseol-api-alb`와 HTTP/HTTPS 리스너를 Terraform으로 철거한다.
- ALB를 참조하는 `api.onseol.com` Route 53 별칭 레코드도 함께 제거한다. 존재하지 않는 ALB를 가리키는 DNS 레코드를 남기지 않기 위해서다.
- EC2, RDS, 대상 그룹, 인증서와 인증서 검증 레코드는 유지한다. 공개 API 진입점만 닫아 비용을 줄이고, 이후 복구 비용을 낮게 유지하기 위해서다.
- 당시 구성에서는 전체 apply로 복구하도록 안내했으나 최신 AMI가 EC2 교체를 유발할 수 있음을 확인했다. 현재 복구/전환 절차는 [DEV-94 결정](2026-10-02-onseol-alb-toggle-deployment-decisions.md)의 명시적 프로필과 계획 검토를 따른다.

## 산출물

- Terraform target destroy로 ALB와 HTTP/HTTPS 리스너를 제거했다.
- 의존 관계에 따라 `api.onseol.com` Route 53 A 별칭 레코드도 함께 제거됐다.
- Terraform 구성 코드는 유지했으므로 재생성 경로는 변하지 않았다.

## 검증

- AWS ELBv2 조회 결과: 로드 밸런서 없음.
- Terraform state 조회 결과: `aws_lb.api`, 두 `aws_lb_listener`, `aws_route53_record.api` 없음.
- EC2 조회 결과: API 인스턴스 `running`.
- RDS 조회 결과: `onseol-db` `available`.
- ELBv2 대상 그룹 조회 결과: `onseol-api-tg` 유지.

## 남은 일

- 공개 API 전환은 DEV-94에서 정비했다. service 프로필로 실제 컨테이너 교체 및 공개 health 200까지 검증했다.
- EC2와 RDS는 계속 실행되므로 더 낮은 비용이 필요하면 각각의 중지·복구 영향과 데이터 보존 방식을 별도로 결정한다.
