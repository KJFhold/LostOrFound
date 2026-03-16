// src/lib/payments.ts
import { Platform } from 'react-native';

const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:4242', // Android emulator
  ios: 'http://localhost:4242',    // iOS simulator
  default: 'http://localhost:4242' // Web/dev
});

export async function createPaymentIntent(amountOre: number, currency = 'nok') {
  const res = await fetch(`${BASE_URL}/create-payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountOre, currency })
  });

  if (!res.ok) {
    // nyttig for feilsøking
    const text = await res.text().catch(() => '');
    throw new Error(`Backend error ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<{ clientSecret: string; paymentIntentId: string }>;
}