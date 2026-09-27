// src/lib/monetization.ts
import type { MarketConfig } from "./market";

export type ReportType = "LOST" | "FOUND";
export type BillingCadence = "monthly" | "yearly";

export type ProductMatrix = {
  reportType: ReportType;
  freeVisibilityDays: number;
  suggestedListingDays: number;
  maxActiveReportsForFree: number | null;
  allowPerCaseExtension: boolean;
  allowLegacyAnnualListing: boolean;
  allowGeoBroadcast: boolean;
  subscriptionRecommended: boolean;
  rewardEnabled: boolean;
};

export type EntitlementMatrix = {
  canCreateLostReports: boolean;
  canCreateFoundReports: boolean;
  canKeepLostVisibleBeyondFreeWindow: boolean;
  canUseGeoBroadcast: boolean;
  canCreateLegacyAnnualListing: boolean;
  maxActiveLostReports: number | null;
  maxActiveFoundReports: number | null;
};

export type SubscriptionPlan = {
  id: string;
  cadence: BillingCadence;
  activeLostReportLimit: number | null;
  includesGeoBroadcastDiscount: boolean;
  includesLegacyAnnualListingDiscount: boolean;
};

export const DEFAULT_FREE_ACTIVE_LOST_LIMIT = 1;
export const DEFAULT_FREE_ACTIVE_FOUND_LIMIT = null;
export const DEFAULT_LOST_FREE_VISIBILITY_DAYS = 7;
export const DEFAULT_FOUND_LISTING_DAYS = 365;
export const DEFAULT_LEGACY_LISTING_DAYS = 365;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plus_monthly",
    cadence: "monthly",
    activeLostReportLimit: 3,
    includesGeoBroadcastDiscount: false,
    includesLegacyAnnualListingDiscount: true,
  },
  {
    id: "plus_yearly",
    cadence: "yearly",
    activeLostReportLimit: 3,
    includesGeoBroadcastDiscount: true,
    includesLegacyAnnualListingDiscount: true,
  },
];

export function getReportProductMatrix(input: { market: MarketConfig; reportType: ReportType }): ProductMatrix {
  const { market, reportType } = input;

  if (reportType === "FOUND") {
    return {
      reportType,
      freeVisibilityDays: DEFAULT_FOUND_LISTING_DAYS,
      suggestedListingDays: DEFAULT_FOUND_LISTING_DAYS,
      maxActiveReportsForFree: DEFAULT_FREE_ACTIVE_FOUND_LIMIT,
      allowPerCaseExtension: false,
      allowLegacyAnnualListing: false,
      allowGeoBroadcast: false,
      subscriptionRecommended: false,
      rewardEnabled: false,
    };
  }

  return {
    reportType,
    freeVisibilityDays: DEFAULT_LOST_FREE_VISIBILITY_DAYS,
    suggestedListingDays: DEFAULT_LOST_FREE_VISIBILITY_DAYS,
    maxActiveReportsForFree: DEFAULT_FREE_ACTIVE_LOST_LIMIT,
    allowPerCaseExtension: true,
    allowLegacyAnnualListing: market.featureFlags.legacyCaseListingEnabled,
    allowGeoBroadcast: market.featureFlags.geoBroadcastEnabled,
    subscriptionRecommended: true,
    rewardEnabled: market.featureFlags.rewardEnabled,
  };
}

export function getEntitlementMatrix(input: { market: MarketConfig; hasSubscription: boolean }): EntitlementMatrix {
  const { market, hasSubscription } = input;
  return {
    canCreateLostReports: true,
    canCreateFoundReports: true,
    canKeepLostVisibleBeyondFreeWindow: hasSubscription,
    canUseGeoBroadcast: hasSubscription && market.featureFlags.geoBroadcastEnabled,
    canCreateLegacyAnnualListing: hasSubscription && market.featureFlags.legacyCaseListingEnabled,
    maxActiveLostReports: hasSubscription ? 3 : DEFAULT_FREE_ACTIVE_LOST_LIMIT,
    maxActiveFoundReports: DEFAULT_FREE_ACTIVE_FOUND_LIMIT,
  };
}

export function getListingDurationDays(input: { reportType: ReportType; isLegacyCase?: boolean }): number {
  if (input.reportType === "FOUND") return DEFAULT_FOUND_LISTING_DAYS;
  if (input.isLegacyCase) return DEFAULT_LEGACY_LISTING_DAYS;
  return DEFAULT_LOST_FREE_VISIBILITY_DAYS;
}
