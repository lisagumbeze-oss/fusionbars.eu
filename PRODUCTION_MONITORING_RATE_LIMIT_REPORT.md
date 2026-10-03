# Production Monitoring and Rate Limit Report

Date: 2026-10-02

Production control state: `PAUSED`

Final launch decision remains `LAUNCH_BLOCKED`. This closure did not change catalogue decisions, pricing, VAT, country eligibility, shipping, payments, email, legal documents, object storage, backups, production secrets, or publication state.

## Monitoring

| Item | State |
| --- | --- |
| Provider | None. The application accepts an HTTPS ingest URL in `MONITORING_DSN` or `MONITORING_WEBHOOK_URL`. |
| Loaded configuration | `NOT_CONFIGURED` |
| Connectivity | `NOT_RUN` |
| Operational state | `NOT_CONFIGURED` |
| Controlled signal | `NOT_RUN` |
| Alerting | `NOT_CONFIGURED` |
| Last failure | None |

`MONITORING_DSN`, `SENTRY_DSN`, and `MONITORING_WEBHOOK_URL` are absent. No DSN or webhook was invented, and no live signal was sent.

Structured logs remain in the application. They are not external monitoring. `OPERATIONAL` requires a valid HTTPS destination and an accepted `FUSION_MONITORING_TEST`. A present variable would only reach `CONFIGURED` until that signal succeeds.

The test payload is limited to the event name, environment, severity, correlation id, release identifier, and timestamp. Alert rules were not created. Accepting an event is not an alert path.

Application error helpers exist for database, checkout, payment, email, upload, and rate-limit failures. Those helpers write structured logs. They are not delivered to an external monitor while the destination is `NOT_CONFIGURED`.

## Rate limiting

| Item | State |
| --- | --- |
| Provider | Upstash Redis REST, through the existing limiter |
| Loaded URL | `MISSING` |
| Loaded token | `MISSING` |
| Connectivity | `NOT_RUN` |
| Shared enforcement | `NOT_RUN` |
| Operational state | `NOT_CONFIGURED` |
| Mode | `IN_MEMORY_ONLY` |
| Failure mode | `FAIL_CLOSED` for the distributed store |
| Development | In-memory window |
| Preview | Does not attach a target marked `production` |

No Upstash URL or token was invented. No live Redis call was made.

Existing limits were kept:

| Action | Window | Maximum | Enforced on a route |
| --- | --- | --- | --- |
| login | 15 minutes | 10 | Yes |
| registration | 1 hour | 5 | Yes |
| password_reset | 1 hour | 5 | Yes, on the reset request |
| email_verification | 1 hour | 10 | Policy exists. No public route calls it. |
| guest_order_lookup | 10 minutes | 20 | Yes |
| payment_proof_submission | 15 minutes | 10 | Yes |
| admin_auth | 15 minutes | 5 | Yes |
| newsletter_contact | 10 minutes | 5 | Yes |
| public_order_creation | 10 minutes | 15 | Yes |

Catalogue and public search routes do not have an existing limiter policy. No new limit was added for them.

Keys use the route plus a normalized email, order reference, or the literal `token` for a token-only lookup. Passwords, session secrets, payment proofs, and raw tokens are not used as keys.

A simulated pair of limiter instances sharing one counter enforced the same limit. That simulation is not a live Upstash proof, so the loaded state stays `NOT_CONFIGURED`.

When the distributed store cannot be reached, the request is denied and a safe `REDIS_UNAVAILABLE` category is logged with a correlation id. The customer message does not include the provider error, URL, or token.

## Security

- Public health reports `monitoring.status` and `rateLimit.status` only.
- Detailed readiness stays on `GET /api/readiness` for Super Admin.
- Customers and other admin roles do not receive the detailed reports.
- Test actions require Super Admin and an explicit confirmation string.
- Audit text records the result, not a DSN, token, or URL.
- The previous session, lookup, price, shipping, payment, redirect, SSRF, and upload regressions remain in the suite.

## Vercel

Production can attach a valid Upstash REST client with `fetch`. It does not use a local file or a process-global counter as the production limiter. Development keeps memory. Preview is refused when `UPSTASH_TARGET=production`. The loaded environment has neither a production Redis database nor a production monitor.

## Validation

| Command | Result |
| --- | --- |
| `npm test` | 221 passed, 0 failed |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed |

The launch screens were not clicked. Admin routes require a session.

## Other launch blockers

These were not changed:

- Signing secrets remain `PRODUCTION_SECRET_TOO_WEAK`
- Object storage remains `CONFIGURATION_REQUIRED` for production. Development storage remains mock / `TEST`
- Backups remain `BACKUP_CONFIGURATION_REQUIRED`
- Monitoring remains `NOT_CONFIGURED`
- Distributed rate limiting remains `NOT_CONFIGURED`
- Email remains `REVIEW_REQUIRED`; SPF, DKIM, and DMARC remain `NOT_CONFIGURED`
- Bank transfer remains `TEST`; Bitcoin remains `TEST`; USDT and ETH remain `NOT_CONFIGURED`
- VAT remains `TAX_CONFIGURATION_REQUIRED`
- Legal company information remains `NOT_CONFIGURED`; required English policies remain unpublished
- No pilot product is approved for publication
- Loaded `SITE_URL` is not `https://fusionbars.eu`
- Browser, responsive, and accessibility screens were not inspected

## Production

`PAUSED`
