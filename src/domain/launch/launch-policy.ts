/** First launch sells EUR only. GBP prices are not required and are not invented. */
export const GBP_LAUNCH_MODE = 'DISABLED_FOR_LAUNCH' as const;

export const LAUNCH_STATES = ['PAUSED', 'LAUNCH_REVIEW', 'READY_TO_LAUNCH', 'PRODUCTION_ACTIVE', 'BLOCKED'] as const;
export type LaunchControlState = (typeof LAUNCH_STATES)[number];
