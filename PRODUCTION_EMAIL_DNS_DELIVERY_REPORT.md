# Production Email, DNS Authentication, and Delivery Report

Date: 2026-10-03

Production control state: `PAUSED`

Final launch decision remains `LAUNCH_BLOCKED`. This closure did not change catalogue decisions, pricing, VAT, country eligibility, shipping, payments, legal documents, object storage, backups, monitoring, production secrets, or publication state.

Email was not activated. The live chain stopped before a controlled send.

## Provider

| Item | State |
| --- | --- |
| Selected provider | Resend |
| Other providers | Postmark, SMTP, and Mock remain behind the same abstraction |
| Credential variable | `EMAIL_PROVIDER_KEY` is present |
| Credential acceptance | `REJECTED` |
| Credential display | `INVALID` |
| Sender | Canonical. Name Fusion Mushroom Bars EU, address `sales@fusionbars.eu`, reply-to `sales@fusionbars.eu` |
| Domain | `fusionbars.eu` |
| Provider domain verification | `NOT_AVAILABLE` |
| Email state | `REVIEW_REQUIRED` |

Resend was asked for the domain list and returned HTTP 401. The key value was not printed or stored in the readiness report. A rejected credential is not domain verification. Mock remains ineligible for production email, and preview resolves to Mock so it does not attach the production credential.

## DNS

| Record | Public observation | Gate |
| --- | --- | --- |
| SPF | TXT record present at `fusionbars.eu` | `NOT_CONFIGURED` |
| DKIM | Not checked. The provider did not return selectors | `NOT_CONFIGURED` |
| DMARC | TXT record present at `_dmarc.fusionbars.eu`. Policy token observed: `p=none` | `NOT_CONFIGURED` |

No DNS record was created or edited. Site A, AAAA, CNAME, and application routing were not changed. A present TXT record is not `VERIFIED`. `VERIFIED` is applied only when the provider reports that status for `fusionbars.eu`. That response was not available.

## Delivery

| Item | State |
| --- | --- |
| Controlled production test | `NOT_RUN` |
| Handoff | `NOT_RUN` |
| `SENT` | Not recorded for a live message |
| `DELIVERED` | Not recorded for a live message |
| `FAILED` | No live send was attempted |
| `BOUNCED` | No live bounce was received |
| `UNKNOWN` | Resend delivery lookup stays `UNKNOWN` unless the provider returns an explicit status |

The controlled test was not sent. The provider credential was rejected, the domain was not verified, and SPF, DKIM, and DMARC are not `VERIFIED`. `SENT` is not treated as `DELIVERED`.

## Templates

| Item | Count |
| --- | --- |
| Total | 19 |
| Validated | 19 |
| Missing | 0 |

The existing set is unchanged: SEPA confirmation, crypto confirmation, payment proof, payment verified, payment rejected, processing, shipped, delivered, cancelled, refunded, welcome, password reset, email verification, admin alert, contact confirmation, contact operations alert, newsletter confirmation, newsletter operations alert, and the test probe. The test probe is labelled `FUSION PRODUCTION EMAIL TEST`.

## Events

| Class | Behaviour |
| --- | --- |
| Order | `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, and `REFUNDED` each keep one template. Repeated status events do not send a second message. |
| Payment | Proof, verified, and rejected emails follow those states. Viewing a payment does not send mail. |
| Account | Welcome, verification, and password reset use `https://fusionbars.eu`. |
| Admin | Operational, contact, and newsletter alerts stay internal. |

Shipment mail still includes a tracking reference only when the order has one. No carrier, tracking number, or tracking URL is invented. Public carrier tracking remains unavailable.

## Security

| Item | State |
| --- | --- |
| Secrets | Provider keys stay server-side. Readiness, health, and delivery logs do not print them. Provider error bodies are not stored. |
| Headers | Sender and reply-to are set by the server. Newlines in a recipient are rejected. |
| Webhooks | No provider webhook was added. A missing or unrecognised signature is rejected. No signature algorithm was invented. |
| Idempotency | One business event keeps one delivery claim. Manual retry stays authorised, explicit, and tied to the failed attempt. |
| Ordinary sends | A real provider sends only while email state is `ACTIVE`. |
| Preview | Preview selects Mock and does not construct the production provider. |
| Accounts | A permanent bounce can suppress later mail to that address. It does not disable the customer account. |

## Admin

| Surface | What it shows |
| --- | --- |
| `/admin/settings/email` | Provider, credential acceptance, sender, domain verification, SPF, DKIM, DMARC, public record observation, DMARC policy token, test handoff, test delivery, and delivery logging. The API key is not shown. |
| `/admin/system/email-templates` | The 19 templates remain available for preview. |
| `/admin/system/email-delivery` | Template, recipient, provider, event, message id, status, provider status, timestamps, failure reason, bounce category, and retry. The message body and credentials are not shown. |
| `GET /api/health` | `email` is `REVIEW_REQUIRED` in this environment. It becomes `ACTIVE` only after explicit activation. |

Activation and disable actions exist for Super Admin. Activation rechecks the provider, requires the confirmation phrase, and writes an audit event. It does not run while any readiness blocker remains. Disable stops new production sends, keeps delivery history, and writes an audit event. Neither action changes payments, catalogue, publication, shipping, or the production control state.

The admin screens were not clicked. Those routes require a session.

## Validation

| Command | Result |
| --- | --- |
| `npm test` | 223 passed, 0 failed |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed |

The controlled production test was not run. Email is not production-ready.

## Other launch blockers

These were not changed:

- Signing secrets remain `PRODUCTION_SECRET_TOO_WEAK`
- Object storage remains `CONFIGURATION_REQUIRED` for production. Development storage remains mock / `TEST`
- Backups remain `BACKUP_CONFIGURATION_REQUIRED`
- Monitoring remains `NOT_CONFIGURED`
- Distributed rate limiting remains `NOT_CONFIGURED`
- Bank transfer remains `TEST`; Bitcoin remains `TEST`; USDT and ETH remain `NOT_CONFIGURED`
- VAT remains `TAX_CONFIGURATION_REQUIRED`
- Legal company information remains `NOT_CONFIGURED`; required English policies remain unpublished
- No pilot product is approved for publication
- Loaded `SITE_URL` is not `https://fusionbars.eu`
- Browser, responsive, and accessibility screens were not inspected

## Production

`PAUSED`
