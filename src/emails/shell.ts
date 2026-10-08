// Shared branded HTML shell for transactional emails

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailShellOptions {
  title?: string;
  preheader?: string;
  bodyHtml: string;
  supportEmail?: string;
}

export function renderEmailShell(options: EmailShellOptions): string {
  const support = escapeHtml(options.supportEmail || 'sales@fusionbars.eu');
  const preheader = options.preheader ? escapeHtml(options.preheader) : '';
  const title = options.title ? escapeHtml(options.title) : 'Fusion Mushroom Bars EU';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#E5E3DD;font-family:Georgia,'Times New Roman',serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E5E3DD;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#FBFBF9;border:1px solid #E5E3DD;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#4A5D4E;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;letter-spacing:0.08em;color:#FBFBF9;">FUSION MUSHROOM BARS EU</p>
              <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#D8E4DA;">Discreet fulfilment &middot; NL &middot; ES &middot; DE &middot; FR</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#121212;">
              ${options.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #E5E3DD;background-color:#FAF9F5;">
              <p style="margin:0 0 8px;font-size:12px;color:#5C5852;">All dispatches use plain, unbranded, odorless packaging for customer privacy.</p>
              <p style="margin:0 0 8px;font-size:12px;color:#5C5852;">Avinguda Alcora 412, 12006 Castelló de la Plana, Castelló, Spain</p>
              <p style="margin:0 0 8px;font-size:12px;color:#5C5852;">UK branch office: 519 Beverley Dr, Stoke-on-Trent ST2 0QB, UK</p>
              <p style="margin:0;font-size:12px;color:#5C5852;">Questions? <a href="mailto:${support}" style="color:#4A5D4E;font-weight:600;">${support}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function renderAccentPanel(title: string, rowsHtml: string): string {
  return `<div style="background-color:#F0F4F1;border:1px solid #E5E3DD;border-radius:12px;padding:20px;margin:20px 0;">
    <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#4A5D4E;">${title}</p>
    ${rowsHtml}
  </div>`;
}

export function renderDetailRow(label: string, value: string, monospace = false): string {
  const safeLabel = escapeHtml(label);
  const safeValue = escapeHtml(value);
  const valueStyle = monospace
    ? 'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#FFFFFF;padding:4px 8px;border-radius:6px;border:1px solid #E5E3DD;word-break:break-all;'
    : '';
  return `<p style="margin:0 0 8px;font-size:14px;color:#121212;"><strong style="color:#4A5D4E;">${safeLabel}:</strong> <span style="${valueStyle}">${safeValue}</span></p>`;
}

export function renderPrimaryButton(label: string, href: string): string {
  const safeLabel = escapeHtml(label);
  const safeHref = escapeHtml(href);
  return `<p style="margin:24px 0 8px;"><a href="${safeHref}" style="display:inline-block;background-color:#4A5D4E;color:#FBFBF9;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:10px;">${safeLabel}</a></p>`;
}

export function renderHeading(text: string, tone: 'default' | 'success' | 'danger' = 'default'): string {
  const colors = {
    default: '#121212',
    success: '#2F6B4F',
    danger: '#9B2C2C',
  };
  return `<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;color:${colors[tone]};">${escapeHtml(text)}</h1>`;
}

export function buildOrderStatusUrl(baseUrl: string, locale: string, orderNumber: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const safeLocale = locale || 'en';
  return `${normalizedBase}/${safeLocale}/orders/lookup?orderNumber=${encodeURIComponent(orderNumber)}`;
}
