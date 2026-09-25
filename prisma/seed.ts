import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function runSeed() {
  console.log('Seeding Fusion Mushroom Bars EU database...');

  // 1. ROLES & PERMISSIONS
  const permissionsData = [
    { action: 'catalog:read', description: 'View products and inventory' },
    { action: 'catalog:write', description: 'Create and update products' },
    { action: 'orders:read', description: 'View customer orders' },
    { action: 'orders:write', description: 'Manage fulfillment and order notes' },
    { action: 'orders:verify_payment', description: 'Confirm or reject payment submissions' },
    { action: 'finance:read', description: 'View financial reports and transactions' },
    { action: 'finance:write', description: 'Configure payment methods and bank details' },
    { action: 'content:write', description: 'Manage translations, pages and blog' },
    { action: 'settings:read', description: 'Read system settings' },
    { action: 'settings:write', description: 'Modify global site and shipping settings' },
  ];

  const permissions: Record<string, any> = {};
  for (const p of permissionsData) {
    permissions[p.action] = await prisma.permission.upsert({
      where: { action: p.action },
      update: { description: p.description },
      create: p,
    });
  }

  const rolesData = [
    {
      name: 'SUPER_ADMIN',
      description: 'Full system and governance authority',
      perms: Object.keys(permissions),
    },
    {
      name: 'CATALOG_MANAGER',
      description: 'Manage products, categories, stock, and country restrictions',
      perms: ['catalog:read', 'catalog:write', 'content:write'],
    },
    {
      name: 'ORDER_MANAGER',
      description: 'Fulfill orders, adjust shipping origins, manage discreet dispatches',
      perms: ['catalog:read', 'orders:read', 'orders:write'],
    },
    {
      name: 'FINANCE_MANAGER',
      description: 'Audit SEPA bank transfers and cryptocurrency proofs',
      perms: ['orders:read', 'orders:verify_payment', 'finance:read', 'finance:write'],
    },
    {
      name: 'CONTENT_MANAGER',
      description: 'Publish localized content, blog posts, and legal documentation',
      perms: ['content:write', 'catalog:read'],
    },
    {
      name: 'CUSTOMER',
      description: 'Standard registered customer',
      perms: [],
    },
  ];

  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: {
        name: r.name,
        description: r.description,
      },
    });

    for (const permAction of r.perms) {
      const perm = permissions[permAction];
      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  // 2. LANGUAGES
  const languages = [
    { code: 'en', name: 'English', isDefault: true, isActive: true },
    { code: 'de', name: 'Deutsch', isDefault: false, isActive: true },
    { code: 'fr', name: 'Français', isDefault: false, isActive: true },
    { code: 'es', name: 'Español', isDefault: false, isActive: true },
    { code: 'it', name: 'Italiano', isDefault: false, isActive: true },
    { code: 'nl', name: 'Nederlands', isDefault: false, isActive: true },
  ];

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: lang,
      create: lang,
    });
  }

  // 3. CURRENCIES & RATES
  await prisma.currency.upsert({
    where: { code: 'EUR' },
    update: { name: 'Euro', symbol: '€', isDefault: true, isActive: true },
    create: { code: 'EUR', name: 'Euro', symbol: '€', isDefault: true, isActive: true },
  });

  await prisma.currency.upsert({
    where: { code: 'GBP' },
    update: { name: 'British Pound', symbol: '£', isDefault: false, isActive: true },
    create: { code: 'GBP', name: 'British Pound', symbol: '£', isDefault: false, isActive: true },
  });

  await prisma.currencyRate.upsert({
    where: {
      baseCurrencyCode_targetCode: {
        baseCurrencyCode: 'EUR',
        targetCode: 'GBP',
      },
    },
    update: { rateMultiplier: 0.85 },
    create: {
      baseCurrencyCode: 'EUR',
      targetCode: 'GBP',
      rateMultiplier: 0.85,
    },
  });

  // 4. FULFILMENT HUBS (4 Origins: NL, ES, DE, FR)
  const hubs = [
    { code: 'NL', name: 'Netherlands Fulfilment Hub', countryCode: 'NL' },
    { code: 'ES', name: 'Spain Fulfilment Hub', countryCode: 'ES' },
    { code: 'DE', name: 'Germany Fulfilment Hub', countryCode: 'DE' },
    { code: 'FR', name: 'France Fulfilment Hub', countryCode: 'FR' },
  ];

  for (const hub of hubs) {
    await prisma.inventoryLocation.upsert({
      where: { code: hub.code },
      update: { name: hub.name, countryCode: hub.countryCode, isActive: true },
      create: { code: hub.code, name: hub.name, countryCode: hub.countryCode, isActive: true },
    });
  }

  // 5. SHIPPING ZONES & RATES
  const euZone = await prisma.shippingZone.upsert({
    where: { id: 'zone-eu-core' },
    update: { name: 'European Union Core' },
    create: { id: 'zone-eu-core', name: 'European Union Core' },
  });

  const euCountries = [
    { code: 'NL', name: 'Netherlands' },
    { code: 'ES', name: 'Spain' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'BE', name: 'Belgium' },
    { code: 'AT', name: 'Austria' },
    { code: 'PT', name: 'Portugal' },
    { code: 'IE', name: 'Ireland' },
    { code: 'LU', name: 'Luxembourg' },
  ];

  for (const c of euCountries) {
    await prisma.shippingCountry.upsert({
      where: { code: c.code },
      update: { name: c.name, zoneId: euZone.id },
      create: { code: c.code, name: c.name, zoneId: euZone.id },
    });
  }

  const standardMethod = await prisma.shippingMethod.upsert({
    where: { code: 'STANDARD' },
    update: { name: 'Standard Discreet Courier', estimatedDays: '2-4 business days' },
    create: { code: 'STANDARD', name: 'Standard Discreet Courier', estimatedDays: '2-4 business days' },
  });

  const expressMethod = await prisma.shippingMethod.upsert({
    where: { code: 'EXPRESS' },
    update: { name: 'Express Priority Courier', estimatedDays: '1-2 business days' },
    create: { code: 'EXPRESS', name: 'Express Priority Courier', estimatedDays: '1-2 business days' },
  });

  // EUR Standard = 1500 (€15.00), Free threshold = 30000 (€300.00)
  // Optional GBP configurable rates
  await prisma.shippingRate.upsert({
    where: {
      zoneId_methodId: {
        zoneId: euZone.id,
        methodId: standardMethod.id,
      },
    },
    update: {
      rateEUR: 1500,
      rateGBP: 1300,
      freeThresholdEUR: 30000,
      freeThresholdGBP: 26000,
    },
    create: {
      zoneId: euZone.id,
      methodId: standardMethod.id,
      rateEUR: 1500,
      rateGBP: 1300,
      freeThresholdEUR: 30000,
      freeThresholdGBP: 26000,
    },
  });

  // EUR Express = 2000 (€20.00)
  await prisma.shippingRate.upsert({
    where: {
      zoneId_methodId: {
        zoneId: euZone.id,
        methodId: expressMethod.id,
      },
    },
    update: {
      rateEUR: 2000,
      rateGBP: 1750,
      freeThresholdEUR: 30000,
      freeThresholdGBP: 26000,
    },
    create: {
      zoneId: euZone.id,
      methodId: expressMethod.id,
      rateEUR: 2000,
      rateGBP: 1750,
      freeThresholdEUR: 30000,
      freeThresholdGBP: 26000,
    },
  });

  // 6. PAYMENT METHODS (Configurable, no hardcoded secrets)
  await prisma.paymentMethod.upsert({
    where: { code: 'SEPA_IBAN' },
    update: {
      name: 'Bank Transfer (SEPA / IBAN)',
      type: 'BANK_TRANSFER',
      instructions: 'Please initiate a SEPA transfer using your unique Order Reference Number in the description field.',
      isActive: true,
    },
    create: {
      code: 'SEPA_IBAN',
      name: 'Bank Transfer (SEPA / IBAN)',
      type: 'BANK_TRANSFER',
      instructions: 'Please initiate a SEPA transfer using your unique Order Reference Number in the description field.',
      isActive: true,
    },
  });

  await prisma.paymentMethod.upsert({
    where: { code: 'CRYPTO_BTC' },
    update: {
      name: 'Cryptocurrency (Bitcoin / BTC)',
      type: 'CRYPTOCURRENCY',
      cryptoNetwork: 'Bitcoin',
      instructions: 'Send the exact amount to the designated payment address and provide your transaction hash (TXID).',
      isActive: true,
    },
    create: {
      code: 'CRYPTO_BTC',
      name: 'Cryptocurrency (Bitcoin / BTC)',
      type: 'CRYPTOCURRENCY',
      cryptoNetwork: 'Bitcoin',
      instructions: 'Send the exact amount to the designated payment address and provide your transaction hash (TXID).',
      isActive: true,
    },
  });

  // 7. SITE SETTINGS
  const settings = [
    { key: 'store_name', value: 'Fusion Mushroom Bars EU', description: 'Storefront Name', isPublic: true },
    { key: 'support_email', value: 'sales@fusionbars.eu', description: 'Customer Support Email', isPublic: true },
    { key: 'default_currency', value: 'EUR', description: 'Primary Storefront Currency', isPublic: true },
    { key: 'free_shipping_threshold_eur', value: '30000', description: 'Free Standard Shipping Threshold in Cents', isPublic: true },
    { key: 'standard_shipping_eur', value: '1500', description: 'Standard Shipping Rate in Cents', isPublic: true },
    { key: 'express_shipping_eur', value: '2000', description: 'Express Shipping Rate in Cents', isPublic: true },
    { key: 'discreet_packaging_enabled', value: 'true', description: 'Standard Discreet Packaging Enabled', isPublic: true },
    { key: 'public_tracking_enabled', value: 'false', description: 'Public Order Tracking Portal Disabled', isPublic: true },
    { key: 'default_locale', value: 'en', description: 'Default Language Locale', isPublic: true },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: s,
      create: s,
    });
  }

  console.log('Seed completed successfully.');
}

if (process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .catch((e) => {
      console.error('Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
