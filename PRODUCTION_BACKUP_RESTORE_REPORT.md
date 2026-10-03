# Production Backup and Restore Report

Date: 2026-10-02

Production control state: `PAUSED`

Final launch decision remains `LAUNCH_BLOCKED`. This closure did not change catalogue decisions, pricing, VAT, compliance, country eligibility, shipping, email, payment activation, legal documents, production secrets, object storage, or the launch state.

## Provider

| Item | State |
| --- | --- |
| Database host family | Neon PostgreSQL |
| Database name previously confirmed | `neondb` |
| Platform capability | Neon branch history and point-in-time restore |
| Capability verified for this project | No |
| Readiness state | `BACKUP_CONFIGURATION_REQUIRED` |

The host family was classified from the configured connection without recording the endpoint, username, or password. `NEON_API_KEY`, `NEON_PROJECT_ID`, `BACKUP_PROVIDER`, and a restore URL are absent. No snapshot was listed, and no second database was created.

## Configuration

| Item | State |
| --- | --- |
| `BACKUP_PROVIDER` | `MISSING` |
| Backup enabled | `UNKNOWN` |
| Retention | `RETENTION_POLICY_NOT_CONFIGURED` |
| Point-in-time recovery | `NOT_CONFIGURED` for this project |
| Backup encryption | `UNKNOWN` |
| Recovery-point objective | `NOT_CONFIGURED` |
| Recovery-time objective | `NOT_CONFIGURED` |
| Maximum backup age | `NOT_CONFIGURED` |

A matching provider name would be reported as `CONFIGURED` for that variable only. It still cannot move the gate to `BACKUP_READY`. No backup credential is stored in the application.

## Backup verification

Latest verified backup: `NOT_RUN`

Verification result: `UNVERIFIED`

There is no recovery copy on record. A working `DATABASE_URL` and an up-to-date migration history were not treated as a backup.

## Restore

| Check | Result |
| --- | --- |
| Target environment | Not created. Production was not overwritten. |
| Restore result | `NOT_RUN` |
| Schema validation | `NOT_CHECKED` |
| Catalogue structure | `NOT_CHECKED` |
| Customer structure | `NOT_CHECKED` |
| Order structure | `NOT_CHECKED` |
| Payment structure | `NOT_CHECKED` |
| Inventory structure | `NOT_CHECKED` |
| Audit structure | `NOT_CHECKED` |
| Order persistence smoke test | `NOT_RUN` |
| Inventory concurrency fixture | `NOT_RUN` |

`prisma migrate status` was not run against a restored database because no restored database exists. `prisma migrate reset` and `prisma db push` were not used.

The state machine can represent `BACKUP_CONFIGURED`, `BACKUP_VERIFIED`, `RESTORE_REHEARSAL_REQUIRED`, `RESTORE_REHEARSED`, `RESTORE_REHEARSAL_FAILED`, `BACKUP_ERROR`, and `BACKUP_READY`. The loaded environment does not reach those states. `BACKUP_READY` also requires a configured retention policy, which is not set.

## Security

- `GET /api/health` adds `backup.status`. For this environment that status is `BACKUP_CONFIGURATION_REQUIRED`.
- `GET /api/readiness` returns the detailed backup report to a Super Admin session only.
- Customers, finance managers, and catalogue managers do not receive that report.
- There is no application action that writes backup credentials.
- Connection strings, snapshot URLs, and customer rows are not included in the readiness payload.
- A restore that is not marked isolated is `RESTORE_REHEARSAL_FAILED`.
- A backup failure does not change `PAUSED` by itself. Launch Control keeps the backup requirement blocked.

## Monitoring

Backup success and failure are not connected to an external monitor. Monitoring remains `NOT_CONNECTED` for backups and `NOT_CONFIGURED` for the application monitor.

## Runbook

`PRODUCTION_BACKUP_RUNBOOK.md`

The procedure is to read the real Neon retention setting, restore onto a new branch, validate schema and structure without printing customer data, and delete that branch. That procedure has not been executed.

## Launch control

`/admin/system/launch` shows provider, configuration, state, restore, retention, and the last verified backup time. That screen was not clicked. Admin routes require a session.

## Validation

| Command | Result |
| --- | --- |
| `npm test` | 220 passed, 0 failed |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed |

## Other launch blockers

These were not changed:

- Signing secrets remain `PRODUCTION_SECRET_TOO_WEAK`
- Object storage remains `CONFIGURATION_REQUIRED` for production. The development provider remains mock / `TEST`
- Backups remain `BACKUP_CONFIGURATION_REQUIRED`
- Monitoring remains `NOT_CONFIGURED`
- Upstash rate-limit variables remain missing
- Email remains `REVIEW_REQUIRED`; SPF, DKIM, and DMARC remain `NOT_CONFIGURED`
- Bank transfer remains `TEST`; Bitcoin remains `TEST`; USDT and ETH remain `NOT_CONFIGURED`
- VAT remains `TAX_CONFIGURATION_REQUIRED`
- Legal company information remains `NOT_CONFIGURED`; required English policies remain unpublished
- No pilot product is approved for publication
- Loaded `SITE_URL` is not `https://fusionbars.eu`
- Browser, responsive, and accessibility screens were not inspected

## Production

`PAUSED`
