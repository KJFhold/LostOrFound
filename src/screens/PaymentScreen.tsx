// src/screens/PaymentScreen.tsx
import React, { useState } from 'react';
import { View, Text, Button, Alert, TextInput } from 'react-native';
import { usePaymentSheet } from '../hooks/usePaymentSheet';

import { useI18n } from "../i18n/I18nProvider";
export default function PaymentScreen() {
  const { t } = useI18n();
  const { startPayment } = usePaymentSheet();
  const [amountKr, setAmountKr] = useState('199'); // default 199 kr

  const onPay = async () => {
    const parsed = parseInt(amountKr, 10);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert(t("payment.legacy.invalid.amount"), t("payment.legacy.enter.a.positive.whole.number.in.nok"));
      return;
    }
    const amountOre = parsed * 100;

    try {
      const ok = await startPayment({ amountOre, merchantName: 'Lost or Found' });
      if (ok) {
        Alert.alert(t("payment.legacy.payment.completed.2"), `BelÃ¸p: ${parsed} kr`);
      }
    } catch (err: any) {
      Alert.alert(t("payment.legacy.payment.failed"), err?.message ?? t("payment.legacy.unknown.error"));
    }
  };

  return (
    <View style={{ flex: 1, gap: 12, padding: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>{t("payment.legacy.stripe.payment")}</Text>

      <View style={{ gap: 8 }}>
        <Text>{t("payment.legacy.amount.nok")}</Text>
        <TextInput
          value={amountKr}
          onChangeText={setAmountKr}
          keyboardType="number-pad"
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8
          }}
        />
      </View>

      <Button title={t("payment.legacy.pay.amount", { amount: amountKr })} onPress={onPay} />
    </View>
  );
}
