# infra/terraform — apps/api-server AWS deployment (Phase 1)

Provisions everything `apps/api-server` needs to run reachable at `https://api.onseol.com`: a custom VPC (public subnets for ALB+EC2, private subnets for RDS, no NAT gateway), an ALB, a single EC2 instance running the app in Docker, and an RDS Postgres instance. `apps/web`/`apps/admin` are not part of this stack — they go on Vercel.

Phase 2 (not yet built): an Auto Scaling Group replacing the single EC2 instance, once this is proven working.

## Prerequisites

- AWS CLI configured locally with credentials that can create VPC/EC2/RDS/ALB/IAM/ECR/ACM/Route53 resources. If `terraform apply` fails with `Error: No valid credential sources found`: create an IAM user in the AWS console (console → IAM → Users → Create user; `AdministratorAccess` is fine to start with for a single-operator learning project — tighten later if it matters), generate an access key under that user's "Security credentials" tab (use case: "Command Line Interface (CLI)"), then run `aws configure` and paste in the access key ID/secret, region `ap-northeast-2`, output format `json`. Verify with `aws sts get-caller-identity`.
- `onseol.com`'s Route 53 hosted zone already exists (it does — created manually) and the registrar's nameservers have finished propagating to it. Check with `dig NS onseol.com` — it should return the four `*.awsdns-*.{com,net,org,co.uk}` names, not Gabia's.
- `terraform` (installed via `brew install hashicorp/tap/terraform`), Docker.

## Path convention: every command below runs from the repo root

Not from `infra/terraform` — `docker build`'s context has to be the repo root (`packages/shared` is a real workspace dependency the `Dockerfile` `COPY`s, and it lives outside `apps/api-server`, so it has to be inside whatever directory you point Docker's context at). Terraform commands use `terraform -chdir=infra/terraform` instead of `cd`ing there, for the same reason — one consistent "you are at the repo root" assumption for the whole file, so a copy-pasted command never silently breaks depending on which directory you happened to run the previous one from (this bit us once — an earlier version of this doc mixed the two and a `cd infra/terraform` command sequence broke a later `docker build` copy-pasted from elsewhere).

## First-time apply — order matters

The EC2 instance's boot script (`templates/user-data.sh.tftpl`) `docker pull`s the app image on first boot. If nothing's been pushed to ECR yet, that pull fails and the instance comes up with no container running. So the ECR repo has to exist and hold an image *before* the EC2 instance is created:

```bash
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform apply -target=aws_ecr_repository.api   # just the ECR repo

# Build for linux/amd64 explicitly — t3.micro is x86_64, and building on
# an Apple Silicon Mac defaults to arm64 otherwise.
REPO_URL=$(terraform -chdir=infra/terraform output -raw ecr_repository_url)
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin "${REPO_URL%%/*}"
docker build --platform linux/amd64 -f apps/api-server/Dockerfile -t "$REPO_URL:latest" .
docker push "$REPO_URL:latest"

terraform -chdir=infra/terraform apply   # everything else
```

## After apply: set the real app secrets

`ssm.tf` creates 7 SecureString parameters under `/onseol/prod/` as `CHANGE_ME` placeholders (Terraform never manages their real values — see the comment in `ssm.tf` for why). Set the real ones once:

```bash
aws ssm put-parameter --name /onseol/prod/google_client_id     --type SecureString --overwrite --value "..."
aws ssm put-parameter --name /onseol/prod/google_client_secret --type SecureString --overwrite --value "..."
aws ssm put-parameter --name /onseol/prod/kakao_client_id      --type SecureString --overwrite --value "..."
aws ssm put-parameter --name /onseol/prod/kakao_client_secret  --type SecureString --overwrite --value "..."
aws ssm put-parameter --name /onseol/prod/naver_client_id      --type SecureString --overwrite --value "..."
aws ssm put-parameter --name /onseol/prod/naver_client_secret  --type SecureString --overwrite --value "..."
aws ssm put-parameter --name /onseol/prod/admin_user_ids       --type SecureString --overwrite --value "..."
```

Each OAuth provider's redirect URI also needs to be registered as `https://api.onseol.com/auth/<provider>/callback` in that provider's own developer console.

The EC2 instance only reads these at boot — after changing one, redeploy the instance (see below) to pick it up.

## Running DB migrations

RDS is in a private subnet (not internet-reachable) by design. Reach it by port-forwarding through the EC2 instance via SSM, then run migrations from your own machine against `localhost`:

```bash
INSTANCE_ID=$(terraform -chdir=infra/terraform output -raw ec2_instance_id)
RDS_HOST=$(terraform -chdir=infra/terraform output -raw rds_endpoint | cut -d: -f1)

aws ssm start-session --target "$INSTANCE_ID" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"$RDS_HOST\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"5433\"]}"
```

In another terminal, with the tunnel still open (still from the repo root):

```bash
DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "$(terraform -chdir=infra/terraform output -raw rds_secret_arn)" --query SecretString --output text | python3 -c "import sys,json;print(json.load(sys.stdin)['password'])")
DATABASE_URL="postgres://onseol:${DB_PASSWORD}@localhost:5433/onseol" pnpm --filter api-server db:migrate
```

Same tunnel works for `pnpm --filter api-server db:studio` if you want to inspect data directly.

## Redeploying after a code change

No CI pipeline yet — build, push, and restart by hand:

```bash
REPO_URL=$(terraform -chdir=infra/terraform output -raw ecr_repository_url)
docker build --platform linux/amd64 -f apps/api-server/Dockerfile -t "$REPO_URL:latest" .
docker push "$REPO_URL:latest"

INSTANCE_ID=$(terraform -chdir=infra/terraform output -raw ec2_instance_id)
aws ssm send-command --instance-ids "$INSTANCE_ID" --document-name "AWS-RunShellScript" \
  --parameters 'commands=["docker pull '"$REPO_URL"':latest","docker stop onseol-api","docker rm onseol-api","docker run -d --name onseol-api --restart unless-stopped --env-file /etc/onseol-api.env -p 3001:3001 '"$REPO_URL"':latest"]'
```

Phase 2's Auto Scaling Group will replace this manual restart with an instance refresh.

## Tearing down the ALB to stop paying for it between sessions

The ALB is the one piece here with a real always-on cost (~$16-20/mo baseline + traffic, not free-tier eligible) — EC2 t3.micro and RDS db.t4g.micro are both free-tier eligible for a new account's first 12 months.

```bash
terraform -chdir=infra/terraform destroy -target=aws_lb_listener.https -target=aws_lb_listener.http_redirect -target=aws_lb.api
```

Recreate it later with a plain `terraform -chdir=infra/terraform apply` — `acm.tf`'s Route 53 `A` record is an alias pointing at `aws_lb.api.dns_name`/`.zone_id`, both attributes of the `aws_lb` resource, so the next apply automatically re-points the domain at the new ALB's (new) DNS name. No manual DNS edits needed. The EC2 instance and RDS keep running (and costing) independently of this — target them too if you want a full pause, but note RDS needs `terraform apply` afterward to actually come back up (an RDS instance stopped outside Terraform auto-restarts after 7 days anyway; Terraform doesn't have a "stop" concept, only create/destroy).

## State

Local `.tfstate` file (gitignored), single operator — no S3 backend yet. Move to one (S3 bucket + native S3 locking, `use_lockfile = true`) once there's a reason to (a second machine, wanting state history) — don't add it speculatively.

## Cost-relevant choices already made

- No NAT Gateway — EC2 sits in a public subnet directly, security-group-restricted to ALB-only inbound, saving ~$32/mo + data processing versus the private-subnet+NAT pattern.
- RDS master password is AWS-managed (`manage_master_user_password`, via Secrets Manager) — no password ever touches Terraform state or a `.tfvars` file.
- App secrets (OAuth client IDs/secrets, `ADMIN_USER_IDS`) go through SSM Parameter Store SecureString, set once by hand after apply — same reasoning, keeps them out of Terraform state.
