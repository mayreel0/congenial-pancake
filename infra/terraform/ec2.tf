data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "ec2" {
  name = "onseol-api-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Session Manager access — no SSH key pair, no port 22 open (see
# security_groups.tf). Access is controlled entirely by IAM.
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "ecr_pull" {
  name = "onseol-api-ecr-pull"
  role = aws_iam_role.ec2.id

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
        ]
        Resource = aws_ecr_repository.api.arn
      },
    ]
  })
}

resource "aws_iam_role_policy" "secrets_read" {
  name = "onseol-api-secrets-read"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "secretsmanager:GetSecretValue"
        Resource = aws_db_instance.main.master_user_secret[0].secret_arn
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_parameter_prefix}/*"
      },
      {
        # SecureString decryption via the default aws/ssm KMS key.
        Effect   = "Allow"
        Action   = "kms:Decrypt"
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "onseol-api-ec2-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_instance" "api" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.ec2_instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.ssh_key_name

  user_data = templatefile("${path.module}/templates/user-data.sh.tftpl", {
    aws_region           = var.aws_region
    ecr_host             = local.ecr_host
    ecr_repo_url         = aws_ecr_repository.api.repository_url
    db_secret_arn        = aws_db_instance.main.master_user_secret[0].secret_arn
    db_endpoint          = aws_db_instance.main.endpoint
    db_username          = var.db_username
    db_name              = var.db_name
    ssm_parameter_prefix = var.ssm_parameter_prefix
    app_port             = var.app_port
    cors_origin          = local.cors_origin
    api_domain           = local.api_domain
    web_public_url       = local.web_origin
  })

  # Changing user_data alone doesn't replace a running instance by default
  # in this provider version — force a replace so a `terraform apply`
  # after editing the deploy script actually re-runs it, instead of
  # silently doing nothing to the already-running instance.
  user_data_replace_on_change = true

  tags = { Name = "onseol-api" }
}
