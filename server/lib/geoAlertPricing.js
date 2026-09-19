"use strict";

const TIER_PRICES_ORE = Object.freeze({
  1: 9900,
  2: 14900,
  3: 24900,
  4: 39900,
  5: 59900,
});

const DENSITY_POINTS = Object.freeze({
  VERY_LOW: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  VERY_HIGH: 4,
});

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function calculateGeoAlertQuote(input) {
  const areaSqKm = Math.max(0.01, Math.min(finite(input?.areaSqKm, 0.01), 5000));
  const densityBand = String(input?.populationDensityBand || "LOW").toUpperCase();
  const densityPoints = DENSITY_POINTS[densityBand];
  if (densityPoints === undefined) throw new Error("INVALID_POPULATION_DENSITY_BAND");

  const estimatedEligibleUsers = Math.max(0, Math.min(Math.round(finite(input?.estimatedEligibleUsers)), 10000000));
  const durationHours = Math.max(1, Math.min(Math.round(finite(input?.durationHours, 72)), 720));
  const reminderCount = Math.max(0, Math.min(Math.round(finite(input?.reminderCount)), 10));

  let score = 0;
  if (areaSqKm > 1) score += 1;
  if (areaSqKm > 5) score += 1;
  if (areaSqKm > 25) score += 1;
  if (densityPoints >= 2) score += 1;
  if (densityPoints >= 4) score += 1;
  if (estimatedEligibleUsers >= 100) score += 1;
  if (estimatedEligibleUsers >= 1000) score += 1;
  if (estimatedEligibleUsers >= 10000) score += 1;
  if (durationHours > 72) score += 1;
  if (durationHours > 168) score += 1;
  if (reminderCount > 0) score += 1;
  if (reminderCount > 1) score += 1;

  const tier = score <= 1 ? 1 : score <= 3 ? 2 : score <= 5 ? 3 : score <= 8 ? 4 : 5;
  const productCode = `GEO_ALERT_TIER_${tier}`;

  return {
    productCode,
    tier,
    amountOre: TIER_PRICES_ORE[tier],
    currency: "NOK",
    validForMinutes: 15,
    priceSnapshot: {
      version: 1,
      test_price: true,
      area_sq_km: areaSqKm,
      population_density_band: densityBand,
      estimated_eligible_users: estimatedEligibleUsers,
      duration_hours: durationHours,
      reminder_count: reminderCount,
      score,
      tier,
    },
  };
}

module.exports = { calculateGeoAlertQuote, TIER_PRICES_ORE };
