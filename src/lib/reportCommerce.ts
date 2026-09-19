import { API_BASE_URL } from "./config";
import { supabase } from "./supabase";
import type { GeoAlertQuoteInput, ReportProductCode } from "./reportProducts";

async function token() {
  const { data } = await supabase.auth.getSession();
  const value = data.session?.access_token;
  if (!value) throw new Error("AUTH_REQUIRED");
  return value;
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await token();
  const response = await fetch(`${API_BASE_URL}/report-commerce${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `HTTP_${response.status}`);
  return data as T;
}
export function fetchReportProductCatalog() {
  return request<{ products: unknown[] }>("/catalog");
}
export function quoteGeoAlert(reportId: string, input: GeoAlertQuoteInput) {
  return request<{ quote: unknown }>("/geo-alert/quote", { method: "POST", body: JSON.stringify({ reportId, ...input }) });
}
export function createReportOrder(input: {
  reportId: string;
  productCode: ReportProductCode | "GEO_ALERT";
  clientRequestId: string;
  platform: "IOS" | "ANDROID" | "WEB" | "TEST";
  provider: "APPLE" | "GOOGLE" | "REVENUECAT" | "STRIPE" | "TEST";
  occurredPrecision?: "EXACT" | "MONTH" | "YEAR" | "UNKNOWN";
  occurredYear?: number | null;
  occurredMonth?: number | null;
  geoAlert?: Record<string, unknown>;
}) {
  return request<{ order: any; idempotentReplay: boolean }>("/orders", { method: "POST", body: JSON.stringify(input) });
}
export function fetchReportOrder(orderId: string) {
  return request<{ order: any }>(`/orders/${encodeURIComponent(orderId)}`);
}
export function activateTestReportOrder(orderId: string) {
  return request<{ order: any; entitlement: any; testActivation: true }>(`/orders/${encodeURIComponent(orderId)}/test-activate`, { method: "POST" });
}
