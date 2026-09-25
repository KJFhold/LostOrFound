import { API_BASE_URL } from "./config";
import { supabase } from "./supabase";

export type GeoAlertPreviewInput = {
  reportId: string;
  radiusM: number;
  durationHours: 24 | 72 | 168;
  reminderCount: 0 | 1 | 2;
  populationDensityBand?: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
};

export type GeoAlertPreviewResult = {
  ok: true;
  preview: {
    reportId: string;
    latitude: number;
    longitude: number;
    radiusM: number;
    areaSqKm: number;
    categoryKey: string;
    eligibleUsers: number;
    eligibleInstallations: number;
    durationHours: number;
    reminderCount: number;
    populationDensityBand: string;
  };
  quote: {
    productCode: string;
    tier: number;
    amountOre: number;
    currency: string;
    validForMinutes: number;
    priceSnapshot: Record<string, unknown>;
  };
  note: string;
};

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("AUTH_REQUIRED");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function previewGeoAlert(input: GeoAlertPreviewInput): Promise<GeoAlertPreviewResult> {
  const response = await fetch(`${API_BASE_URL}/geo-alert-preview`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(`HTTP_${response.status}_INVALID_RESPONSE`); }
  if (!response.ok) throw new Error(data?.error || `HTTP_${response.status}`);
  return data as GeoAlertPreviewResult;
}
