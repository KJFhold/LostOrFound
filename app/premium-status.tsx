// app/premium-status.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { PremiumHeader } from "../src/ui/PremiumHeader";
import { theme } from "../src/ui/theme";
import { useI18n } from "../src/i18n/I18nProvider";

import { en } from "../src/i18n/locales/en";
import { no } from "../src/i18n/locales/no";
import type { TranslationKey } from "../src/i18n/locales/en";
import { useRevenueCatState } from "../src/hooks/useRevenueCatState";

function tr(language: "no" | "en", key: TranslationKey): string {
  return language === "en" ? en[key] : no[key];
}

type Language = "no" | "en";

type PurchasePackageLike = {
  identifier?: string;
  packageType?: string;
  product?: {
    identifier?: string;
    productIdentifier?: string;
    title?: string;
    description?: string;
    priceString?: string;
  };
};

type PackageViewModel = {
  productId: string;
  title: string;
  description: string;
  priceText: string;
};

function boolLabel(value: boolean, language: Language) {
  return value ? (tr(language, "premium.yes")) : (tr(language, "premium.no"));
}

function joinOrDash(values: string[] | undefined) {
  return values && values.length > 0 ? values.join(", ") : "—";
}

function loadPurchasesModule(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-purchases");
    return mod?.default ?? mod?.Purchases ?? mod ?? null;
  } catch {
    return null;
  }
}

function getPackageProductId(pkg: PurchasePackageLike): string {
  return pkg?.product?.identifier ?? pkg?.product?.productIdentifier ?? pkg?.identifier ?? "";
}

function inferPlanTitle(productId: string, language: Language): string {
  const id = String(productId || "").toLowerCase();
  if (id.includes("year")) return tr(language, "premium.yearly");
  if (id.includes("month")) return tr(language, "premium.monthly");
  return tr(language, "premium.subscription");
}

function inferPlanDescription(productId: string, language: Language): string {
  const id = String(productId || "").toLowerCase();
  if (id.includes("year")) {
    return tr(language, "premium.best.if.you.want.long.term.visibility.and.fewer.");
  }
  if (id.includes("month")) {
    return tr(language, "premium.flexible.option.if.you.want.to.start.small");
  }
  return tr(language, "premium.premium.access.for.lost.reports");
}

function toPackageViewModel(pkg: PurchasePackageLike, language: Language): PackageViewModel {
  const productId = getPackageProductId(pkg);
  const product = pkg?.product;

  const title =
    (typeof product?.title === "string" ? product.title.trim() : "") ||
    inferPlanTitle(productId, language);

  const description =
    (typeof product?.description === "string" ? product.description.trim() : "") ||
    inferPlanDescription(productId, language);

  const priceText =
    (typeof product?.priceString === "string" ? product.priceString.trim() : "") ||
    productId ||
    "—";

  return {
    productId,
    title,
    description,
    priceText,
  };
}

export default function PremiumStatusScreen() {
  const router = useRouter();
  const { language } = useI18n();
  const purchases = useMemo(() => loadPurchasesModule(), []);
  const { loading, initialized, summary, error, reload, state } = useRevenueCatState({
    purchases,
    autoLoad: true,
  });

  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [packages, setPackages] = useState<PurchasePackageLike[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const title = tr(language, "premium.premium");
  const lostPlusActive = summary?.hasLostPlus ?? false;
  const isReady = summary?.isReady ?? false;

  const fallbackProductIds = useMemo(
    () => summary?.availableLostPlusProducts ?? [],
    [summary?.availableLostPlusProducts]
  );

  const oneTimeProducts = useMemo(
    () => summary?.availableOneTimeProducts ?? [],
    [summary?.availableOneTimeProducts]
  );

  const missingLostPlusProducts = useMemo(
    () => summary?.missingLostPlusProducts ?? [],
    [summary?.missingLostPlusProducts]
  );

  const missingOneTimeProducts = useMemo(
    () => summary?.missingOneTimeProducts ?? [],
    [summary?.missingOneTimeProducts]
  );

  const displayedPackages = useMemo<PurchasePackageLike[]>(() => {
    if (packages.length > 0) return packages;

    return fallbackProductIds.map((productId) => ({
      identifier: productId,
      product: {
        identifier: productId,
        title: "",
        description: "",
        priceString: "",
      },
    }));
  }, [fallbackProductIds, packages]);

  const packageCards = useMemo<PackageViewModel[]>(
    () => displayedPackages.map((pkg) => toPackageViewModel(pkg, language)),
    [displayedPackages, language]
  );

  useEffect(() => {
    if (!selectedProductId && packageCards.length > 0) {
      setSelectedProductId(packageCards[0].productId);
    }
  }, [packageCards, selectedProductId]);

  const selectedCard = useMemo(
    () => packageCards.find((pkg) => pkg.productId === selectedProductId) ?? null,
    [packageCards, selectedProductId]
  );

  const subscribeLabel = (() => {
    if (purchaseLoading) return tr(language, "premium.starting.purchase");
    if (lostPlusActive) return tr(language, "premium.subscription.active");
    if (!isReady) return tr(language, "premium.not.ready.yet");
    if (packageCards.length === 0) return tr(language, "premium.no.subscription.available");
    return tr(language, "premium.start.subscription");
  })();

  const canAttemptPurchase =
    !purchaseLoading &&
    !restoreLoading &&
    isReady &&
    !lostPlusActive &&
    packageCards.length > 0 &&
    !!selectedCard;

  const canAttemptRestore = !purchaseLoading && !restoreLoading;

  const loadLivePackages = async () => {
    const Purchases = purchases;
    if (!Purchases || !isReady) return;

    try {
      const offerings = (await Purchases.getOfferings?.()) ?? null;
      const offering = offerings?.all?.lost_plus ?? offerings?.current ?? null;
      const nextPackages = (offering?.availablePackages ?? []) as PurchasePackageLike[];

      if (Array.isArray(nextPackages) && nextPackages.length > 0) {
        setPackages(nextPackages);
        const firstProductId = getPackageProductId(nextPackages[0]);
        if (!selectedProductId && firstProductId) {
          setSelectedProductId(firstProductId);
        }
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    void loadLivePackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, purchases]);

  const handleRefresh = async () => {
    await reload();
    await loadLivePackages();
  };

  const handleSubscribe = async () => {
    if (!isReady) {
      Alert.alert(
        tr(language, "premium.not.ready"),
        tr(language, "premium.revenuecat.is.not.ready.yet.refresh.status.and.t")
      );
      return;
    }

    if (lostPlusActive) {
      Alert.alert(
        tr(language, "premium.already.active"),
        tr(language, "premium.lost.plus.is.already.active.on.this.account")
      );
      return;
    }

    const Purchases = purchases;
    if (!Purchases) {
      Alert.alert(
        tr(language, "premium.sdk.missing"),
        tr(language, "premium.could.not.load.react.native.purchases.at.runtime")
      );
      return;
    }

    try {
      setPurchaseLoading(true);
      const offerings = (await Purchases.getOfferings?.()) ?? null;
      const offering = offerings?.all?.lost_plus ?? offerings?.current ?? null;
      const livePackages = (offering?.availablePackages ?? []) as PurchasePackageLike[];
      const searchPool = livePackages.length > 0 ? livePackages : displayedPackages;
      const targetPackage =
        searchPool.find((pkg) => getPackageProductId(pkg) === selectedProductId) ??
        searchPool[0] ??
        null;

      if (!targetPackage) {
        Alert.alert(
          tr(language, "premium.no.package"),
          tr(language, "premium.no.lost.plus.package.is.currently.available")
        );
        return;
      }

      await Purchases.purchasePackage?.(targetPackage);
      await reload();
      await loadLivePackages();
      Alert.alert(
        tr(language, "premium.subscription.started"),
        tr(language, "premium.lost.plus.purchase.completed")
      );
    } catch (err: any) {
      if (err?.userCancelled) return;
      const message =
        err?.message ||
        (tr(language, "premium.could.not.complete.purchase"));
      Alert.alert(tr(language, "premium.purchase.failed"), message);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleRestore = async () => {
    const Purchases = purchases;
    if (!Purchases) {
      Alert.alert(
        tr(language, "premium.sdk.missing"),
        tr(language, "premium.could.not.load.react.native.purchases.at.runtime")
      );
      return;
    }

    try {
      setRestoreLoading(true);
      await Purchases.restorePurchases?.();
      await reload();
      await loadLivePackages();
      Alert.alert(
        tr(language, "premium.restore.completed"),
        tr(language, "premium.purchases.have.been.restored.if.they.were.found.")
      );
    } catch (err: any) {
      const message =
        err?.message ||
        (tr(language, "premium.could.not.restore.purchases"));
      Alert.alert(tr(language, "premium.restore.failed"), message);
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.safe}>
        <PremiumHeader
          title={title}
          onBack={() => {
            try {
              router.back();
            } catch {}
          }}
        />

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Lost Plus</Text>
            <Text style={styles.heroBody}>
              {tr(language, "premium.lost.plus.gives.extended.visibility.for.lost.cas")}
            </Text>

            <View style={styles.heroStatusRow}>
              <Text style={styles.heroStatusLabel}>{tr(language, "premium.status")}</Text>
              <Text style={[styles.heroStatusValue, lostPlusActive && styles.heroStatusValueActive]}>
                {lostPlusActive
                  ? tr(language, "premium.active")
                  : tr(language, "premium.not.active")}
              </Text>
            </View>

            <Text style={[styles.label, { marginTop: theme.space.md }]}> 
              {tr(language, "premium.choose.plan")}
            </Text>

            {packageCards.length === 0 ? (
              <Text style={styles.valueBlock}>—</Text>
            ) : (
              packageCards.map((pkg) => {
                const active = pkg.productId === selectedProductId;
                return (
                  <Pressable
                    key={pkg.productId}
                    style={[styles.planCard, active && styles.planCardActive]}
                    onPress={() => setSelectedProductId(pkg.productId)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planTitle, active && styles.planTitleActive]}>
                        {pkg.title}
                      </Text>
                      <Text style={styles.planCaption}>{pkg.description}</Text>
                    </View>
                    <Text style={[styles.planPrice, active && styles.planTitleActive]}>
                      {pkg.priceText}
                    </Text>
                  </Pressable>
                );
              })
            )}

            <Pressable
              style={[styles.primaryBtn, (!canAttemptPurchase || purchaseLoading) && styles.primaryBtnDisabled]}
              onPress={() => void handleSubscribe()}
              disabled={!canAttemptPurchase || purchaseLoading}
            >
              <Text style={styles.primaryBtnTxt}>{subscribeLabel}</Text>
            </Pressable>

            <Pressable
              style={[styles.secondaryBtn, (!canAttemptRestore || restoreLoading) && styles.secondaryBtnDisabled]}
              onPress={() => void handleRestore()}
              disabled={!canAttemptRestore || restoreLoading}
            >
              <Text style={styles.secondaryBtnTxt}>
                {restoreLoading
                  ? tr(language, "premium.restoring")
                  : tr(language, "premium.restore.purchases")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>{tr(language, "premium.premium.features")}</Text>
            <Text style={styles.muted}>
              {tr(language, "premium.this.shows.what.is.active.now.and.what.is.planne")}
            </Text>

            <View style={styles.statusRow}>
              <Text style={styles.label}>Lost Plus</Text>
              <Text style={styles.value}>
                {lostPlusActive
                  ? tr(language, "premium.active")
                  : tr(language, "premium.available")}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.label}>
                {tr(language, "premium.important.local.alert")}
              </Text>
              <Text style={styles.value}>
                {summary?.canUseGeoBroadcast
                  ? tr(language, "premium.active")
                  : tr(language, "premium.coming.later")}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.label}>
                {tr(language, "premium.long.term.legacy.listing")}
              </Text>
              <Text style={styles.value}>
                {summary?.canUseLegacyCaseListing
                  ? tr(language, "premium.active")
                  : tr(language, "premium.coming.later")}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>{tr(language, "premium.technical.status")}</Text>

            <View style={styles.statusRow}>
              <Text style={styles.label}>{tr(language, "premium.initialized")}</Text>
              <Text style={styles.value}>{boolLabel(initialized, language)}</Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.label}>{tr(language, "premium.ready")}</Text>
              <Text style={styles.value}>{boolLabel(isReady, language)}</Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.label}>{tr(language, "premium.loading")}</Text>
              <Text style={styles.value}>{boolLabel(loading, language)}</Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.label}>{tr(language, "premium.error")}</Text>
              <Text style={styles.value}>{error ? (tr(language, "premium.yes")) : "—"}</Text>
            </View>

            <Pressable
              style={[styles.secondaryBtn, (loading || purchaseLoading || restoreLoading) && styles.secondaryBtnDisabled]}
              onPress={() => void handleRefresh()}
              disabled={loading || purchaseLoading || restoreLoading}
            >
              <Text style={styles.secondaryBtnTxt}>
                {loading
                  ? tr(language, "premium.refreshing")
                  : tr(language, "premium.refresh.status")}
              </Text>
            </Pressable>

            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>{tr(language, "premium.product.status")}</Text>

            <Text style={styles.label}>
              {tr(language, "premium.available.one.time.products")}
            </Text>
            <Text style={styles.valueBlock}>{joinOrDash(oneTimeProducts)}</Text>

            <Text style={[styles.label, { marginTop: theme.space.md }]}> 
              {tr(language, "premium.missing.lost.plus.products")}
            </Text>
            <Text style={styles.valueBlock}>{joinOrDash(missingLostPlusProducts)}</Text>

            <Text style={[styles.label, { marginTop: theme.space.md }]}> 
              {tr(language, "premium.missing.one.time.products")}
            </Text>
            <Text style={styles.valueBlock}>{joinOrDash(missingOneTimeProducts)}</Text>
          </View>

          <View style={styles.card}>
            <Pressable style={styles.debugToggle} onPress={() => setDebugOpen((v) => !v)}>
              <Text style={styles.h2}>{tr(language, "premium.technical.details")}</Text>
              <Text style={styles.debugToggleTxt}>{debugOpen ? "−" : "+"}</Text>
            </Pressable>
            {debugOpen && <Text style={styles.codeBlock}>{JSON.stringify(state, null, 2)}</Text>}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.xl,
    backgroundColor: theme.colors.bg,
    flexGrow: 1,
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
    marginTop: theme.space.md,
    ...theme.shadow.card,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.lg,
    marginTop: theme.space.md,
    ...theme.shadow.card,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.text,
    fontFamily: "Inter_800ExtraBold",
  },
  heroBody: {
    marginTop: theme.space.sm,
    fontSize: theme.type.body,
    color: theme.colors.muted,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  heroStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.space.lg,
  },
  heroStatusLabel: {
    fontSize: theme.type.caption,
    fontWeight: "700",
    color: theme.colors.muted,
    fontFamily: "Inter_700Bold",
  },
  heroStatusValue: {
    fontSize: theme.type.body,
    fontWeight: "900",
    color: theme.colors.text,
    fontFamily: "Inter_800ExtraBold",
  },
  heroStatusValueActive: {
    color: theme.colors.primary,
  },
  h2: {
    fontSize: theme.type.h2,
    fontWeight: "800",
    color: theme.colors.text,
    fontFamily: "Inter_800ExtraBold",
  },
  muted: {
    fontSize: theme.type.caption,
    fontWeight: "600",
    color: theme.colors.muted,
    marginTop: theme.space.sm,
    fontFamily: "Inter_600SemiBold",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.space.md,
    gap: 12,
  },
  label: {
    flex: 1,
    fontSize: theme.type.caption,
    fontWeight: "700",
    color: theme.colors.muted,
    fontFamily: "Inter_700Bold",
  },
  value: {
    fontSize: theme.type.body,
    fontWeight: "800",
    color: theme.colors.text,
    fontFamily: "Inter_700Bold",
  },
  valueBlock: {
    marginTop: theme.space.xs,
    fontSize: theme.type.body,
    color: theme.colors.text,
    fontFamily: "Inter_400Regular",
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: theme.space.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    backgroundColor: theme.colors.card,
  },
  planCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.inputBg,
  },
  planTitle: {
    fontSize: theme.type.body,
    fontWeight: "800",
    color: theme.colors.text,
    fontFamily: "Inter_700Bold",
  },
  planTitleActive: {
    color: theme.colors.primary,
  },
  planCaption: {
    marginTop: 4,
    fontSize: theme.type.caption,
    color: theme.colors.muted,
    fontFamily: "Inter_400Regular",
  },
  planPrice: {
    fontSize: theme.type.body,
    fontWeight: "800",
    color: theme.colors.text,
    fontFamily: "Inter_700Bold",
  },
  primaryBtn: {
    marginTop: theme.space.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnTxt: {
    color: "#fff",
    fontWeight: "800",
    fontSize: theme.type.body,
  },
  secondaryBtn: {
    marginTop: theme.space.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryBtnDisabled: {
    opacity: 0.7,
  },
  secondaryBtnTxt: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.type.body,
  },
  errorText: {
    marginTop: theme.space.md,
    color: theme.colors.danger,
    fontSize: theme.type.caption,
    fontFamily: "Inter_600SemiBold",
  },
  debugToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  debugToggleTxt: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  codeBlock: {
    marginTop: theme.space.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.inputBg,
    padding: theme.space.md,
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace", default: "monospace" }) as string,
  },
});
