variable "aws_region" {
  description = "AWS region for everything in this stack."
  type        = string
  default     = "ap-northeast-2" # Seoul
}

variable "domain_name" {
  description = "Root domain — the Route 53 hosted zone must already exist for this."
  type        = string
  default     = "onseol.com"
}

variable "api_subdomain" {
  description = "Subdomain apps/api-server is reachable at (api.<domain_name>)."
  type        = string
  default     = "api"
}

variable "admin_subdomain" {
  description = "Subdomain apps/admin is reachable at, deliberately not a guessable name like 'admin' — see apps/admin/AGENTS.md. Deployed on Vercel, not this AWS stack; only needed here so the API's CORS_ORIGIN allows it. No default on purpose — this repo is public, so the actual value must only ever live in the gitignored terraform.tfvars (or TF_VAR_admin_subdomain), never in a tracked file. (A previous version of this file did default to a real value — that value is burned, already in git history on a public repo, and should not be reused.)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the two public subnets (ALB + EC2), one per AZ."
  type        = list(string)
  default     = ["10.20.0.0/24", "10.20.1.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the two private subnets (RDS only), one per AZ."
  type        = list(string)
  default     = ["10.20.10.0/24", "10.20.11.0/24"]
}

variable "app_port" {
  description = "Port apps/api-server listens on inside the container (matches PORT env var)."
  type        = number
  default     = 3001
}

variable "ec2_instance_type" {
  description = "EC2 instance type. amd64 — the Docker image is built for linux/amd64, see infra/terraform/README.md."
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_engine_version" {
  description = "Postgres major version on RDS."
  type        = string
  default     = "16.15"
}

variable "db_name" {
  type    = string
  default = "onseol"
}

variable "db_username" {
  type    = string
  default = "onseol"
}

variable "ssm_parameter_prefix" {
  description = "SSM Parameter Store path prefix the EC2 instance role can read app secrets from."
  type        = string
  default     = "/onseol/prod"
}

variable "ssh_key_name" {
  description = "Existing EC2 key pair name for emergency SSH access. Leave null to rely on SSM Session Manager only (recommended — no port 22 opened either way)."
  type        = string
  default     = null
}
