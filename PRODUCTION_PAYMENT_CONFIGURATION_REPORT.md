# Production Payment Configuration Report

Date: 2026-09-27

Production: **PAUSED**

No production bank account, IBAN, BIC, or wallet address was entered. Placeholder values remain test configuration and cannot become `ACTIVE`.

## Payment Methods

### Bank Transfer

- Current state: `TEST`
- Configuration completeness: incomplete. The stored account details are test placeholders, so no production account is configured.
- Supported currencies: the existing checkout currency, with the amount taken from the order total.
- Verification workflow: a customer proof moves the order to `PAYMENT_SUBMITTED`. Finance verification is a separate authorized action. Uploading proof does not verify the payment.
- Evidence storage: proof is recorded as a private object key. Public `http` and `https` evidence URLs are rejected. The finance queue says “Private evidence on file” and does not link a public file URL.
- Customer reference: `FUSION-` plus the existing order number. Internal lookup tokens are not used.
- Activation: saving configuration does not activate the method. `SUPER_ADMIN` confirmation still fails while credentials are placeholders and production is `PAUSED`.

### Cryptocurrency

- Current state: Bitcoin `TEST`; USDT `NOT_CONFIGURED`; Ethereum `NOT_CONFIGURED`.
- Configured assets/networks: no approved production asset or network.
- Destination configuration: no approved receiving address. The development Bitcoin value is a placeholder and is not a production destination.
- Conversion configuration: `CRYPTO_RATE_CONFIGURATION_REQUIRED`. No rate is guessed.
- Verification workflow: a transaction reference can be submitted, but a hash alone does not verify payment. Finance must review the expected order amount.
- Discount: the existing merchandise cryptocurrency discount stays in the order pipeline. No new discount was created.
- Production payment options: none.

## Finance

- Verification queue: `/admin/payments`, limited to Finance and Super Admin.
- Actions: verify, reject, and request clarification. There is no Verify All.
- Discrepancy handling: a submitted amount that differs from `order.totalAmount` returns `AMOUNT_MISMATCH` and does not verify the payment. No partial-payment or refund rule was invented.
- Reconciliation: matching uses the payment reference, expected amount, currency, and finance decision. There is no automated bank or blockchain settlement feed.
- Rejection: a cancellation through payment verification requires a reason. A later submission keeps the previous evidence and adds a new record.
- Expiration: not configured. Orders are not cancelled by an invented deadline.
- Settings: `/admin/settings/payments` shows method state and blockers without account numbers, addresses, or secrets.

## Security

- RBAC: payment verification stays with Finance and Super Admin. Customers can submit proof and cannot verify it.
- Evidence privacy: public evidence URLs are rejected. Admin responses no longer return the stored proof URL.
- Duplicate protection: a repeated payment reference is rejected. A repeated verification of an already verified payment is idempotent and does not send another verification email.
- Idempotency: the second verify request returns the existing verified state.
- Secrets: production credentials stay in server environment variables. The admin readiness report does not return them.
- Payment creation still depends on the order. Unpublished products, cancelled orders, and already paid orders are rejected before a payment decision.

## Notifications

- Templates present: bank-transfer order confirmation, cryptocurrency order confirmation, payment proof submitted, payment verified, and payment rejected.
- Event triggers recorded for proof submission, verification, and rejection.
- A verification email is sent only when the order actually changes to verified. A repeated verification does not send another one.
- Delivery readiness: the email provider is not treated as production-ready. Test runs can still receive provider rate-limit responses. That does not mark email delivery active.

## Launch Blockers

- Bank transfer credentials are test placeholders.
- Bitcoin has no approved receiving address.
- Cryptocurrency conversion is `CRYPTO_RATE_CONFIGURATION_REQUIRED`.
- USDT and Ethereum are `NOT_CONFIGURED`.
- No payment method is `ACTIVE`.
- Production control is `PAUSED`.
- Payment expiration is not configured, so no automatic cancellation rule exists.
- Existing launch checks still block production for incomplete database, secrets, object storage, email, and legal configuration when those inputs are missing or are placeholders.
- Development checkout can still show the test bank and Bitcoin rails so current order tests keep passing. Those rails are classified `TEST` and are not production payment options.

Product readiness stays separate. A payment method can be configured later while a product remains `NOT_READY`. A product can be ready for publication and still have no production payment method.

The first 10 catalogue decisions were not changed.

## Validation

- `npm test`: 212 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed. Prisma Client generated and the Next.js build completed, including `/admin/payments` and `/admin/settings/payments`.

Admin payment screens require an authenticated session, so they were not clicked in a browser.

## Production

`PAUSED`
