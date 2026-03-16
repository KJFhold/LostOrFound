// src/hooks/usePaymentSheet.ts
import { useCallback } from 'react';
import {
  useStripe,
  InitPaymentSheetResult,
  PresentPaymentSheetResult,
} from '@stripe/stripe-react-native';
import { createPaymentIntent } from '../lib/payments';

type StartPaymentOptions = {
  amountOre: number;      // 19900 for 199 kr
  currency?: string;      // 'nok' default
  merchantName?: string;  // vises i Payment Sheet
};

export function usePaymentSheet() {
  // Ikke destructure isGooglePaySupported – finnes ikke i alle versjoner
  const stripe = useStripe();

  const startPayment = useCallback(
    async (opts: StartPaymentOptions): Promise<boolean> => {
      const {
        amountOre,
        currency = 'nok',
        merchantName = 'Lost or Found',
      } = opts;

      // 1) Hent clientSecret fra backend
      const { clientSecret } = await createPaymentIntent(amountOre, currency);

      // 2) Initialiser Payment Sheet
      const init: InitPaymentSheetResult = await stripe.initPaymentSheet({
        merchantDisplayName: merchantName,
        paymentIntentClientSecret: clientSecret,

        // Valgfritt: aktiver Apple Pay/Google Pay senere
        // applePay: { merchantCountryCode: 'NO' },
        // googlePay: { merchantCountryCode: 'NO', testEnv: true, currencyCode: 'NOK' },

        // Valgfritt: forhåndsfylling av fakturainfo
        defaultBillingDetails: { name: 'Kunde' },

        // Valgfritt: stil
        // style: 'automatic', // 'alwaysLight' | 'alwaysDark' | 'automatic'
        // returnURL: 'lostorfound://stripe-redirect', // hvis du bruker redirect-flows
      });

      if (init.error) {
        // Payload inneholder .code og .message
        throw new Error(`initPaymentSheet error: ${init.error.message}`);
      }

      // (Valgfritt) Google Pay-støtte kan sjekkes slik, men er ikke nødvendig:
      // if (typeof (stripe as any).isGooglePaySupported === 'function') {
      //   try { await (stripe as any).isGooglePaySupported(); } catch {}
      // }

      // 3) Vis Payment Sheet
      const present: PresentPaymentSheetResult = await stripe.presentPaymentSheet();
      if (present.error) {
        // Vanlig ved avbrytelse eller valideringsfeil
        throw new Error(present.error.message);
      }

      // Suksess!
      return true;
    },
    [stripe] // én dep er nok siden vi kaller metoder på samme stripe-objekt
  );

  return { startPayment };
}