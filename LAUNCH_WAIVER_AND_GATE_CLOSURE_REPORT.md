# Launch waiver and gate closure

Policy: `FUSION_EU_INITIAL_LAUNCH_POLICY`  
Date: 2026-10-03  
Owner: Fusion Mushroom Bars EU operator

Production was not activated.

## A. Production state

```text
PAUSED
```

The in-app decision remains `LAUNCH_BLOCKED`.

## B. Gate table

| Gate | Status | Required? | Waived? | Evidence | Blocks activation? |
| ---- | ------ | --------- | ------- | -------- | ------------------ |
| Database schema parity | READY | Yes | No | `preferredCurrency` is present | No |
| Strong secrets | CONFIGURATION_REQUIRED | Yes | No | `SESSION_SECRET`, `AUTH_SECRET`, and `ORDER_LOOKUP_SECRET` are `PRODUCTION_SECRET_TOO_WEAK`. They are distinct. Values are not shown. | Yes |
| Public storefront media | NOT_APPLICABLE | No | No | Catalogue images are served by the application | No |
| Private payment proofs | CONFIGURATION_REQUIRED | Yes | No | Provider is mock / TEST. Credentials are missing | Yes |
| Provider backup | CONFIGURATION_REQUIRED | Yes | No | `BACKUP_CONFIGURATION_REQUIRED`. A database family is not a verified backup or restore | Yes |
| External monitor | NOT_CONFIGURED | Yes | No | No monitoring DSN. Application logs remain | Yes |
| Distributed rate limiting | NOT_CONFIGURED | Yes | No | `IN_MEMORY_ONLY`. Fail-closed behavior is retained | Yes |
| Email provider | BLOCKED | Yes | No | `REVIEW_REQUIRED` | Yes |
| SPF | NOT_CONFIGURED | Yes | No | `DNS_CONFIGURATION_REQUIRED` | Yes |
| DKIM | NOT_CONFIGURED | Yes | No | `DNS_CONFIGURATION_REQUIRED` | Yes |
| DMARC | NOT_CONFIGURED | Yes | No | `DNS_CONFIGURATION_REQUIRED` | Yes |
| Automated provider activation | WAIVED | No | Yes | Manual payment workflow. Production options: 0. Bank TEST. BTC TEST. Conversion `CRYPTO_RATE_CONFIGURATION_REQUIRED` | No |
| Manual payment instructions | CONFIGURATION_REQUIRED | Yes | No | No verified IBAN or wallet. Placeholder details are withheld | Yes |
| VAT | CONFIGURATION_REQUIRED | Yes | No | `TAX_CONFIGURATION_REQUIRED`. No rate was invented | Yes |
| EUR prices | WARNING | Yes | No | Launch products have no approved commercial EUR prices | Yes |
| GBP | DISABLED_FOR_LAUNCH | No | No | GBP checkout is disabled | No |
| Legal company info | NOT_CONFIGURED | Yes | No | Legal company name is `NOT_CONFIGURED` | Yes |
| Required policies | NOT_CONFIGURED | Yes | No | terms, privacy, cookies, shipping, refunds, and payment are unpublished | Yes |
| Launch products | BLOCKED | Yes | No | Published 0. Not ready 9. Do not publish 1. Audit Test Product is `DO_NOT_PUBLISH` | Yes |
| Country eligibility | WARNING | Yes | No | Product-country decisions stay unresolved | Yes |
| Shipping | WARNING | No | No | Standard 1500, express 2000, free threshold 30000. Unchanged | No |
| Security regression | WARNING | No | No | The suite passed separately. The evaluator does not replace that run | No |
| Browser smoke | PASS | No | No | Launch Control overflow was 0 at 1440, 768, and 390. Checkout labels were associated. This is a smoke test | No |
| Official build inside the evaluator | NOT_TESTED | No | No | The evaluator does not run the compiler. The command result is in section G | No |
| Current tree on the public host | CONFIGURATION_REQUIRED | Yes | No | The live homepage no longer shows the pound control. This closure is not deployed | Yes |
| Canonical URL | READY | Yes | No | `SITE_URL` is `https://fusionbars.eu` | No |

## C. Fixed in this closure

- Added `FUSION_EU_INITIAL_LAUNCH_POLICY` with a visible waiver record: gate, status, reason, owner, date, scope, and risk note.
- The launch evaluator now keeps `WAIVED` and `NOT_APPLICABLE` from blocking, and it does not turn `NOT_TESTED` into `PASS`.
- Launch Control shows the waiver, the paused state, and a load error if the decision cannot be read.
- Launch Control server actions now authenticate the admin session cookie. A customer session cannot open them.
- Placeholder bank and wallet details are omitted from customer payment options, order instructions, and transactional email. The paired default account-holder and bank-name strings are cleared when the IBAN is a placeholder. The invented BIC fallback was removed.
- Private payment-proof storage stays `CONFIGURATION_REQUIRED` while public catalogue media is `NOT_APPLICABLE`.
- Backup readiness stays `BACKUP_CONFIGURATION_REQUIRED` and still blocks. Monitoring and distributed rate limiting stay `NOT_CONFIGURED` and still block.
- Launch Control no longer overflows horizontally at 768px. Measured overflow was 0 at 1440, 768, and 390.
- Checkout address labels, including the payment-proof reference, are associated with their controls. This remains an accessibility smoke test.

## D. Intentionally waived

| Gate | Status | Reason | Owner | Date | Scope | Risk note |
| ---- | ------ | ------ | ----- | ---- | ----- | --------- |
| Automated payment-provider activation | WAIVED | Payment operations are handled through the existing manual-payment workflow. Production activation does not require automated provider credentials for this launch. | Fusion Mushroom Bars EU operator | 2026-10-03 | Live payment-provider credentials for bank transfer and cryptocurrency. Customer-facing placeholder account details stay forbidden. Real IBAN, wallet, and network values remain configuration, not a waiver. | Until a verified account or wallet is configured, checkout must not show a test IBAN or a test wallet. Customers cannot complete a transfer from invented details. |

No other infrastructure gate was waived.

## E. Still required from the business or operator

- Three distinct production secrets, `SESSION_SECRET`, `AUTH_SECRET`, and `ORDER_LOOKUP_SECRET`, set only in the production environment. Each must be at least 32 characters, unique, not a UUID, and not a placeholder. Do not commit them.
- S3-compatible endpoint, bucket, region, and credentials for private payment proofs, followed by a connectivity probe.
- Backup evidence that separates `BACKUP_PROVIDER_CONFIGURED`, `PITR_CONFIGURED`, `RECOVERY_COPY_CONFIGURED`, and `RESTORE_TESTED`. A restore test must be real.
- A monitoring ingest. Do not invent a DSN.
- Upstash REST URL and token, if distributed rate limiting is required. The current process is in-memory and fail-closed.
- A real email-provider credential plus verified SPF, DKIM, and DMARC for `fusionbars.eu`. Sender remains Fusion Mushroom Bars EU, `sales@fusionbars.eu`. DNS from this environment is `NOT_CONFIGURED`.
- A verified IBAN, or a verified wallet and network, entered as configuration. Manual instructions stay missing until then.
- Approved VAT jurisdictions, classes, rates, and effective dates.
- Legal company name, registration number, VAT number, registered address, jurisdiction, and published policies.
- Explicit launch-product approval, approved EUR prices, and explicit product-country eligibility. Audit Test Product stays `DO_NOT_PUBLISH`.
- A deployment of this closure.

## F. Deployment verification

`https://fusionbars.eu/en` was fetched on 2026-10-03.

- HTTP 200
- `X-Vercel-Cache: MISS`
- `Age: 0`
- Canonical `https://fusionbars.eu/en`
- The British Pound currency control was absent
- The `€/£` footer mark was absent
- The footer states that EUR is the launch currency and British Pound checkout is not enabled

That fetch does not make this working tree the deployed build. The closure is not on the live host, so the deployment gate stays `CONFIGURATION_REQUIRED`.

## G. Validation

```text
npm test
TOTAL:  226
PASSED: 226
FAILED: 0
TIME:   81357ms
exit:   0

npx tsc --noEmit
exit:   0

npm run build
exit:   0
TIME:   56994ms
```

The evaluator leaves its own build row `NOT_TESTED` because it does not invoke the compiler. The command above is the build result. `NOT_TESTED` does not block, and it is not recorded as `PASS`.

Checked with the suite and a local browser session:

- Audit Test Product remains `DO_NOT_PUBLISH`
- No prices, VAT rates, legal identity, or payment credentials were invented
- The local storefront has no GBP launch control
- Launch Control shows the waiver and stays paused
- Checkout did not show a placeholder IBAN or placeholder wallet
- Order and inventory regressions in the suite passed

## H. Final recommendation

```text
STILL_BLOCKED
```

Activation stays unavailable. The waived payment-provider gate does not block, and it is not a pass. These required gates still block:

- Production secrets are too weak
- Private payment-proof storage is not configured
- Backups are `BACKUP_CONFIGURATION_REQUIRED`
- Monitoring is not configured
- Distributed rate limiting is not configured
- Transactional email and DNS are not verified
- Manual payment instructions have no verified account or wallet
- VAT is not configured
- Legal identity and policies are not configured
- The launch cohort has 0 published products, 9 not ready, and Audit Test Product excluded
- EUR prices are not approved
- Product-country eligibility is not approved
- This closure is not deployed
