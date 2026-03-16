// src/screens/PaymentScreen.tsx
import React, { useState } from 'react';
import { View, Text, Button, Alert, TextInput } from 'react-native';
import { usePaymentSheet } from '../hooks/usePaymentSheet';

export default function PaymentScreen() {
  const { startPayment } = usePaymentSheet();
  const [amountKr, setAmountKr] = useState('199'); // default 199 kr

  const onPay = async () => {
    const parsed = parseInt(amountKr, 10);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Ugyldig beløp', 'Skriv inn et positivt heltall i kroner.');
      return;
    }
    const amountOre = parsed * 100;

    try {
      const ok = await startPayment({ amountOre, merchantName: 'Lost or Found' });
      if (ok) {
        Alert.alert('Betaling gjennomført 🎉', `Beløp: ${parsed} kr`);
      }
    } catch (err: any) {
      Alert.alert('Betaling feilet', err?.message ?? 'Ukjent feil');
    }
  };

  return (
    <View style={{ flex: 1, gap: 12, padding: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Stripe betaling</Text>

      <View style={{ gap: 8 }}>
        <Text>Beløp (kroner):</Text>
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

      <Button title={`Betal ${amountKr} kr`} onPress={onPay} />
    </View>
  );
}