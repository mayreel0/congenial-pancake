output "api_url" {
  value = var.enable_alb ? "https://${local.api_domain}" : null
}

output "alb_dns_name" {
  value = var.enable_alb ? aws_lb.api[0].dns_name : null
}

output "public_api_enabled" {
  value = var.enable_alb
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "rds_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "rds_secret_arn" {
  description = "Secrets Manager ARN holding the RDS master password — fetch with: aws secretsmanager get-secret-value --secret-id <this>"
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "ec2_instance_id" {
  description = "Connect with: aws ssm start-session --target <this>"
  value       = aws_instance.api.id
}
