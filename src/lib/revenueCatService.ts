// src/lib/revenueCatService.ts
import {
  getExpectedOfferingProductIds,
  type RevenueCatOfferingId,
} from "./revenueCatConfig";
import {
  canUseGeoBroadcast,
  canUseLegacyCaseListing,
  getActiveEntitlementKeys,
  getPrimaryOneTimeProductIds,
  getPrimarySubscriptionProductIds,
  isLostPlusActive,
  type RevenueCatCustomerInfoLike,
} from "./revenueCatAccess";

export type RevenueCatPackageLike = {
  identifier?: string;
  product?: {
    identifier?: string;
  };
};

export type RevenueCatOfferingLike = {
  identifier?: string;
  availablePackages?: RevenueCatPackageLike[];
};

export type RevenueCatOfferingsLike = {
  current?: RevenueCatOfferingLike | null;
  all?: Record<string, RevenueCatOfferingLike | undefined>;
};

export type RevenueCatSdkLike = {
  getCustomerInfo?: () => Promise<RevenueCatCustomerInfoLike>;
  getOfferings?: () => Promise<RevenueCatOfferingsLike>;
};

export type RevenueCatAccessSummary = {
  hasLostPlus: boolean;
  canUseGeoBroadcast: boolean;
  canUseLegacyCaseListing: boolean;
  activeEntitlementKeys: string[];
};

export async function safeGetCustomerInfo(
  purchases?: RevenueCatSdkLike | null
): Promise<RevenueCatCustomerInfoLike | null> {
  try {
    if (!purchases?.getCustomerInfo) return null;
    return await purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function safeGetOfferings(
  purchases?: RevenueCatSdkLike | null
): Promise<RevenueCatOfferingsLike | null> {
  try {
    if (!purchases?.getOfferings) return null;
    return await purchases.getOfferings();
  } catch {
    return null;
  }
}

export function getRevenueCatAccessSummary(
  customerInfo: RevenueCatCustomerInfoLike | null | undefined
): RevenueCatAccessSummary {
  return {
    hasLostPlus: isLostPlusActive(customerInfo),
    canUseGeoBroadcast: canUseGeoBroadcast(customerInfo),
    canUseLegacyCaseListing: canUseLegacyCaseListing(customerInfo),
    activeEntitlementKeys: getActiveEntitlementKeys(customerInfo),
  };
}

export function getOfferingById(
  offerings: RevenueCatOfferingsLike | null | undefined,
  offeringId: RevenueCatOfferingId
): RevenueCatOfferingLike | null {
  if (!offerings) return null;
  const explicit = offerings.all?.[offeringId];
  if (explicit) return explicit;
  if (offerings.current?.identifier === offeringId) return offerings.current;
  return null;
}

export function getOfferingProductIds(
  offerings: RevenueCatOfferingsLike | null | undefined,
  offeringId: RevenueCatOfferingId
): string[] {
  const offering = getOfferingById(offerings, offeringId);
  if (!offering?.availablePackages?.length) return [];
  return offering.availablePackages
    .map((pkg: RevenueCatPackageLike) => pkg.product?.identifier || pkg.identifier || "")
    .filter((productId: string) => Boolean(productId));
}

export function getMissingExpectedProducts(
  offerings: RevenueCatOfferingsLike | null | undefined,
  offeringId: RevenueCatOfferingId
): string[] {
  const actual = new Set(getOfferingProductIds(offerings, offeringId));
  const expected = getExpectedOfferingProductIds(offeringId);
  return expected.filter((productId: string) => !actual.has(productId));
}

export function getAvailableLostPlusProducts(
  offerings: RevenueCatOfferingsLike | null | undefined
): string[] {
  const actual = new Set(getOfferingProductIds(offerings, "lost_plus"));
  return getPrimarySubscriptionProductIds().filter((productId: string) => actual.has(productId));
}

export function getAvailableOneTimeProducts(
  offerings: RevenueCatOfferingsLike | null | undefined
): string[] {
  const actual = new Set(getOfferingProductIds(offerings, "one_time"));
  return getPrimaryOneTimeProductIds().filter((productId: string) => actual.has(productId));
}
