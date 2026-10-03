/**
 * FUSION_EU_INITIAL_LAUNCH_POLICY
 *
 * Required gates still block activation.
 * A waiver is visible and does not block activation.
 * A waiver is not a PASS.
 */

export type LaunchEvaluationStatus = 'PASS' | 'BLOCKED' | 'WAIVED' | 'NOT_APPLICABLE' | 'NOT_TESTED' | 'CONFIGURATION_REQUIRED';

export interface LaunchWaiver {
  gate: string;
  status: 'WAIVED';
  reason: string;
  owner: string;
  date: string;
  scope: string;
  risk_note: string;
}

export const FUSION_EU_INITIAL_LAUNCH_POLICY = {
  id: 'FUSION_EU_INITIAL_LAUNCH_POLICY',
  owner: 'Fusion Mushroom Bars EU operator',
  date: '2026-10-03',
  requiredBeforeActivation: [
    'Production-safe session, auth, and order-lookup secrets',
    'Deployment of this tree to https://fusionbars.eu without the disabled GBP control',
    'No customer exposure of placeholder payment details',
    'Catalogue publication safeguards, including Audit Test Product remaining DO_NOT_PUBLISH',
    'Approved launch products',
    'Approved EUR prices',
    'Explicit product-country eligibility',
    'Order persistence and inventory safety',
    'Secure admin authentication',
    'Private payment-proof storage before proof upload is offered',
    'Approved VAT rules, or an explicit future waiver',
    'Approved legal identity and published policies, or an explicit future waiver',
  ],
  waivers: [
    {
      gate: 'Automated payment-provider activation',
      status: 'WAIVED',
      reason: 'Payment operations are handled through the existing manual-payment workflow. Production activation does not require automated provider credentials for this launch.',
      owner: 'Fusion Mushroom Bars EU operator',
      date: '2026-10-03',
      scope: 'Live payment-provider credentials for bank transfer and cryptocurrency. Customer-facing placeholder account details stay forbidden. Real IBAN, wallet, and network values remain configuration, not a waiver.',
      risk_note: 'Until a verified account or wallet is configured, checkout must not show a test IBAN or a test wallet. Customers cannot complete a transfer from invented details.',
    },
  ] satisfies LaunchWaiver[],
} as const;

export function waiverFor(gate: string): LaunchWaiver | undefined {
  return FUSION_EU_INITIAL_LAUNCH_POLICY.waivers.find((item) => item.gate === gate);
}
