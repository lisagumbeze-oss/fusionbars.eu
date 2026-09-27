export type DeliveryStatus = 'success' | 'pending' | 'failed' | 'bounced';

export interface EmailDeliveryEntry {
  messageId: string;
  template: string;
  recipient: string;
  provider: string;
  status: DeliveryStatus;
  sentAt: string;
  deliveryStatus: DeliveryStatus;
  failureReason: string | null;
}

const SECRET_PATTERN = /EMAIL_PROVIDER_KEY|SMTP_PASSWORD|AUTH_SECRET|SESSION_SECRET|BEGIN PRIVATE|sk_live_|sk_test_|Bearer\s+[A-Za-z0-9\-._]+|api[_-]?key/i;

export function projectDeliveryLog(
  messages: Array<Record<string, unknown>>,
  provider = 'mock'
): EmailDeliveryEntry[] {
  return messages.map((message, index) => {
    const subject = typeof message.subject === 'string' ? message.subject : 'Transactional email';
    const recipient = typeof message.to === 'string' ? message.to : 'unknown';
    const templateTag = Array.isArray(message.tags)
      ? message.tags.find((tag) => tag && typeof tag === 'object' && (tag as { name?: string }).name === 'template')
      : null;
    const template = templateTag && typeof (templateTag as { value?: string }).value === 'string'
      ? (templateTag as { value: string }).value
      : subject;
    const explicitStatus = message.status;
    const status: DeliveryStatus =
      explicitStatus === 'pending' || explicitStatus === 'failed' || explicitStatus === 'bounced' || explicitStatus === 'success'
        ? explicitStatus
        : 'success';
    const failure = typeof message.error === 'string' ? message.error : null;
    return {
      messageId: typeof message.messageId === 'string' ? message.messageId : `delivery-${index + 1}`,
      template,
      recipient,
      provider: typeof message.provider === 'string' ? message.provider : provider,
      status,
      sentAt: typeof message.sentAt === 'string' ? message.sentAt : '',
      deliveryStatus: status,
      failureReason: failure && !SECRET_PATTERN.test(failure) ? failure : failure ? 'Delivery failed' : null,
    };
  });
}

export function deliveryLogExposesSecrets(value: unknown): boolean {
  return SECRET_PATTERN.test(JSON.stringify(value));
}
