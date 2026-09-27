// server/routes/reportsActivity.js
// GET /reports/mine/with-activity
// Returns reports, match-to-report maps, and the latest message per match in one request.

"use strict";

const express = require("express");
const router = express.Router();

// Robust Supabase admin client import supporting default and common named exports.
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
    "Supabase admin client is not initialized correctly: supaAdmin.from is not a function. " +
      "Check ../supabaseClient exports (default versus { supaAdmin })."
  );
}

function isActiveReport(rep) {
  if (!rep) return false;
  if (rep.status && rep.status !== "ACTIVE") return false;
  if (rep.closed_at || rep.archived_at || rep.deleted_at) return false;
  if (rep.visible_until && Date.parse(rep.visible_until) <= Date.now()) return false;
  return true;
}

router.get("/mine/with-activity", requireUser, async (req, res) => {
  try {
    const user = req.user;

    // 1) Load reports.
    const { data: reports, error: rErr } = await supaAdmin
      .from("reports")
      .select(
        "id, type, category, subcategory_key, title, created_at, occurred_at, color, brand, lat, lng, location_label, status, visible_until, closed_at, archived_at, last_extended_at, extension_count, deleted_at"
      )
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (rErr) return res.status(400).json({ error: rErr.message });

    const reps = reports || [];
    if (reps.length === 0) {
      return res.json({ reports: [], matchToReport: {}, lastMessages: [] });
    }

    const reportIds = reps.map((r) => r.id);
    const reportSet = new Set(reportIds);

    // 2) Load all matches for these reports and merge both query results.
    const { data: lostMatches, error: lmErr } = await supaAdmin
      .from("matches")
      .select("id, status, lost_id, found_id, lost:lost_id(id,user_id,status,visible_until,closed_at,archived_at,deleted_at), found:found_id(id,user_id,status,visible_until,closed_at,archived_at,deleted_at)")
      .in("lost_id", reportIds);
    if (lmErr) return res.status(400).json({ error: lmErr.message });

    const { data: foundMatches, error: fmErr } = await supaAdmin
      .from("matches")
      .select("id, status, lost_id, found_id, lost:lost_id(id,user_id,status,visible_until,closed_at,archived_at,deleted_at), found:found_id(id,user_id,status,visible_until,closed_at,archived_at,deleted_at)")
      .in("found_id", reportIds);
    if (fmErr) return res.status(400).json({ error: fmErr.message });

    const merged = new Map();
    for (const m of (lostMatches || [])) merged.set(m.id, m);
    for (const m of (foundMatches || [])) merged.set(m.id, m);
    const ownedMatches = Array.from(merged.values()).filter(
      (m) => m?.lost?.user_id !== m?.found?.user_id
    );

    const activeMatches = ownedMatches.filter(
      (m) => isActiveReport(m?.lost) && isActiveReport(m?.found)
    );

    const historicalMatches = ownedMatches.filter((m) =>
      ["CONFIRMED", "PAID"].includes(String(m?.status || "").toUpperCase())
    );

    function buildMap(matches) {
      const out = {};
      for (const m of matches) {
        const lostId = String(m.lost_id || "");
        const foundId = String(m.found_id || "");
        if (lostId && reportSet.has(lostId)) out[String(m.id)] = lostId;
        else if (foundId && reportSet.has(foundId)) out[String(m.id)] = foundId;
      }
      return out;
    }

    // Active matches drive active match counts. Confirmed historical matches retain chat access.
    const matchToReport = buildMap(activeMatches);
    const historyMatchToReport = buildMap(historicalMatches);
    const matchIds = Array.from(new Set([
      ...Object.keys(matchToReport),
      ...Object.keys(historyMatchToReport),
    ]));

    if (matchIds.length === 0) {
      return res.json({ reports: reps, matchToReport, historyMatchToReport, lastMessages: [] });
    }

    // 4) Load the latest message per match in one request. Requires last_message_per_conversation.
    const { data: lastRows, error: lastErr } = await supaAdmin
      .from("last_message_per_conversation")
      .select("conversation_id, sender_id, body, created_at")
      .in("conversation_id", matchIds);

    if (lastErr) {
      return res.status(400).json({
        error:
          lastErr.message +
          " (Missing view: last_message_per_conversation.)",
      });
    }

    return res.json({
      reports: reps,
      matchToReport,
      historyMatchToReport,
      lastMessages: lastRows || [],
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

module.exports = router;
