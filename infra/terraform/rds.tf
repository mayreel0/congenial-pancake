resource "aws_db_subnet_group" "main" {
  name       = "onseol-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "onseol-db-subnet-group" }
}

resource "aws_db_instance" "main" {
  identifier     = "onseol-db"
  engine         = "postgres"
  engine_version = var.db_engine_version

  instance_class    = var.db_instance_class
  allocated_storage = 20 # gp3, within the RDS free-tier allowance
  storage_type      = "gp3"

  db_name  = var.db_name
  username = var.db_username
  # AWS generates and stores the master password in Secrets Manager and
  # handles rotation — Terraform (and its state file) never sees the
  # plaintext value. The user-data script below reads it at boot via
  # `aws secretsmanager get-secret-value`.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period   = 7
  skip_final_snapshot       = false
  final_snapshot_identifier = "onseol-db-final"

  tags = { Name = "onseol-db" }
}
