# Transactional Email Production Report

Date: 2026-09-27

Production: **PAUSED**

Email delivery was not activated. A configured provider key does not make the email system `ACTIVE`.

## Provider

- Selected provider: Resend, through the existing provider abstraction. Postmark, SMTP, and Mock remain available behind the same send contract.
- Status: `REVIEW_REQUIRED`
- Configuration completeness: provider credentials are `CONFIGURED`. The method is not `ACTIVE`.
- Mock stays a test provider. Its configuration check is not production-valid, and a mock handoff is recorded as `SENT`, not `DELIVERED`.
- There is no automatic failover to another provider.

## Sender

- Sender name: Fusion Mushroom Bars EU
- Sender address: `sales@fusionbars.eu`
- Reply-To: `sales@fusionbars.eu`
- Domain: `fusionbars.eu`

Sender identity is read from server environment values, with this address as the existing default. Templates do not choose a different production sender.

## DNS

- SPF: `NOT_CONFIGURED`
- DKIM: `NOT_CONFIGURED`
- DMARC: `NOT_CONFIGURED`

No DNS record values were invented. A verified status can be stored only when a provider result is supplied by a Super Admin. Until the selected provider verifies the domain, email readiness stays blocked.

## Templates

- Total templates: 19
- Validated templates: 19
- Missing templates: none

The required set is present: SEPA/IBAN order confirmation, crypto order confirmation, payment proof submitted, payment verified, payment rejected, order processing, order shipped, order delivered, order cancelled, order refunded, customer welcome, password reset, email verification, and admin operational alert.

Additional existing templates are also registered: contact confirmation, contact operations alert, newsletter confirmation, newsletter operations alert, and the test probe.

Validation checks subject, HTML, required rendering, forbidden secrets, and links. Customer links stay on `https://fusionbars.eu`. A test message is marked `TEST EMAIL`.

Bank-transfer emails still tell the customer to contact the store for payment details. Live account numbers are not inserted into the customer email.

## Events

- Order triggers: processing, shipped, delivered, cancelled, and refunded send only after the order enters that status.
- Payment triggers: proof submitted sends after proof submission. Payment verified sends only for `PAYMENT_VERIFIED`. Payment rejected sends when a submitted payment is cancelled. Viewing a record does not send mail.
- Shipping trigger: shipped mail includes a shipment reference only when one exists. It does not create a tracking link.
- Account triggers: welcome, password reset, and email verification remain on the existing account flows.
- A repeated status event does not send a second identical customer email.

## Delivery

- Delivery logs: `/admin/system/email-delivery` can filter by template, recipient, and status, and can open one attempt without the message body.
- A provider handoff is `SENT`. `DELIVERED` is not claimed unless the provider later supplies that status. Current provider status lookups return `UNKNOWN`.
- Retries: a failed transactional message can be retried by Super Admin or Order Manager after confirmation, and only when the order is still in the matching state. Retry does not create a new order or payment event.
- Bounce handling: a provider bounce can be recorded with recipient, category, reason, and time. A permanent bounce suppresses later sends to that address and does not disable the customer account.
- Failure handling: a failed send is stored as `FAILED` with a scrubbed reason. It is not dropped.

## Security

- RBAC: production activation and DNS status changes require Super Admin. Test sends require Super Admin, one recipient, a selected template, and confirmation. Customers cannot activate email or retry messages.
- Secret handling: admin screens and the readiness report show `CONFIGURED` or `MISSING`. API keys and SMTP passwords are not returned.
- URL security: order links are built from the server site address, not from a browser host header.
- Header injection: a recipient containing a newline or multiple addresses is rejected.
- Test sends are limited per administrator and cannot be used as a bulk sender.

Required server environment names: `EMAIL_PROVIDER`, `EMAIL_PROVIDER_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_OPS_INBOX`, and `SITE_URL`. SMTP also uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD`.

Settings are shown at `/admin/settings/email`.

## Launch

Email launch status: **BLOCKED**

Blockers:

- SPF is `NOT_CONFIGURED`
- DKIM is `NOT_CONFIGURED`
- DMARC is `NOT_CONFIGURED`
- A successful controlled test email has not been recorded
- Production is `PAUSED`

Launch Control keeps this inside the existing email requirement. The mock provider path also remains blocked.

## Validation

- `npm test`: 213 passed, 0 failed
- `npx tsc --noEmit`: passed
- `npm run build`: passed. Prisma Client generated and the Next.js build completed, including `/admin/settings/email` and `/admin/system/email-delivery`.

The previous payment baseline of 212 passed tests was not regressed.

Admin email screens require a login, so they were not clicked in a browser.

## Production

`PAUSED`
