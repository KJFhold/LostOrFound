// server/routes/reportsActivity.js
// GET /reports/mine/with-activity
// Returnerer rapporter + matchId->reportId map + siste melding per match (ett kall) for "Mine rapporter".

"use strict";

const express = require("express");
const router = express.Router();

// Robust import av supabase admin-klient (støtter default + vanlige named exports)
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
    "Supabase admin-klient er ikke korrekt initialisert: supaAdmin.from er ikke en funksjon. " +
      "Sjekk ../supabaseClient exports (default vs {supaAdmin})."
  );
}

router.get("/mine/with-activity", requireUser, async (req, res) => {
  try {
    const user = req.user;

    // 1) Hent rapporter
    const { data: reports, error: rErr } = await supaAdmin
      .from("reports")
      .select(
        "id, type, category, subcategory_key, title, created_at, occurred_at, color, brand, lat, lng, location_label"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (rErr) return res.status(400).json({ error: rErr.message });

    const reps = reports || [];
    if (reps.length === 0) {
      return res.json({ reports: [], matchToReport: {}, lastMessages: [] });
    }

    const reportIds = reps.map((r) => r.id);
    const reportSet = new Set(reportIds);

    // 2) Hent alle matcher for disse rapportene (2 queries, så merge)
    const { data: lostMatches, error: lmErr } = await supaAdmin
      .from("matches")
      .select("id, lost_id, found_id")
      .in("lost_id", reportIds);
    if (lmErr) return res.status(400).json({ error: lmErr.message });

    const { data: foundMatches, error: fmErr } = await supaAdmin
      .from("matches")
      .select("id, lost_id, found_id")
      .in("found_id", reportIds);
    if (fmErr) return res.status(400).json({ error: fmErr.message });

    const merged = new Map();
    for (const m of (lostMatches || [])) merged.set(m.id, m);
    for (const m of (foundMatches || [])) merged.set(m.id, m);
    const allMatches = Array.from(merged.values());

    // 3) Bygg matchId -> reportId map (for realtime mapping i app)
    // Hvis bruker (uvanlig) eier begge sider, velger vi lost_id først.
    const matchToReport = {};
    for (const m of allMatches) {
      const lostId = String(m.lost_id || "");
      const foundId = String(m.found_id || "");
      if (lostId && reportSet.has(lostId)) {
        matchToReport[String(m.id)] = lostId;
      } else if (foundId && reportSet.has(foundId)) {
        matchToReport[String(m.id)] = foundId;
      }
    }

    const matchIds = Object.keys(matchToReport);
    if (matchIds.length === 0) {
      return res.json({ reports: reps, matchToReport, lastMessages: [] });
    }

    // 4) Hent siste melding per match i ett kall (krever view: last_message_per_conversation)
    const { data: lastRows, error: lastErr } = await supaAdmin
      .from("last_message_per_conversation")
      .select("conversation_id, sender_id, body, created_at")
      .in("conversation_id", matchIds);

    if (lastErr) {
      return res.status(400).json({
        error:
          lastErr.message +
          " (Mangler view? Kjør SQL: create view last_message_per_conversation ... )",
      });
    }

    return res.json({
      reports: reps,
      matchToReport,
      lastMessages: lastRows || [],
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

module.exports = router;
