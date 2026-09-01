terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state to start (single operator, no team to coordinate with yet).
  # Move to an S3 backend + DynamoDB lock table once that becomes a real
  # need (multiple machines, or wanting state history) — see infra/terraform/README.md.
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "onseol"
      ManagedBy = "terraform"
    }
  }
}
