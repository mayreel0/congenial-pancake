locals {
  api_domain   = "${var.api_subdomain}.${var.domain_name}"
  web_origin   = "https://${var.domain_name}"
  admin_origin = "https://${var.admin_subdomain}.${var.domain_name}"
  cors_origin  = join(",", [local.web_origin, local.admin_origin])
  ecr_host     = split("/", aws_ecr_repository.api.repository_url)[0]
}
