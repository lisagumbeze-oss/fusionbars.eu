export type SecretReadinessState = 'CONFIGURED' | 'MISSING' | 'PRODUCTION_SECRET_TOO_WEAK' | 'INVALID';

export const SIGNING_SECRET_NAMES = ['SESSION_SECRET', 'AUTH_SECRET', 'ORDER_LOOKUP_SECRET'] as const;

const KNOWN_VALUES = new Set([
  'change_me_in_production_min_32_char_hmac_secret',
  'change_me_in_production_min_32_char_lookup_secret',
  'change_me_in_production_min_32_char_auth_secret',
  'dev_insecure_session_secret_32char_minimum!',
  'dev_insecure_order_secret_32char_min!',
  'dev_insecure_auth_secret_32char_minim!',
  'fusion-eu-secure-session-secret-2026',
  'fusion-eu-order-lookup-secret-2026',
  'your-secret-here',
  'replace-me',
  'changeme',
  'change-me',
  'secret',
  'password',
  'development',
  'test',
  'example',
  'secret123',
  'placeholder',
  'test_secret',
  '12345678',
]);

const MARKERS = [
  'change_me',
  'change-me',
  'changeme',
  'dev_insecure',
  'your-secret-here',
  'your_secret_here',
  'replace-me',
  'replace_me',
  'placeholder',
  'test_secret',
  'secret123',
  '12345678',
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function placeholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (KNOWN_VALUES.has(normalized)) return true;
  return MARKERS.some((marker) => normalized.includes(marker));
}

function strong(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 32) return false;
  if (placeholder(trimmed) || UUID_PATTERN.test(trimmed)) return false;
  return new Set(trimmed).size >= 16;
}

export function classifySigningSecrets(source: Record<string, string | undefined>) {
  const rows = SIGNING_SECRET_NAMES.map((name) => ({ name, value: (source[name] || '').trim() }));
  const states = new Map<string, SecretReadinessState>();
  for (const row of rows) {
    if (!row.value) states.set(row.name, 'MISSING');
    else if (!strong(row.value)) states.set(row.name, 'PRODUCTION_SECRET_TOO_WEAK');
    else states.set(row.name, 'CONFIGURED');
  }
  let duplicated = false;
  for (let index = 0; index < rows.length; index += 1) {
    for (let other = index + 1; other < rows.length; other += 1) {
      if (rows[index].value && rows[index].value === rows[other].value) {
        duplicated = true;
        states.set(rows[index].name, 'INVALID');
        states.set(rows[other].name, 'INVALID');
      }
    }
  }
  return {
    secrets: SIGNING_SECRET_NAMES.map((name) => ({ name, state: states.get(name) || 'MISSING' })),
    distinct: duplicated ? 'FAIL' as const : 'PASS' as const,
  };
}

export function secretConfigurationAudit(params: { actor: string; role: string; environment: string; result: string }) {
  return {
    action: 'PRODUCTION_SECRET_CONFIGURATION',
    entityType: 'Security',
    entityId: 'signing-secrets',
    actorId: params.actor,
    actorRole: params.role,
    metadata: JSON.stringify({
      message: 'Production security secret configuration updated.',
      category: 'production-secrets',
      actor: params.actor,
      role: params.role,
      environment: params.environment,
      result: params.result,
      at: new Date().toISOString(),
    }),
  };
}
