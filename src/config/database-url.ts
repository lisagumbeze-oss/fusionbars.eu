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

function withMinimumParam(url: string, key: string, minimum: number): string {
  if (!url) return url;
  const [base, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  const current = Number(params.get(key));
  if (!params.has(key) || !Number.isFinite(current) || current < minimum) {
    params.set(key, String(minimum));
  }
  const next = params.toString();
  return next ? `${base}?${next}` : base;
}

function withConnectTimeout(url: string): string {
  return withMinimumParam(withMinimumParam(url, 'connect_timeout', 30), 'pool_timeout', 30);
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

  if (process.env.DATABASE_URL) process.env.DATABASE_URL = withConnectTimeout(process.env.DATABASE_URL);
  if (process.env.DIRECT_URL) process.env.DIRECT_URL = withConnectTimeout(process.env.DIRECT_URL);
}
