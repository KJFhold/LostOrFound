// src/lib/reverseGeocode.ts
import { supabase } from "./supabase";
import { API_BASE_URL } from "./config";

function withTimeout<T>(p: Promise<T>, ms = 12_000, label = "Reverse geocode") {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (${Math.round(ms / 1000)}s)`)), ms)
    ),
  ]);
}

export async function reverseGeocodeToLabel(
  lat: number,
  lng: number,
  opts?: { language?: string }
): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;

  if (!token) {
    if (__DEV__) console.log("[geo] no token -> skip");
    return null;
  }

  const language = opts?.language || "no";
  const url =
    `${API_BASE_URL}/geo/reverse?lat=${encodeURIComponent(String(lat))}` +
    `&lng=${encodeURIComponent(String(lng))}` +
    `&language=${encodeURIComponent(language)}`;

  try {
    const res = await withTimeout(
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
      12_000,
      "Reverse geocode"
    );

    const json: any = await res.json().catch(() => null);

    if (__DEV__) {
      console.log("[geo] /geo/reverse response", {
        ok: res.ok,
        http: res.status,
        label: json?.label ?? null,
        status: json?.status ?? null,
        error_message: json?.error_message ?? json?.error ?? null,
      });
    }

    if (!res.ok) return null;
    return json?.label ? String(json.label) : null;
  } catch (e: any) {
    if (__DEV__) console.log("[geo] /geo/reverse failed", e?.message ?? String(e));
    return null;
  }
}