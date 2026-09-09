# Lets .github/workflows/deploy-api.yml authenticate to AWS without any
# long-lived credential sitting in a GitHub secret — GitHub issues each
# workflow run a short-lived (~1h) OIDC token, which this role exchanges
# for temporary AWS credentials via sts:AssumeRoleWithWebIdentity. Scoped
# to exactly this repo's v1 branch (see the trust policy's `sub`
# condition below) and to exactly the permissions the deploy step needs
# — narrower than the AdministratorAccess IAM user used for local/manual
# Terraform work.

# GitHub's OIDC provider thumbprint is the same fixed, publicly
# documented value for every AWS account (AWS's own GitHub Actions OIDC
# guide uses this exact value) — it identifies GitHub's root CA, not
# anything specific to this account, and AWS has validated tokens from
# this provider without re-checking it since 2023.
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_deploy" {
  name = "onseol-api-github-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        # Both a push to v1 and a manual "Run workflow" against v1 present
        # this same sub claim (it's ref-based, not event-based) — this is
        # the actual access boundary: only workflow runs against this
        # exact branch of this exact repo can assume this role, so a PR
        # from a fork (or any other branch) can't.
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:mayreel0/congenial-pancake:ref:refs/heads/v1"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_deploy" {
  name = "onseol-api-github-deploy"
  role = aws_iam_role.github_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ]
        Resource = aws_ecr_repository.api.arn
      },
      {
        # DescribeInstances/GetCommandInvocation don't support
        # resource-level restriction — SendCommand is scoped to this
        # account's EC2 instances and the one SSM document the workflow
        # actually uses.
        Effect   = "Allow"
        Action   = ["ec2:DescribeInstances", "ssm:GetCommandInvocation"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = "ssm:SendCommand"
        Resource = [
          "arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:instance/*",
          "arn:aws:ssm:${var.aws_region}::document/AWS-RunShellScript",
        ]
      },
      {
        # Deploy needs the RDS master password secret's ARN/endpoint to
        # tell the EC2 instance where to refresh DATABASE_URL from — the
        # secret's actual value is never fetched here, only on the
        # instance itself (see ec2.tf's secrets_read policy), so this
        # role never sees the plaintext password.
        Effect   = "Allow"
        Action   = "rds:DescribeDBInstances"
        Resource = aws_db_instance.main.arn
      },
    ]
  })
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
