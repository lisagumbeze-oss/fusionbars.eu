function withPrismaPoolerParams(url: string): string {
  if (!url.includes('pooler') && !url.includes('6543')) {
    return url;
  }

  const params = new URLSearchParams();
  if (!url.includes('pgbouncer=')) {
    params.set('pgbouncer', 'true');
  }
  if (!url.includes('connection_limit=')) {
    params.set('connection_limit', '1');
  }

  const query = params.toString();
  if (!query) {
    return url;
  }

  return url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
}

export function resolveDatabaseUrls() {
  if (!process.env.DATABASE_URL) {
    const pooled =
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL_UNPOOLED;

    if (pooled) {
      process.env.DATABASE_URL = withPrismaPoolerParams(pooled);
    }
  }

  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL =
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL;
  }
}
