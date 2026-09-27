// src/hooks/useRevenueCatState.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getRevenueCatReadinessSummary,
  initializeRevenueCatIntegration,
  type RevenueCatIntegrationSdk,
  type RevenueCatIntegrationState,
} from "../lib/revenueCatIntegration";

export type UseRevenueCatStateOptions = {
  purchases?: RevenueCatIntegrationSdk | null;
  appUserId?: string;
  autoLoad?: boolean;
};

export type RevenueCatHookState = {
  loading: boolean;
  initialized: boolean;
  state: RevenueCatIntegrationState | null;
  summary: ReturnType<typeof getRevenueCatReadinessSummary> | null;
  error: string | null;
  reload: () => Promise<RevenueCatIntegrationState | null>;
};

export function useRevenueCatState(
  options?: UseRevenueCatStateOptions
): RevenueCatHookState {
  const { purchases = null, appUserId, autoLoad = true } = options ?? {};

  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [state, setState] = useState<RevenueCatIntegrationState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<RevenueCatIntegrationState | null> => {
    try {
      setLoading(true);
      setError(null);
      const next = await initializeRevenueCatIntegration(purchases, { appUserId });
      setState(next);
      setInitialized(true);
      return next;
    } catch (err: any) {
      const message = err?.message || "Failed to initialize RevenueCat state.";
      setError(message);
      setInitialized(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, [appUserId, purchases]);

  useEffect(() => {
    if (!autoLoad) return;
    void reload();
  }, [autoLoad, reload]);

  const summary = useMemo(() => {
    return state ? getRevenueCatReadinessSummary(state) : null;
  }, [state]);

  return {
    loading,
    initialized,
    state,
    summary,
    error,
    reload,
  };
}
