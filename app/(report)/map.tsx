// src/contexts/ReportDraftContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReportType = "LOST" | "FOUND";

export type ReportLocation = {
  latitude: number;
  longitude: number;
  address?: string;
  /** Valgt radius i meter (valgfritt). */
  radiusMeters?: number;
  /** True only after the user has actively confirmed the map selection. */
  confirmed?: boolean;
};

export type ReportDraft = {
  type?: ReportType;
  category?: string;
  subcategoryKey?: string;
  subcategoryCustom?: string;

  description?: string;
  color?: string;
  colorSecondary?: string;
  brand?: string;
  rewardNOK?: string;
  occurredAtISO?: string;

  location: ReportLocation | null;
};

const STORAGE_KEY = "@lostfound:reportDraft:v1";

const initialDraft: ReportDraft = {
  type: "LOST",
  category: "PERSONAL",
  subcategoryKey: "",
  subcategoryCustom: "",
  description: "",
  color: "",
  colorSecondary: "",
  brand: "",
  rewardNOK: "0",
  occurredAtISO: undefined,
  location: { latitude: 59.9139, longitude: 10.7522, radiusMeters: 500 },
};

type Ctx = {
  draft: ReportDraft;
  loading: boolean; // true mens vi rehydrerer fra disk
  /** Sett et vilkårlig felt i utkastet. */
  setField: <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => void;
  /** Sett posisjonen (lat/lng[/radiusMeters]). */
  setLocation: (loc: ReportLocation | null) => void;
  /** Nullstill hele utkastet. */
  reset: () => Promise<void>;
  /** Tving lagring til disk (kall før navigasjon til login). */
  flush: () => Promise<void>;
};

const ReportDraftContext = createContext<Ctx | undefined>(undefined);

export const ReportDraftProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [draft, setDraft] = useState<ReportDraft>(initialDraft);
  const [loading, setLoading] = useState(true);

  // Debounce save
  const timerRef = useRef<any>(null);
  const lastDraftRef = useRef<ReportDraft>(initialDraft);

  const writeNow = useCallback(async (value: ReportDraft) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (e: any) {
      console.log("[ReportDraft] AsyncStorage write error:", e?.message ?? e);
    }
  }, []);

  const scheduleSave = useCallback(
    (value: ReportDraft) => {
      lastDraftRef.current = value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        writeNow(lastDraftRef.current);
      }, 300);
    },
    [writeNow]
  );

  const setField = useCallback(<K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const setLocation = useCallback((loc: ReportLocation | null) => {
    setDraft((prev) => {
      const next = { ...prev, location: loc };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const reset = useCallback(async () => {
    setDraft(initialDraft);
    if (timerRef.current) clearTimeout(timerRef.current);
    lastDraftRef.current = initialDraft;
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e: any) {
      console.log("[ReportDraft] AsyncStorage remove error:", e?.message ?? e);
    }
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await writeNow(lastDraftRef.current);
  }, [writeNow]);

  // Rehydrate on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          const hydrated = { ...initialDraft, ...(parsed || {}) };
          // Remove the old implicit default reward. Users who explicitly chose another amount keep it.
          if (String(hydrated.rewardNOK ?? "") === "199") hydrated.rewardNOK = "0";
          setDraft(hydrated);
          lastDraftRef.current = hydrated;
        } else {
          setDraft(initialDraft);
          lastDraftRef.current = initialDraft;
        }
      } catch (e: any) {
        console.log("[ReportDraft] AsyncStorage read error:", e?.message ?? e);
        setDraft(initialDraft);
        lastDraftRef.current = initialDraft;
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({ draft, loading, setField, setLocation, reset, flush }),
    [draft, loading, setField, setLocation, reset, flush]
  );

  return <ReportDraftContext.Provider value={value}>{children}</ReportDraftContext.Provider>;
};

export const useReportDraft = () => {
  const ctx = useContext(ReportDraftContext);
  if (!ctx) throw new Error("useReportDraft must be used within ReportDraftProvider");
  return ctx;
};
