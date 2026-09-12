# SES's own domain identity — separate from Resend's verification
# (ses.tf vs email-dns.tf), since each provider needs its own proof of
# domain ownership. Easy DKIM: SES generates 3 tokens, each becoming one
# CNAME record pointing at SES's own signing hosted zone.
resource "aws_sesv2_email_identity" "api" {
  email_identity = var.domain_name
}

# Three fixed resources rather than a for_each over the token list — the
# tokens themselves are only known after the identity is created, and
# for_each's keys (unlike a regular argument) have to be known at plan
# time, so a for_each here would force a two-pass apply. Indexing into
# the list directly sidesteps that.
resource "aws_route53_record" "ses_dkim_0" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${aws_sesv2_email_identity.api.dkim_signing_attributes[0].tokens[0]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["${aws_sesv2_email_identity.api.dkim_signing_attributes[0].tokens[0]}.dkim.amazonses.com"]
}

resource "aws_route53_record" "ses_dkim_1" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${aws_sesv2_email_identity.api.dkim_signing_attributes[0].tokens[1]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["${aws_sesv2_email_identity.api.dkim_signing_attributes[0].tokens[1]}.dkim.amazonses.com"]
}

resource "aws_route53_record" "ses_dkim_2" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${aws_sesv2_email_identity.api.dkim_signing_attributes[0].tokens[2]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["${aws_sesv2_email_identity.api.dkim_signing_attributes[0].tokens[2]}.dkim.amazonses.com"]
}
