# Resend's required DNS records for onseol.com, from the Resend
# dashboard (Domains → onseol.com) — DKIM signing, SPF/Return-Path via
# Resend's own subdomains, and a DMARC policy (not required by Resend for
# verification, but cheap to add and worth having). SES's own domain
# identity/DKIM records live in ses.tf, added separately since they're a
# different provider's verification.
resource "aws_route53_record" "resend_dkim" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "resend._domainkey.${var.domain_name}"
  type    = "TXT"
  ttl     = 300
  records = ["p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCuqbwihWbnFpN5fFA5mMXZQTgczDmKuqmm7X0YAUXqiMYS/Z9IZwfPORWSyVHw/l3mMxM4XjwcRPM5i0XY2eY+IqztAQUVVr39lEOECrfMLapFDOajY1nxJr/N3GMiMDPSDWJDwNBhk7Sa4X0fAam02ow294BtSQr9s355aorDgQIDAQAB"]
}

resource "aws_route53_record" "resend_spf_rsend" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "rsend.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["rsend-apne1.forge.rmta.net"]
}

resource "aws_route53_record" "resend_spf_send" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "send.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["send.forge.rmta.net"]
}

# p=none — report-only, doesn't reject/quarantine anything on its own.
# Tighten later (p=quarantine or p=reject) once real mail flow has been
# observed for a while and there's confidence nothing legitimate gets
# blocked.
resource "aws_route53_record" "dmarc" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 300
  records = ["v=DMARC1; p=none;"]
}

# Inbound mail for admin@onseol.com — ImprovMX (free forwarding only) relays
# it to a personal mailbox; replies go out from that mailbox, not from this
# domain. Nothing else on the apex domain receives mail. The values are the
# ones ImprovMX's dashboard asks for (inspector.improvmx.com/dns-lookup/
# onseol.com).
#
# The apex had no MX or TXT records before this, so neither record set below
# replaces anything. Sending (Resend, SES) is unaffected: Resend uses the
# send./rsend. subdomains above, SES's MAIL FROM is amazonses.com, and both
# align through DKIM for the DMARC policy.
resource "aws_route53_record" "improvmx_mx" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 300
  records = ["10 mx1.improvmx.com", "20 mx2.improvmx.com"]
}

# Route 53 allows only ONE record set per name+type, so this is the apex's
# only TXT resource: any other apex TXT (a site-verification token, say) must
# be added to this `records` list, not as a second aws_route53_record.
resource "aws_route53_record" "improvmx_spf" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:spf.improvmx.com ~all"]
}
