# Production Security Hardening

Phase 19 hardens deployment readiness. It does not activate production, email, or payments, and it does not generate or print secrets.

Production control state: `PAUSED`.

Current launch evaluation: `BLOCKED`. There is no overall readiness score. Each requirement stays `READY`, `WARNING`, or `BLOCKED`.

## Infrastructure

### Database

`DATABASE_URL` and `DIRECT_URL` are `CONFIGURED`. Their values are not shown.

The launch probe only runs `SELECT 1`. In this environment that probe succeeded. It does not prove the schema matches the Prisma client. During `npm test`, live queries failed because `Customer.preferredCurrency` is missing and order creation requires a `shippingMethod` relation. That is schema drift on the connected database. No migration was applied in this phase.

Production migration procedure:

1. `npx prisma migrate status` against the intended database, using `DIRECT_URL`.
2. Confirm the pending list is the repository migration order (`prisma/migrations`, currently `0_init`).
3. Take a provider backup first. This application does not have one configured.
4. Run `npx prisma migrate deploy` explicitly. Do not use `prisma db push`.
5. Record the command result outside the application. Do not write connection strings into that record.
6. If deploy fails, stop. Do not continue into a partial launch.

`prisma migrate reset` and `prisma db push` are rejected by `ProductionInfrastructureService.assertProductionMigrationCommand`. A reset was not run.

Prisma on Vercel should keep using the pooled `DATABASE_URL` at runtime and `DIRECT_URL` for migrations. A SQLite or localhost database is rejected when the environment mode is `production`.

### Storage

Object storage is `CONFIGURATION_REQUIRED`. The current provider is the mock provider. Payment proofs stay on private keys. Public `http` evidence URLs are rejected. No production bucket, endpoint, or key is invented here.

### Environment

The loaded environment is not a production deployment:

- `SITE_URL` is `http://localhost:3000` (`WARNING`). The canonical production host remains `https://fusionbars.eu`.
- Email provider is not an active production provider (`REVIEW_REQUIRED` on the public health view; launch email check is `BLOCKED` because SPF is `NOT_CONFIGURED`).
- Mock email is rejected when `VERCEL_ENV` is `production`.
- A non-mock email provider is rejected when `VERCEL_ENV` is `preview`.
- Preview must use its own database. This phase does not point preview at the production database.

Public environment variables in use are `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_SMARTSUPP_KEY`. The chat key is public because the storefront widget needs it. Secrets do not use the `NEXT_PUBLIC_` prefix.

### Deployment

Target runtime is Vercel with Next.js App Router and Node.js 22, as documented in `.env.example`. Admin routes are gated in `src/proxy.ts` and again in server actions. No extra host was added beside Vercel.

`npm run build` runs `prisma generate && next build`. `prisma generate` failed with `EPERM` renaming `query_engine-windows.dll.node` because another process has the engine open. The dev server was left running. `npx next build` was used to compile the application and completed successfully, including `/api/health` and `/api/readiness`.

## Security

### Already present

- Customer and admin passwords are bcrypt hashes. Plaintext passwords are not stored.
- Session cookies are `HttpOnly`, `SameSite=strict`, and `secure` when `NODE_ENV` is `production`.
- Admin pages redirect unsigned users to login. Server actions and RBAC still decide authority. Hidden buttons are not the control.
- Customer role cannot open admin payment controls or verify payments.
- Content role cannot publish catalogue products.
- Order lookup, login, password reset, contact, and checkout have rate-limit actions. Without Upstash this process uses an in-memory window, which launch control marks `WARNING`.
- Checkout totals, shipping, and tax come from the server. Client cart input is variant and quantity.
- Payment proof submission does not verify a payment. Duplicate references are rejected. Amount mismatch stays `AMOUNT_MISMATCH`.
- Email handoff stays idempotent. Secrets are scrubbed from delivery failures. Production email stays inactive.
- Legal drafts stay unpublished. Audit Test Product stays `DO_NOT_PUBLISH`.
- Prisma queries used by the application are parameterized. The raw probes are `` prisma.$queryRaw`SELECT 1` ``.
- There is no unrestricted image-proxy route.
- Upload checks cover extension, MIME, size, and executable content. HTML uploads fail that check.
- Payment evidence is not served from a public path.

### Added in this phase

- Session tokens are HMAC-SHA256. A forged signature is rejected. An expired token is rejected. Production refuses to sign when `SESSION_SECRET` is shorter than 32 characters (`PRODUCTION_SECRET_TOO_WEAK`). No secret was generated or written into the environment.
- Secret checklist reports `CONFIGURED`, `MISSING`, or `PRODUCTION_SECRET_TOO_WEAK` and does not return values.
- `GET /api/health` returns application, database, storage, email, and payment categories only. Current public status is `CONFIGURATION_REQUIRED`.
- `GET /api/readiness` returns the checklist only to a Super Admin session. Everyone else receives 401.
- Backups report `BACKUP_CONFIGURATION_REQUIRED` until `BACKUP_PROVIDER` is set from the real database host.
- Monitoring reports `NOT_CONFIGURED` until `MONITORING_DSN` is set. Structured logs are not treated as an external monitor.
- Admin `next` redirects stay inside `/{locale}/admin`.
- Sensitive route headers include `Cache-Control: private, no-store`.
- Content-Security-Policy `frame-ancestors` is `'self'`.
- Cryptocurrency price fetches allow only EUR/GBP and BTC, ETH, BCH, USDT, and only the existing CoinGecko and Coinbase hosts.
- Unsigned or unconfigured webhooks are rejected. No provider signature verifier was invented.
- Structured logs redact passwords, database URLs, API keys, and private-key material, and can carry a correlation id.

### Deliberate header exceptions

`script-src` still allows `'unsafe-inline'` and `'unsafe-eval'` because the current Next.js build and the Smartsupp widget need them. Image sources still allow `https:` for catalogue media. Those exceptions were not tightened in this phase because doing so without a browser pass would risk breaking the storefront. Framing is limited to this origin.

### Current secret state

From the checklist, with no values:

| Name | State |
| --- | --- |
| `SESSION_SECRET` | `PRODUCTION_SECRET_TOO_WEAK` |
| `AUTH_SECRET` | `PRODUCTION_SECRET_TOO_WEAK` |
| `ORDER_LOOKUP_SECRET` | `PRODUCTION_SECRET_TOO_WEAK` |
| `DATABASE_URL` | `CONFIGURED` |
| `DIRECT_URL` | `CONFIGURED` |
| `EMAIL_PROVIDER_KEY` | `CONFIGURED` |
| `UPSTASH_REDIS_REST_URL` | `MISSING` |
| `UPSTASH_REDIS_REST_TOKEN` | `MISSING` |

The three weak secrets need replacement with distinct 32+ character values before production. They were not rotated automatically. Treat the current values as credentials to replace.

`.env` is gitignored. The tracked env file is `.env.example`, and it contains placeholders. No new secret was committed.

## Commerce

Checkout still recalculates price and shipping. A client-supplied unit price does not change the server subtotal. A disabled destination (`US` in the current store list) blocks checkout. Publication of Audit Test Product remains `DO_NOT_PUBLISH`. Payment activation and production email activation stay blocked while production is paused.

Inventory reservation behavior from earlier phases was not weakened. This phase did not run a live concurrent purchase against the drifted database.

## Observability

- Application logs are structured JSON in production and scrub secrets.
- Correlation ids can be attached to those logs.
- External monitoring is `NOT_CONFIGURED`. No dashboard is claimed.
- `GET /api/health` is the public probe.
- `GET /api/readiness` is the authenticated checklist.
- Alerting is not configured.

## Resilience

### Backups

`BACKUP_CONFIGURATION_REQUIRED`. A written procedure is not a backup. Frequency, retention, and recovery point are unset until the database host's backup feature is actually enabled and `BACKUP_PROVIDER` names that configuration. Backup credentials must stay out of application logs.

### Restore

Use a separate non-production database. Restore the provider snapshot there, then check catalogue, pricing, orders, payments, customers, and audit history before any cutover. This phase did not restore anything and did not write over the connected database.

### Rollback

- Application: redeploy the previous Vercel deployment. That does not undo database writes.
- Database: do not assume a migration can be reversed. Add a forward-fix migration when a backward migration is unsafe.
- Pricing, shipping, email activation, and payment activation are configuration changes. Disable the method or provider. Do not delete orders to undo a configuration change.
- Production stays `PAUSED`, so those activations are not live.

### Incident checklist

No external contact was invented. For an outage, database failure, payment problem, email outage, unexpected admin access, suspicious order, data exposure, or storage failure:

1. Detect it from health, readiness, or a scrubbed application log. Note the correlation id.
2. Contain it by keeping production `PAUSED`, disabling the affected payment or email path, and invalidating admin sessions if access is suspect.
3. Recover from a known deployment or a tested non-production restore. Do not guess missing configuration.
4. Record the actor, time, and action in the existing audit log. Do not put secrets in that record.
5. Tell operations through the already configured mailbox `sales@fusionbars.eu` only after the email path is actually able to deliver. Until then, use the operator's existing channel.

### Retention

Retained categories are customer accounts, orders, payment records, payment evidence, audit logs, consent records, email delivery logs, and catalogue provenance. Retention periods are `NOT_CONFIGURED`. Account deletion must not be implemented as a wipe of orders, payments, or audit history until a retention rule exists.

## Dependency security

`npm audit` reported one finding:

- Package: `esbuild@0.27.7` (direct via Vite; `tsx` uses `esbuild@0.28.2`, which is outside the affected range)
- Severity: low
- Advisory: GHSA-g7r4-m6w7-qqqr, arbitrary file read when the esbuild development server runs on Windows
- Production path: the Vercel runtime is Next.js, not the esbuild dev server
- Fix: available upstream, not applied. A Vite/esbuild upgrade was not made in this phase.

No postinstall script was added. The lockfile remains the installed dependency source.

## Launch blockers

- Production is `PAUSED`.
- `SESSION_SECRET`, `AUTH_SECRET`, and `ORDER_LOOKUP_SECRET` are `PRODUCTION_SECRET_TOO_WEAK`.
- Connected database schema does not match the Prisma client (`preferredCurrency`, `shippingMethod`).
- Backups are `BACKUP_CONFIGURATION_REQUIRED`.
- Monitoring destination is `NOT_CONFIGURED`.
- Object storage is still the mock provider.
- Distributed rate limiting is `MISSING` (in-memory only).
- Bank transfer credentials are not supplied.
- Bitcoin receiving address is empty or a development placeholder.
- Email is blocked. SPF is `NOT_CONFIGURED`. DKIM and DMARC were already `NOT_CONFIGURED`.
- Loaded `SITE_URL` is `http://localhost:3000`.
- Legal company name, registration, and VAT still contain placeholders. Required policies are not published.
- `npm run build` cannot regenerate the Prisma client while the Windows query engine DLL is locked.

## Security tests

`Production Security Hardening` passed. It covers unauthorized admin payment access, content-role publication, expired and forged sessions, an invalid reset token, order-lookup rate limiting, a client price, a client shipping amount, a disabled country, Audit Test Product, a metadata URL, an HTML upload, an open redirect, a duplicate payment reference, a duplicate email claim, a stale publish of the audit product, an unsigned webhook, missing backup and monitoring configuration, mock email in production, a forbidden migration command, and secret scrubbing.

This is not a professional penetration test.

Deferred: a live concurrent inventory race against the drifted database, a real restore test, and a browser pass of the tightened framing header. No browser session was available for admin clicks.

## Validation

- `npm test`: 215 passed, 0 failed
- `npx tsc --noEmit`: pass
- `npm run build`: fail at `prisma generate` (`EPERM` on `query_engine-windows.dll.node`)
- `npx next build`: pass

## Production

`PAUSED`
