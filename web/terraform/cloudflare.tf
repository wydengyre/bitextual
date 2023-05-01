terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
      version = "~> 3.0"
    }
  }

  cloud {
    organization = "bitextual"

    workspaces {
      name = "bitextual"
    }
  }
}

provider "cloudflare" {
  # token pulled from $CLOUDFLARE_API_TOKEN
}

variable "zone_id" {
  default = "811be2d09604bf9ac4295b0a32d83b87"
}

variable "domain" {
  default = "bitextual.net"
}

variable "account_id" {
  default = "ac68eede96260ce7da64614927849f01"
}

resource "cloudflare_zone_settings_override" "bitextual_zone_settings_override" {
  zone_id = var.zone_id
  settings {
    always_use_https          = "on"
    automatic_https_rewrites  = "on"
    brotli                    = "on"
    http3                     = "on"
    ip_geolocation            = "on"
    ipv6                      = "on"
    min_tls_version           = "1.0"
    security_level              = "medium"
    server_side_exclude         = "on"
    ssl                         = "flexible"
    tls_1_3                     = "on"
    tls_client_auth             = "off"
  }
}

resource "cloudflare_zone_dnssec" "bitextual_zone_dnssec" {
  zone_id = var.zone_id
}

resource "cloudflare_pages_project" "bitextual_pages_project" {
  account_id        = var.account_id
  name              = "bitextual-pages"
  production_branch = "main"
}
