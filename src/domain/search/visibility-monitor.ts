import visibilityLog from '@/data/search/visibility-log.json';

export interface MentionCheck {
  capturedOn: string;
  channel: string;
  queries: string[];
  exactMentions: string[];
  otherFusionDomainsSeen: string[];
  aiEngines: Record<string, string>;
  citationRate: string;
  emailsSent: number;
  note: string;
}

export interface OutreachDraft {
  to: string;
  subject: string;
  body: string;
  sourceUrl: string;
  targetUrl: string;
}

const log = visibilityLog as { checks: MentionCheck[] };

export const AI_SPOT_CHECK_ENGINES = [
  'chatgpt',
  'perplexity',
  'googleAiOverviews',
  'bingCopilot',
  'claude',
] as const;

export function latestVisibilityCheck(): MentionCheck {
  const check = log.checks[log.checks.length - 1];
  if (!check) throw new Error('No visibility check has been recorded.');
  return check;
}

export function verifiedMentions(check: MentionCheck = latestVisibilityCheck()): string[] {
  return check.exactMentions.filter((url) => /^https:\/\/[^/]+\/.+/i.test(url) && !url.includes('fusionbars.eu'));
}

/** Outreach stays closed until a check records a page that names this shop and a published contact. */
export function outreachBlockedReason(check: MentionCheck = latestVisibilityCheck()): string | null {
  if (verifiedMentions(check).length === 0) {
    return 'No verified unlinked mention of fusionbars.eu. Other Fusion domains were not contacted.';
  }
  return null;
}

export function buildMentionOutreach(input: {
  contactEmail: string;
  contactName: string;
  sourceTitle: string;
  sourceUrl: string;
  targetUrl: string;
}): OutreachDraft {
  const email = input.contactEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Outreach needs a published email address.');
  if (!input.sourceUrl.startsWith('https://') || input.sourceUrl.includes('fusionbars.eu')) {
    throw new Error('Outreach needs an external https page that mentions this shop.');
  }
  if (!input.targetUrl.startsWith('https://fusionbars.eu/')) {
    throw new Error('The requested link has to be a page on fusionbars.eu.');
  }
  if (outreachBlockedReason() && !verifiedMentions().includes(input.sourceUrl)) {
    throw new Error(outreachBlockedReason() || 'Outreach is blocked.');
  }
  return {
    to: email,
    sourceUrl: input.sourceUrl,
    targetUrl: input.targetUrl,
    subject: `Link for the Fusion Mushroom Bars mention on ${input.sourceTitle.trim()}`,
    body: [
      `Hello ${input.contactName.trim() || 'there'},`,
      '',
      `${input.sourceUrl} mentions Fusion Mushroom Bars EU and does not link to the shop.`,
      `The page that matches that mention is ${input.targetUrl}.`,
      '',
      'If you add a link, use that URL.',
      '',
      'Fusion Mushroom Bars EU',
      'sales@fusionbars.eu',
    ].join('\n'),
  };
}
