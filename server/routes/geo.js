// server/routes/geo.js
"use strict";

const { Router } = require("express");
const { requireUser } = require("../mw/auth");

const router = Router();

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout (${ms}ms)`)), ms)
    ),
  ]);
}

// GET /geo/reverse?lat=..&lng=..&language=no
router.get("/reverse", requireUser, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const language = String(req.query.language || "no");

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.log("[geo] invalid lat/lng", req.query);
      return res.status(400).json({ error: "Invalid lat/lng" });
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      console.log("[geo] Missing GOOGLE_MAPS_API_KEY");
      return res.status(500).json({ error: "Missing GOOGLE_MAPS_API_KEY on server" });
    }

    const url =
      "https://maps.googleapis.com/maps/api/geocode/json" +
      `?latlng=${encodeURIComponent(`${lat},${lng}`)}` +
      `&key=${encodeURIComponent(key)}` +
      `&language=${encodeURIComponent(language)}`;

    const r = await withTimeout(fetch(url), 12_000);
    const json = await r.json().catch(() => null);

    const results = json?.results;
    let label = null;
    if (Array.isArray(results) && results.length > 0) {
      const street = results.find((x) => Array.isArray(x?.types) && x.types.includes("street_address"));
      label = street?.formatted_address || results[0]?.formatted_address || null;
    }

    console.log("[geo] google status:", json?.status, "label:", label);

    return res.json({
      label,
      status: json?.status ?? null,
      error_message: json?.error_message ?? null,
    });
  } catch (e) {
    console.log("[geo] server error", e?.message ?? e);
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

module.exports = router;