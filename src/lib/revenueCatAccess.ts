// src/lib/revenueCatAccess.ts
import type { RevenueCatEntitlement } from "./billingCatalog";
import {
  REVENUECAT_CONFIG,
  getRevenueCatEntitlementKey,
  type RevenueCatOfferingId,
} from "./revenueCatConfig";

export type RevenueCatEntitlementState = {
  isActive?: boolean;
  willRenew?: boolean;
  latestPurchaseDate?: string | null;
  expirationDate?: string | null;
  productIdentifier?: string | null;
};

export type RevenueCatCustomerInfoLike = {
  entitlements?: {
    active?: Record<string, RevenueCatEntitlementState | undefined>;
    all?: Record<string, RevenueCatEntitlementState | undefined>;
  };
};

export function getEntitlementState(
  customerInfo: RevenueCatCustomerInfoLike | null | undefined,
  entitlement: RevenueCatEntitlement
): RevenueCatEntitlementState | null {
  const key = getRevenueCatEntitlementKey(entitlement);
  const fromActive = customerInfo?.entitlements?.active?.[key];
  if (fromActive) return fromActive;
  const fromAll = customerInfo?.entitlements?.all?.[key];
  return fromAll ?? null;
}

export function hasActiveEntitlement(
  customerInfo: RevenueCatCustomerInfoLike | null | undefined,
  entitlement: RevenueCatEntitlement
): boolean {
  const state = getEntitlementState(customerInfo, entitlement);
  return Boolean(state?.isActive);
}

export function isLostPlusActive(customerInfo: RevenueCatCustomerInfoLike | null | undefined): boolean {
  return hasActiveEntitlement(customerInfo, "lost_plus");
}

export function canUseGeoBroadcast(customerInfo: RevenueCatCustomerInfoLike | null | undefined): boolean {
  return hasActiveEntitlement(customerInfo, "geo_broadcast");
}

export function canUseLegacyCaseListing(customerInfo: RevenueCatCustomerInfoLike | null | undefined): boolean {
  return hasActiveEntitlement(customerInfo, "legacy_case_listing");
}

export function getActiveEntitlementKeys(
  customerInfo: RevenueCatCustomerInfoLike | null | undefined
): RevenueCatEntitlement[] {
  return (Object.keys(REVENUECAT_CONFIG.entitlementKeys) as RevenueCatEntitlement[]).filter((entitlement) =>
    hasActiveEntitlement(customerInfo, entitlement)
  );
}

export function getExpectedOfferingProductIds(offeringId: RevenueCatOfferingId): string[] {
  return REVENUECAT_CONFIG.offeringIds[offeringId].expectedProductIds;
}

export function getPrimarySubscriptionProductIds(): string[] {
  return getExpectedOfferingProductIds("lost_plus");
}

export function getPrimaryOneTimeProductIds(): string[] {
  return getExpectedOfferingProductIds("one_time");
}
