# ==============================================================================
# FUSION MUSHROOM BARS EU - EMAIL DOMAIN AUTHENTICATION
# Production DNS Records Checklist for https://fusionbars.eu
# ==============================================================================

## 1. Domain Authentication Overview

To ensure deliverability of transactional emails from `sales@fusionbars.eu` to European inboxes (Gmail, Outlook, ProtonMail, GMX, T-Online) and avoid quarantine or spam classification, configure the following DNS records at the domain registrar / DNS provider for `fusionbars.eu`.

---

## 2. Required DNS Records (Provider Agnostic Template)

### A. SPF (Sender Policy Framework)
- **Host / Name:** `@` (or `fusionbars.eu`)
- **Record Type:** `TXT`
- **Value (Resend):**
  `v=spf1 include:amazonses.com ~all`
- **Value (Postmark):**
  `v=spf1 include:spf.mtasv.net ~all`
- **Purpose:** Authorizes the outbound transactional infrastructure to send on behalf of `@fusionbars.eu`.

---

### B. DKIM (DomainKeys Identified Mail)
Transactional email providers provide 2 or 3 CNAME records or a 2048-bit TXT record for cryptographic email signing.

#### Example Resend DKIM:
| Type | Name / Host | Value | TTL |
| :--- | :--- | :--- | :--- |
| `CNAME` | `resend._domainkey.fusionbars.eu` | `dkim.resend.com` | `3600` |

#### Example Postmark DKIM:
| Type | Name / Host | Value | TTL |
| :--- | :--- | :--- | :--- |
| `TXT` | `20260925._domainkey.fusionbars.eu` | `k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...` | `3600` |

---

### C. DMARC (Domain-based Message Authentication, Reporting, and Conformance)
- **Host / Name:** `_dmarc` (or `_dmarc.fusionbars.eu`)
- **Record Type:** `TXT`
- **Initial Verification Value (Monitoring / Quarantine):**
  `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@fusionbars.eu; adkim=r; aspf=r;`
- **Hardened Production Enforcement Value (Strict Reject):**
  `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@fusionbars.eu; ruf=mailto:dmarc-forensics@fusionbars.eu; adkim=s; aspf=s;`
- **Purpose:** Prevents fraudulent spoofing of `sales@fusionbars.eu`.

---

### D. Return-Path / Custom Envelope From
- **Host / Name:** `bounces` (or `bounces.fusionbars.eu`)
- **Record Type:** `CNAME`
- **Value:** Provided by provider (e.g. `feedback-smtp.eu-central-1.amazonses.com` or `pm.mtasv.net`)
- **Purpose:** Ensures custom aligned return-path for SPF alignment.

---

## 3. Pre-Flight Verification Commands

Run before production launch:
```bash
# Verify SPF
dig +short TXT fusionbars.eu

# Verify DKIM
dig +short TXT resend._domainkey.fusionbars.eu

# Verify DMARC
dig +short TXT _dmarc.fusionbars.eu
```
All checks must return matching records before switching `EMAIL_PROVIDER` to live mode.
