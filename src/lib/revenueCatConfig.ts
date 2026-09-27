// src/lib/revenueCatConfig.ts
import type { RevenueCatEntitlement } from "./billingCatalog";

export type RevenueCatOfferingId = "default" | "lost_plus" | "one_time";

export type RevenueCatEntitlementConfig = {
  key: RevenueCatEntitlement;
  description: string;
};

export type RevenueCatOfferingConfig = {
  id: RevenueCatOfferingId;
  description: string;
  expectedProductIds: string[];
};

export type RevenueCatConfig = {
  entitlementKeys: Record<RevenueCatEntitlement, RevenueCatEntitlementConfig>;
  offeringIds: Record<RevenueCatOfferingId, RevenueCatOfferingConfig>;
};

export const REVENUECAT_CONFIG: RevenueCatConfig = {
  entitlementKeys: {
    lost_plus: {
      key: "lost_plus",
      description: "Subscription entitlement for extended lost-report capacity and premium visibility rules.",
    },
    geo_broadcast: {
      key: "geo_broadcast",
      description: "One-time purchase entitlement for radius-based important alerts.",
    },
    legacy_case_listing: {
      key: "legacy_case_listing",
      description: "One-time purchase entitlement for long-duration legacy case listings.",
    },
  },
  offeringIds: {
    default: {
      id: "default",
      description: "Default fallback offering for standard storefront loading.",
      expectedProductIds: ["lost_plus_monthly", "lost_plus_yearly"],
    },
    lost_plus: {
      id: "lost_plus",
      description: "Primary subscription offering for LOST monetization.",
      expectedProductIds: ["lost_plus_monthly", "lost_plus_yearly"],
    },
    one_time: {
      id: "one_time",
      description: "Offering for one-time purchases such as case extension, geo broadcast, and legacy listing.",
      expectedProductIds: [
        "lost_case_extension_30d",
        "legacy_case_listing_365d",
        "geo_broadcast_r1",
        "geo_broadcast_r3",
        "geo_broadcast_r5",
        "geo_broadcast_r10",
        "geo_broadcast_mi1",
        "geo_broadcast_mi3",
        "geo_broadcast_mi5",
        "geo_broadcast_mi10",
      ],
    },
  },
};

export function getRevenueCatEntitlementKey(entitlement: RevenueCatEntitlement): string {
  return REVENUECAT_CONFIG.entitlementKeys[entitlement].key;
}

export function getRevenueCatOfferingId(offering: RevenueCatOfferingId): string {
  return REVENUECAT_CONFIG.offeringIds[offering].id;
}

export function getExpectedRevenueCatProducts(offering: RevenueCatOfferingId): string[] {
  return REVENUECAT_CONFIG.offeringIds[offering].expectedProductIds;
}

export function getExpectedOfferingProductIds(offering: RevenueCatOfferingId): string[] {
  return getExpectedRevenueCatProducts(offering);
}
