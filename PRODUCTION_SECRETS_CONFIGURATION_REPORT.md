# Production Secrets Configuration Report

Date: 2026-10-02

Production control state: `PAUSED`

This closure did not activate production and did not change catalogue, pricing, compliance, country, VAT, payment, email, legal, or shipping configuration.

## Configuration

The values below are the process that loaded the local development environment. No secret value is included.

| Secret | State |
| --- | --- |
| SESSION_SECRET | PRODUCTION_SECRET_TOO_WEAK |
| AUTH_SECRET | PRODUCTION_SECRET_TOO_WEAK |
| ORDER_LOOKUP_SECRET | PRODUCTION_SECRET_TOO_WEAK |

`DISTINCT = PASS` for that local trio: the three values are not identical. They still fail the production strength check, so the launch gate stays `BLOCKED`. One weak secret is enough to keep the gate blocked.

`CONFIGURED` is returned only when a value is present, at least 32 characters, not a known placeholder or UUID, has at least 16 distinct characters, and is different from the other two signing secrets. The test fixture proved that path. The loaded development values do not pass it.

## Environment

| Environment | Separation |
| --- | --- |
| Development | Local `.env` remains the development credential file. It was not overwritten. `.env` and `.env.*` stay gitignored, with `.env.example` as the only tracked example. |
| Preview | Not given these production secrets. No Fusion preview environment was available to configure. |
| Production | Not updated. See Vercel below. |

`.env.example` still contains only the existing placeholders. No production secret was written into source, seed data, Prisma, the example file, or this report.

## Security

- The three signing secrets are classified independently.
- Minimum length is 32 characters. Known project placeholders, development fallbacks, and UUID-shaped values are rejected as `PRODUCTION_SECRET_TOO_WEAK`.
- Two equal signing secrets are `INVALID`, and `DISTINCT = FAIL`.
- The checklist and public health payload return state names only. They do not return the value, a prefix, a suffix, a hash, or a length.
- The admin security table shows `CONFIGURED` or `BLOCKED` for the session, auth, and order-lookup secrets. There is no reveal control.
- `POST /api/health` still does not return secret material. `GET /api/health` returns the high-level health object only.
- `GET /api/readiness` still requires a Super Admin session and returns the checklist states. Against the current local environment those three states are `PRODUCTION_SECRET_TOO_WEAK`.
- None of these variables use a `NEXT_PUBLIC_` prefix.

An audit record for a real rotation contains only: "Production security secret configuration updated." plus the actor, role, environment, and result. No secret was rotated, so that audit was not written as a successful production change.

## Rotation

| Secret | Role | Effect of a change |
| --- | --- | --- |
| SESSION_SECRET | HMAC-SHA256 session signing | Existing sessions fail verification after the process restarts with the new value. That is intentional. A weak secret is not kept as a second verification key. |
| AUTH_SECRET | Bearer compared by the administrative health probe. It does not sign customer or admin session cookies. | The previous bearer stops matching after restart. `EnvironmentService` keeps the value it loaded until the process restarts. |
| ORDER_LOOKUP_SECRET | Mixed into newly generated lookup tokens when the process starts. | Stored lookup tokens are found by the saved token, so outstanding links remain valid. Tokens created after restart use the new secret. |

## Regression

`npm test` covered valid sessions, forged sessions, expired sessions, empty tokens, customer and admin roles, a rejected lookup token, placeholder rejection, duplicate rejection, and public status output. Existing session, authentication, order-lookup, and secret-scrubbing tests were kept.

## Vercel

The Vercel account available on this machine does not contain a Fusion Mushroom Bars project. Its visible projects are unrelated, and a lookup for `fusionbars.eu` was forbidden for that account.

Production and preview secrets were not created there. They were not copied onto the unrelated projects. Preview isolation therefore could not be configured, and the production environment cannot be reported as configured.

No secret value was printed while checking the account.

## Validation

- `npm test`: 218 passed, 0 failed
- `npx tsc --noEmit`: pass
- `npm run build`: pass (`prisma generate`, then `next build`, exit 0)

## Other launch blockers

Unchanged by this closure:

| Area | State |
| --- | --- |
| Object storage | NOT_CONFIGURED |
| Backups | BLOCKED |
| Monitoring | NOT_CONFIGURED |
| Distributed rate limiting | WARNING, still blocking |
| Email, SPF, DKIM, DMARC | BLOCKED / NOT_CONFIGURED |
| Bank and crypto payments | NOT_CONFIGURED |
| VAT | NOT_CONFIGURED |
| Legal company information and policies | NOT_CONFIGURED |
| Catalogue publication | BLOCKED |
| Country eligibility | WARNING, still blocking |
| Browser QA | DEFERRED |
| Canonical `SITE_URL` | Not `https://fusionbars.eu` in the loaded environment |

## Production

`PAUSED`

Final decision remains `LAUNCH_BLOCKED`. The signing-secret blocker is still open because the loaded values are `PRODUCTION_SECRET_TOO_WEAK` and the Vercel production environment for this store was not available to receive replacements.
