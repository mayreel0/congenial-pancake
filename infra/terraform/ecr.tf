resource "aws_ecr_repository" "api" {
  name                 = "onseol-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Keep only the 10 most recent images — every push to v1 that touches
# apps/api-server pushes a new :GITHUB_SHA-tagged image on top of :latest
# (see .github/workflows/deploy-api.yml), so these would otherwise
# accumulate indefinitely.
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
