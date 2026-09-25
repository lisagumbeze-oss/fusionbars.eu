# ==============================================================================
# FUSION MUSHROOM BARS EU - PRODUCTION DATABASE PROCEDURE
# PostgreSQL + Prisma ORM on Vercel Serverless Architecture
# ==============================================================================

## 1. Connection Architecture

In the Vercel serverless environment, database connections are managed via two separate URLs:

1. **`DATABASE_URL` (Pooled Connection)**
   - Used by the runtime Next.js serverless functions.
   - Points to a transaction pooler (e.g. PgBouncer on port 6543, Neon connection pooler, or Supabase pooler).
   - Parameters: `?pgbouncer=true&connection_limit=1`
   - Purpose: Prevents serverless lambda concurrency from exceeding PostgreSQL maximum client connections (`max_connections`).

2. **`DIRECT_URL` (Direct TCP Connection)**
   - Used exclusively by the Prisma CLI for executing migrations and introspection.
   - Points directly to the PostgreSQL primary instance (port 5432).
   - Purpose: Migration transactions require advisory locks and session-level DDL commands that are incompatible with transaction-mode connection poolers.

---

## 2. Pre-Migration Backup Procedure

Before executing any schema migration in production:

1. **Trigger Cloud Snapshot:**
   Execute a point-in-time snapshot on the managed PostgreSQL provider (e.g. AWS RDS, Neon, Supabase).
2. **Execute Logical Dump:**
   ```bash
   pg_dump "$DIRECT_URL" \
     --format=custom \
     --file="fusion_eu_backup_$(date +%Y%m%d_%H%M%S).dump" \
     --no-owner \
     --no-privileges
   ```
3. **Verify Dump Integrity:**
   Ensure the generated dump file size is non-zero and verifiable via `pg_restore --list`.

---

## 3. Production Migration Deployment

**CRITICAL POLICY:**
- **NEVER** run `prisma migrate reset` or `prisma db push --force-reset` in production.
- **NEVER** run automatic migrations in the Vercel standard build script (`npm run build`). Migrations must run as a distinct pre-deployment phase.

### Execution Command:
```bash
# Verify pending migrations without modifying schema
npx prisma migrate status

# Apply all unapplied migrations strictly in order
npx prisma migrate deploy
```

---

## 4. Post-Migration Verification

1. **Verify Migration Table:**
   Ensure `_prisma_migrations` records the applied migration with `finished_at IS NOT NULL`.
2. **Execute Health Query:**
   ```bash
   npx tsx -e "
     import { prisma } from './src/lib/prisma';
     async function check() {
       const userCount = await prisma.user.count();
       const orderCount = await prisma.order.count();
       console.log({ status: 'HEALTHY', userCount, orderCount });
       await prisma.\$disconnect();
     }
     check();
   "
   ```

---

## 5. Rollback Considerations

Prisma applies forward-only migrations. In the event of an unexpected migration failure:
1. Identify the failing migration from `npx prisma migrate status`.
2. If data corruption occurred, restore from the pre-migration snapshot taken in Section 2.
3. If an index or constraint was created in error, prepare a targeted forward migration rather than running destructive drop commands.
