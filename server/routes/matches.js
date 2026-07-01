// server/routes/matches.js
// Matches API:
// - GET /matches?reportId=... (henter matcher for rapporten)
// - GET /matches/:id (henter én match)
// - POST /matches/:id/status (oppdaterer status)
//
// Policy / regler:
// - 3A: Kun eier av MISTET (LOST) kan bekrefte match (CONFIRMED). FOUND kan ikke initiere kontakt.
// - B2a: Når match bekreftes, varsle motpart (in-app notification).
// - B (sikkerhetsnett): Tidsregel med buffer (timer) for å skjule tidsmessig umulige matcher.
"use strict";

const express = require("express");
const router = express.Router();

const supaModule = require("../supabaseClient");
const supaAdmin =
  supaModule?.supaAdmin ||
  supaModule?.supabaseAdmin ||
  supaModule?.admin ||
  supaModule?.client ||
  supaModule;

const authModule = require("../mw/auth");
const requireUser = authModule?.requireUser || authModule;

if (!supaAdmin || typeof supaAdmin.from !== "function") {
  throw new Error(
    "Supabase admin-klient er ikke korrekt initialisert: supaAdmin.from er ikke en funksjon."
  );
}

// Konfig: tidsbuffer (timer) for API-filter (default 48). Kan settes i server .env
// NB: Matchmotoren i Supabase bør bruke samme buffer (parameter p_time_buffer_hours).
const MATCH_TIME_BUFFER_HOURS = (() => {
  const raw = process.env.MATCH_TIME_BUFFER_HOURS;
  const n = Number.parseInt(String(raw ?? "48"), 10);
  if (!Number.isFinite(n)) return 48;
  return Math.max(0, Math.min(24 * 30, n)); // clamp: 0..30 dager
})();

function isAllowedStatus(s) {
  return s === "SEEN" || s === "DISMISSED" || s === "CONFIRMED";
}

const MATCH_SELECT = `
 id, score, status, reasons,
 lost:lost_id (
   id, user_id, type, category, subcategory_key, title, description, color, brand,
   occurred_at, created_at, lat, lng, location_label,
   radius_m, search_radius_m, area_radius_m, location_radius_m,
   reward_ore,
   report_images ( id, path, sort_order, created_at )
 ),
 found:found_id (
   id, user_id, type, category, subcategory_key, title, description, color, brand,
   occurred_at, created_at, lat, lng, location_label,
   radius_m, search_radius_m, area_radius_m, location_radius_m,
   reward_ore,
   report_images ( id, path, sort_order, created_at )
 )
`;

// Tidsregel (tilpasset):
// LOST.occurred_at = når bruker mener de mistet
// FOUND.occurred_at = "sett siste gang" (ikke funnet-tid)
// Derfor bruker vi FOUND.created_at (meldt inn-tid) i denne guard'en.
// Hard stop: hvis LOST-tidspunkt er mer enn buffer etter at FOUND ble meldt inn.
function isTimeCompatible(lost, found) {
  try {
    const bufferMs = MATCH_TIME_BUFFER_HOURS * 60 * 60 * 1000;
    const lostWhen = Date.parse(lost?.occurred_at || lost?.created_at || "");
    const foundReported = Date.parse(found?.created_at || "");
    // Hvis vi ikke har nok data: ikke blokkér
    if (!Number.isFinite(lostWhen) || !Number.isFinite(foundReported)) return true;
    return lostWhen <= foundReported + bufferMs;
  } catch {
    return true;
  }
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function reportRadiusMeters(rep) {
  const candidates = [
    rep?.radius_m,
    rep?.search_radius_m,
    rep?.area_radius_m,
    rep?.location_radius_m,
    rep?.search_radius,
    rep?.radius,
    rep?.area_radius,
    rep?.location_radius,
  ];
  for (const raw of candidates) {
    const n = toNumber(raw);
    if (n != null && n > 0) return n;
  }
  return null;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function upsertReason(reasons, key, value) {
  const list = Array.isArray(reasons) ? reasons.slice() : [];
  const idx = list.findIndex((r) => r && r.k === key);
  const entry = { k: key, v: value };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  return list;
}

// Beriker matchene med område-/radiusinfo for frontend:
// - distance_m (hvis mangler)
// - within_radius
// - outside_radius_m
function enrichMatchAreaInfo(match) {
  try {
    if (!match || !match.lost || !match.found) return match;

    let reasons = Array.isArray(match.reasons) ? match.reasons.slice() : [];
    const existingDistance = reasons.find((r) => r?.k === "distance_m")?.v;

    const lostLat = toNumber(match.lost?.lat);
    const lostLng = toNumber(match.lost?.lng);
    const foundLat = toNumber(match.found?.lat);
    const foundLng = toNumber(match.found?.lng);

    let distanceM = toNumber(existingDistance);

    // Hvis distance_m ikke finnes fra før, regn den ut her
    if (distanceM == null && lostLat != null && lostLng != null && foundLat != null && foundLng != null) {
      distanceM = Math.round(haversineMeters(lostLat, lostLng, foundLat, foundLng));
      reasons = upsertReason(reasons, "distance_m", distanceM);
    }

    // Bruk LOST-radius som grunnlag for områdevurdering
    const radiusM = reportRadiusMeters(match.lost);

    if (distanceM != null && radiusM != null) {
      const withinRadius = distanceM <= radiusM;
      const outsideRadiusM = Math.max(0, distanceM - radiusM);
      reasons = upsertReason(reasons, "within_radius", withinRadius);
      reasons = upsertReason(reasons, "outside_radius_m", outsideRadiusM);
    }

    return { ...match, reasons };
  } catch {
    return match;
  }
}

// GET /matches?reportId=...
router.get("/", requireUser, async (req, res) => {
  try {
    const user = req.user;
    const reportId = String(req.query.reportId || "");
    if (!reportId) return res.status(400).json({ error: "reportId required" });

    const { data: report, error: rErr } = await supaAdmin
      .from("reports")
      .select("id, type, user_id")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (rErr || !report) return res.status(404).json({ error: "Report not found" });

    const isLost = report.type === "LOST";

    const { data: matches, error: mErr } = await supaAdmin
      .from("matches")
      .select(MATCH_SELECT)
      .or(isLost ? `lost_id.eq.${reportId}` : `found_id.eq.${reportId}`)
      .order("score", { ascending: false });

    if (mErr) return res.status(400).json({ error: mErr.message });

    const filtered = (matches || [])
      .filter((m) => isTimeCompatible(m?.lost, m?.found))
      .map(enrichMatchAreaInfo);

    return res.json({ matches: filtered });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

// GET /matches/:id
router.get("/:id", requireUser, async (req, res) => {
  try {
    const user = req.user;
    const matchId = req.params.id;

    const { data: match, error } = await supaAdmin
      .from("matches")
      .select(MATCH_SELECT)
      .eq("id", matchId)
      .single();

    if (error || !match) return res.status(404).json({ error: "Match not found" });

    const owns = match?.lost?.user_id === user.id || match?.found?.user_id === user.id;
    if (!owns) return res.status(403).json({ error: "Not allowed" });

    // Hard stop: skjul tidsmessig umulige matcher
    if (!isTimeCompatible(match?.lost, match?.found)) {
      return res.status(404).json({ error: "Match not found" });
    }

    return res.json({ match: enrichMatchAreaInfo(match) });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

// POST /matches/:id/status
// body: { status: "SEEN" | "DISMISSED" | "CONFIRMED" }
router.post("/:id/status", requireUser, async (req, res) => {
  try {
    const user = req.user;
    const matchId = req.params.id;
    const status = req.body?.status;

    if (!isAllowedStatus(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const { data: match, error: mErr } = await supaAdmin
      .from("matches")
      .select(`id, status, lost:lost_id ( user_id ), found:found_id ( user_id )`)
      .eq("id", matchId)
      .single();

    if (mErr || !match) return res.status(404).json({ error: "Match not found" });

    const ownsLost = match.lost?.user_id === user.id;
    const ownsFound = match.found?.user_id === user.id;
    if (!ownsLost && !ownsFound) return res.status(403).json({ error: "Not allowed" });

    // 3A: FOUND kan ikke initiere kontakt. Kun MISTET kan bekrefte.
    if (status === "CONFIRMED" && !ownsLost) {
      return res.status(403).json({ error: "Only LOST owner can confirm" });
    }

    const { error: uErr } = await supaAdmin.from("matches").update({ status }).eq("id", matchId);
    if (uErr) return res.status(400).json({ error: uErr.message });

    // Opprett conversation ved CONFIRMED
    if (status === "CONFIRMED") {
      const { error: cErr } = await supaAdmin.from("conversations").insert({ id: matchId });
      if (cErr && !String(cErr.message || "").toLowerCase().includes("duplicate")) {
        return res.status(500).json({ error: "Failed to create conversation" });
      }
    }

    // B2a: varsle motpart ved første gang CONFIRMED
    if (status === "CONFIRMED" && match.status !== "CONFIRMED") {
      const otherUserId = ownsLost
        ? match.found?.user_id
        : (ownsFound ? match.lost?.user_id : null);

      if (otherUserId && otherUserId !== user.id) {
        try {
          await supaAdmin.from("notifications").insert({
            user_id: otherUserId,
            type: "MATCH_CONFIRMED",
            entity_type: "match",
            entity_id: matchId,
            title: "Treff bekreftet",
            body: "Motpart har bekreftet treffet. Åpne chat for å avtale videre.",
          });
        } catch (nErr) {
          console.warn("[matches] notify MATCH_CONFIRMED failed", nErr?.message ?? nErr);
        }
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

module.exports = router;
