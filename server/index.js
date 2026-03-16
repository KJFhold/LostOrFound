// C:\RN\RepairLostOrFound\server\index.js
require('dotenv').config(); // Laster .env fra samme mappe
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();

// ---- Konfig ----
const PORT = process.env.PORT || 4242;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Valider konfig tidlig
if (!STRIPE_SECRET_KEY) {
  console.error('[CONFIG] STRIPE_SECRET_KEY mangler i .env');
  console.error('Legg til: STRIPE_SECRET_KEY=sk_test_xxx i C:\\RN\\RepairLostOrFound\\server\\.env');
  process.exit(1);
}

// Init Stripe-klient (bruker din secret key)
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  // Valgfritt: lås API-versjon for forutsigbarhet
  apiVersion: '2024-06-20',
});

// ---- Middleware ----
app.use(cors());
app.use(express.json());

// ---- Hjelpere ----
const nokToOre = (nok) => {
  const n = Number(nok);
  if (Number.isNaN(n)) throw new Error('Ugyldig beløp');
  return Math.round(n * 100);
};

// ---- Routes ----
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Stripe server OK' });
});

app.post('/payment-sheet', async (req, res) => {
  try {
    const { amountNok = 50 } = req.body;

    // 1) Opprett kunde
    const customer = await stripe.customers.create();

    // 2) Lag ephemeral key for kunden
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      // NB! ephem keys krever at du spesifiserer apiVersion i options-objektet
      { apiVersion: '2024-06-20' }
    );

    // 3) Opprett payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: nokToOre(amountNok),
      currency: 'nok',
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
    });

    // 4) Returner secrets til appen
    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
    });
  } catch (err) {
    console.error('[POST /payment-sheet] Error:', err);
    res.status(400).json({ error: err?.message ?? 'Ukjent feil' });
  }
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`Stripe server kjører på http://localhost:${PORT}`);
});