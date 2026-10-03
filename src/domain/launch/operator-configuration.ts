export type GateBucket = 'READY' | 'REQUIRED_CONFIGURATION' | 'WAIVED' | 'RECORDED';

export function bucketFor(state: string, blocking: boolean): GateBucket {
  if (state === 'WAIVED') return 'WAIVED';
  if (state === 'PASS' || state === 'READY') return 'READY';
  if (state === 'NOT_APPLICABLE' || state === 'NOT_TESTED' || state === 'DISABLED_FOR_LAUNCH') return 'RECORDED';
  if (!blocking && state === 'WARNING') return 'RECORDED';
  return 'REQUIRED_CONFIGURATION';
}

export type PaymentProofChoice = 'CHOICE_REQUIRED' | 'REQUIRED' | 'DISABLED';

export function paymentProofUploadChoice(): PaymentProofChoice {
  const value = (process.env.PAYMENT_PROOF_UPLOAD || '').trim().toLowerCase();
  if (value === 'required') return 'REQUIRED';
  if (value === 'disabled') return 'DISABLED';
  return 'CHOICE_REQUIRED';
}

export const DNS_OPERATOR_GUIDANCE = {
  SPF: 'Publish the SPF TXT record shown by Resend for fusionbars.eu. This application does not supply a record value.',
  DKIM: 'Publish the DKIM records shown by Resend for fusionbars.eu. This application does not supply a selector or a key.',
  DMARC: 'Publish a DMARC TXT record at _dmarc.fusionbars.eu only after the operator approves the policy. This application does not supply a record value.',
} as const;

export interface OperatorChecklistItem {
  group: 'Infrastructure' | 'Payments' | 'Tax' | 'Legal' | 'Commerce';
  item: string;
  gate: string;
  fields: string[];
}

export const OPERATOR_CONFIGURATION_CHECKLIST: OperatorChecklistItem[] = [
  { group: 'Infrastructure', item: 'Production secrets', gate: 'Strong secrets', fields: ['SESSION_SECRET', 'AUTH_SECRET', 'ORDER_LOOKUP_SECRET'] },
  { group: 'Infrastructure', item: 'Private storage credentials', gate: 'Private payment proofs', fields: ['STORAGE_PROVIDER', 'STORAGE_ENDPOINT', 'STORAGE_BUCKET', 'STORAGE_REGION', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'] },
  { group: 'Infrastructure', item: 'Backup evidence', gate: 'Provider backup', fields: ['BACKUP_PROVIDER', 'BACKUP_PROVIDER_CONFIGURED', 'PITR_CONFIGURED', 'RECOVERY_COPY_CONFIGURED', 'RESTORE_TESTED'] },
  { group: 'Infrastructure', item: 'Monitoring', gate: 'External monitor', fields: ['MONITORING_PROVIDER', 'MONITORING_DSN'] },
  { group: 'Infrastructure', item: 'Distributed rate limiting', gate: 'Distributed', fields: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] },
  { group: 'Infrastructure', item: 'Email provider credential', gate: 'Provider', fields: ['EMAIL_PROVIDER', 'EMAIL_PROVIDER_KEY'] },
  { group: 'Infrastructure', item: 'DNS records', gate: 'SPF', fields: ['SPF', 'DKIM', 'DMARC'] },
  { group: 'Payments', item: 'Verified bank details', gate: 'Manual payment instructions', fields: ['BANK_ACCOUNT_HOLDER', 'BANK_NAME', 'BANK_IBAN', 'BANK_BIC_SWIFT', 'BANK_REFERENCE_FORMAT', 'BANK_PAYMENT_INSTRUCTIONS'] },
  { group: 'Payments', item: 'Verified crypto wallet, if cryptocurrency stays enabled', gate: 'Manual payment instructions', fields: ['CRYPTO_BTC_ADDRESS', 'CRYPTO_BTC_NETWORK', 'CRYPTO_ETH_ADDRESS', 'CRYPTO_ETH_NETWORK', 'CRYPTO_USDT_ADDRESS', 'CRYPTO_USDT_NETWORK', 'CRYPTO_BCH_ADDRESS', 'CRYPTO_BCH_NETWORK', 'CRYPTO_PAYMENT_INSTRUCTIONS'] },
  { group: 'Payments', item: 'Payment proof upload choice', gate: 'Payment proof upload', fields: ['PAYMENT_PROOF_UPLOAD'] },
  { group: 'Tax', item: 'Approved VAT rules', gate: 'VAT', fields: ['jurisdiction', 'tax class', 'rate', 'effective date', 'shipping tax treatment'] },
  { group: 'Legal', item: 'Legal identity', gate: 'Company info', fields: ['legal_company_name', 'registration_number', 'vat_number', 'registered_address', 'jurisdiction'] },
  { group: 'Legal', item: 'Approved policies', gate: 'Required policies', fields: ['terms', 'privacy', 'cookies', 'shipping', 'refunds', 'payment', 'imprint'] },
  { group: 'Commerce', item: 'Launch products', gate: 'Launch products', fields: ['identity', 'media', 'content', 'compliance', 'publication'] },
  { group: 'Commerce', item: 'EUR prices', gate: 'EUR', fields: ['PRICE_APPROVED'] },
  { group: 'Commerce', item: 'Product-country eligibility', gate: 'Eligibility', fields: ['product', 'country', 'eligibility', 'approved_by', 'approved_at'] },
];
