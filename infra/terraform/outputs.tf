output "api_url" {
  value = "https://${local.api_domain}"
}

output "alb_dns_name" {
  value = aws_lb.api.dns_name
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
