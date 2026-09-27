// src/lib/revenueCatIntegration.ts
import {
  configureRevenueCat,
  isRevenueCatReady,
  type RevenueCatInitConfig,
  type RevenueCatSdkLike as RevenueCatInitSdkLike,
} from "./revenueCatInit";
import {
  getAvailableLostPlusProducts,
  getAvailableOneTimeProducts,
  getMissingExpectedProducts,
  getRevenueCatAccessSummary,
  safeGetCustomerInfo,
  safeGetOfferings,
  type RevenueCatOfferingsLike,
  type RevenueCatSdkLike as RevenueCatServiceSdkLike,
} from "./revenueCatService";

export type RevenueCatIntegrationSdk = RevenueCatInitSdkLike & RevenueCatServiceSdkLike;

export type RevenueCatIntegrationState = {
  init: RevenueCatInitConfig;
  isReady: boolean;
  access: ReturnType<typeof getRevenueCatAccessSummary>;
  availableLostPlusProducts: string[];
  availableOneTimeProducts: string[];
  missingLostPlusProducts: string[];
  missingOneTimeProducts: string[];
  offerings: RevenueCatOfferingsLike | null;
};

export async function initializeRevenueCatIntegration(
  purchases?: RevenueCatIntegrationSdk | null,
  input?: { appUserId?: string }
): Promise<RevenueCatIntegrationState> {
  const init = await configureRevenueCat(purchases, { appUserId: input?.appUserId });
  const isReady = isRevenueCatReady(init);

  const customerInfo = isReady ? await safeGetCustomerInfo(purchases) : null;
  const offerings = isReady ? await safeGetOfferings(purchases) : null;

  return {
    init,
    isReady,
    access: getRevenueCatAccessSummary(customerInfo),
    availableLostPlusProducts: getAvailableLostPlusProducts(offerings),
    availableOneTimeProducts: getAvailableOneTimeProducts(offerings),
    missingLostPlusProducts: getMissingExpectedProducts(offerings, "lost_plus"),
    missingOneTimeProducts: getMissingExpectedProducts(offerings, "one_time"),
    offerings,
  };
}

export function getRevenueCatReadinessSummary(state: RevenueCatIntegrationState) {
  return {
    isReady: state.isReady,
    hasLostPlus: state.access.hasLostPlus,
    canUseGeoBroadcast: state.access.canUseGeoBroadcast,
    canUseLegacyCaseListing: state.access.canUseLegacyCaseListing,
    availableLostPlusProducts: state.availableLostPlusProducts,
    availableOneTimeProducts: state.availableOneTimeProducts,
    missingLostPlusProducts: state.missingLostPlusProducts,
    missingOneTimeProducts: state.missingOneTimeProducts,
  };
}
