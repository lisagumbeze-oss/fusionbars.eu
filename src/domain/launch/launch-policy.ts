/** Storefront currency switch offers Euro and British Pound. */
export type GbpLaunchMode = 'ENABLED' | 'DISABLED_FOR_LAUNCH';
export const GBP_LAUNCH_MODE: GbpLaunchMode = 'ENABLED';

export const LAUNCH_STATES = ['PAUSED', 'LAUNCH_REVIEW', 'READY_TO_LAUNCH', 'PRODUCTION_ACTIVE', 'BLOCKED'] as const;
export type LaunchControlState = (typeof LAUNCH_STATES)[number];
