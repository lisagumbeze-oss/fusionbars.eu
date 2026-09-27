import fs from 'fs';
import path from 'path';
import {
  AdminOverrides,
  CustomerDirectoryOverride,
  ProductCommercialOverride,
  StoreOperationsSettings,
} from '@/domain/admin/AdminOverrides';

const filePath = path.join(process.cwd(), 'data', 'admin-overrides.json');

interface StoredOverrides {
  settings?: StoreOperationsSettings | null;
  products?: Record<string, ProductCommercialOverride>;
  customers?: Record<string, CustomerDirectoryOverride>;
}

let loaded = false;

export function ensureAdminOverridesLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as StoredOverrides;
    if (parsed.settings) AdminOverrides.hydrate(parsed.settings);
    for (const [slug, patch] of Object.entries(parsed.products || {})) {
      AdminOverrides.saveProduct(slug, patch);
    }
    for (const [email, patch] of Object.entries(parsed.customers || {})) {
      AdminOverrides.saveCustomer(email, patch);
    }
  } catch {
    // No saved overrides yet.
  }
}

export function persistAdminOverrides() {
  ensureAdminOverridesLoaded();
  const snapshot = AdminOverrides.dump();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
}
