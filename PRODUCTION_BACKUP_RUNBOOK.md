# Production Backup Runbook

Date: 2026-10-02

Production control state: `PAUSED`

This runbook describes recovery for the Neon PostgreSQL database used by Fusion Mushroom Bars EU. It does not record a retention period, a recovery-point objective, a recovery-time objective, a snapshot id, or an emergency phone number. Those values are not configured.

A catalogue import file in the repository is not a database backup. A local disk, the Vercel filesystem, and a successful `prisma migrate status` are not database backups.

## Backup

### Provider

The connected database host family is Neon. Neon can provide branch history and point-in-time restore as a platform feature. This project has not confirmed that the feature is enabled, and it has not read a retention window.

`BACKUP_PROVIDER` is the application name for that host family. Setting it to `neon` does not prove that a backup exists.

### Configuration

| Item | Current state |
| --- | --- |
| Provider variable | `MISSING` in the loaded development environment |
| Backup enabled | `UNKNOWN` |
| Recovery copy | `UNKNOWN` |
| Retention | `RETENTION_POLICY_NOT_CONFIGURED` |
| Point-in-time recovery for this project | `NOT_CONFIGURED` |
| Encryption of backups | `UNKNOWN` |
| Application backup credentials | None. The application must not receive Neon management credentials. |

### Frequency

Not configured. Do not assume an interval.

### Retention

`RETENTION_POLICY_NOT_CONFIGURED`. Read the retention value from the Neon project when an authorized operator has access. Do not type a number into this runbook until that value is known.

### Verification

A backup is verified only when the provider shows a recovery copy and a successful backup time. A checkbox, a hostname, or `DATABASE_URL` connectivity is not verification.

The loaded state is `BACKUP_CONFIGURATION_REQUIRED`. The last verified backup is `NOT_RUN`.

## Restore

### Recovery target

Restore only to a new Neon branch or another empty PostgreSQL database that is not the production branch.

Do not point the production application, preview, payment provider, email provider, object storage, or the public site at the restored database.

Keep the restore connection string in the operator's shell for the rehearsal. Do not commit it, do not place it in `.env.example`, and do not give it to the running storefront.

### Steps

1. Confirm production is still `PAUSED`.
2. In the Neon project, read whether history or branch restore is enabled and what retention is actually set. If it is not shown, stop and leave the gate at `BACKUP_CONFIGURATION_REQUIRED`.
3. Create a new branch from the production branch at a chosen history timestamp. Do not replace the production branch.
4. Create a role limited to that new branch. Do not reuse the production application role for destructive backup administration.
5. Export the new branch connection string only into the operator shell as a restore URL.
6. Run `npx prisma migrate status` against that restore URL. Do not run `prisma migrate reset` or `prisma db push`.
7. Confirm Prisma can query the expected models. Check that product variants, order items, product images, payments, inventory, and audit rows are structurally present. Record `PRESENT`, `MISSING`, or `QUERY_FAILED`. Do not print customer, payment, or address rows.
8. On the restored branch only, run one fixture order and one deliberate failed transaction. Confirm the failed transaction leaves no partial order. Do not use a real customer order.
9. Confirm the storefront environment still uses the original production branch, mock or unconfigured email, and inactive payments.
10. Delete the rehearsal branch in Neon after the notes are recorded.

### Validation

The rehearsal passes only when the application reads the restored branch, the schema matches the release, and the foreign keys used by orders and variants still hold. Provider status `RESTORE_COMPLETE` is not enough.

### Cleanup

Delete the rehearsal branch and discard the restore connection string from the operator shell. Do not leave a long-lived copy of production customer data attached to preview or to a developer machine.

## Incident

### Backup failure

Record the time, the safe error category, and a correlation id. Move the launch backup gate back to the blocked state that matches the failure. Do not mark the system ready. Do not change `PAUSED` automatically.

### Restore failure

Set the rehearsal result to `RESTORE_REHEARSAL_FAILED`. Record the time, the fact that the target was a non-production branch, the failure category, a correlation id, and the operator role. Do not claim recovery. Do not repair the restored branch with `prisma migrate reset` or `prisma db push`.

### Escalation

The Super Admin who operates Launch Control reviews the backup panel and `GET /api/readiness`. Customers and other admin roles do not receive the detailed backup report. No external on-call number is configured.
