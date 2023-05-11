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

variable "pages_project_name" {
  default = "bitextual-pages"
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

resource "cloudflare_record" "bitextual_record_apex" {
  zone_id = var.zone_id
  name = "bitextual.net"
  value = "bitextual-pages.pages.dev"
  type = "CNAME"
}

resource "cloudflare_record" "bitextual_record_www_a" {
  zone_id = var.zone_id
  name = "www.bitextual.net"
  # see https://developers.cloudflare.com/pages/how-to/www-redirect/
  value = "192.0.2.1"
  type = "A"

  proxied = true
}

resource "cloudflare_ruleset" "bitextual_ruleset_redirect_www_to_apex" {
  zone_id     = var.zone_id
  name        = "redirect-www-to-apex"
  description = "Redirect www to apex"
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"

  rules {
    action = "redirect"
    action_parameters {
      from_value {
        status_code = 301
        target_url {
          value = "https://bitextual.net"
        }
        preserve_query_string = false
      }
    }
    expression  = "(http.host eq \"www.bitextual.net\")"
    description = "Redirect www to apex"
    enabled     = true
  }
}

resource "cloudflare_pages_project" "bitextual_pages_project" {
  account_id        = var.account_id
  name              = var.pages_project_name
  production_branch = "main"

  deployment_configs {
    preview {
      always_use_latest_compatibility_date = false
      compatibility_date                   = "2023-05-01"
      compatibility_flags                  = []
      d1_databases                         = {}
      durable_object_namespaces            = {}
      environment_variables                = {}
      fail_open                            = false
      kv_namespaces                        = {}
      r2_buckets                           = {}
      usage_model                          = "bundled"
    }
    production {
      always_use_latest_compatibility_date = false
      compatibility_date                   = "2023-05-01"
      compatibility_flags                  = []
      d1_databases                         = {}
      durable_object_namespaces            = {}
      environment_variables                = {}
      fail_open                            = false
      kv_namespaces                        = {}
      r2_buckets                           = {}
      usage_model                          = "bundled"
    }
  }
}

resource "cloudflare_pages_domain" "bitextual_pages_domain" {
  account_id = var.account_id
  project_name = var.pages_project_name
  domain = var.domain
}

resource "cloudflare_access_application" "bitextual_pages_subdomain" {
  account_id = var.account_id
  name = "bitextual pages subdomain"
  domain = "bitextual-pages.pages.dev"
  type = "self_hosted"
  session_duration = "24h"
}
