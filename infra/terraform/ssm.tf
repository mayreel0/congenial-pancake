# Terraform creates these SecureString parameters as placeholders only —
# real secret values are set afterward via
#   aws ssm put-parameter --name <name> --value <real-value> --type SecureString --overwrite
# `ignore_changes` on value means a later manual overwrite survives the
# next `terraform apply` instead of being reset back to the placeholder.
# This keeps real OAuth secrets out of Terraform state entirely (unlike
# the RDS password, these have no AWS-managed alternative to
# `manage_master_user_password`).

locals {
  app_secret_names = [
    "google_client_id",
    "google_client_secret",
    "kakao_client_id",
    "kakao_client_secret",
    "naver_client_id",
    "naver_client_secret",
    "admin_user_ids",
  ]
}

resource "aws_ssm_parameter" "app_secret" {
  for_each = toset(local.app_secret_names)

  name  = "${var.ssm_parameter_prefix}/${each.value}"
  type  = "SecureString"
  value = "CHANGE_ME"

  lifecycle {
    ignore_changes = [value]
  }
}
