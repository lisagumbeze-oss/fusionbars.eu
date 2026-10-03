/** Storefront currency switch offers Euro and British Pound. */
export const GBP_LAUNCH_MODE = 'ENABLED' as const;

export const LAUNCH_STATES = ['PAUSED', 'LAUNCH_REVIEW', 'READY_TO_LAUNCH', 'PRODUCTION_ACTIVE', 'BLOCKED'] as const;
export type LaunchControlState = (typeof LAUNCH_STATES)[number];
