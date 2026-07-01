// server/routes/reports.js
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

function toFiniteNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIntegerOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * POST /reports
 * Opprett rapport + trigger match-motor
 */
router.post("/", requireUser, async (req, res) => {
  try {
    const user = req.user;
    const {
      type,
      category,
      subcategory_key,
      subcategory_custom = null,
      title,
      description = null,
      color = null,
      brand = null,
      occurred_at,
      lat = null,
      lng = null,
      reward_ore = 0,
      location_label = null,
      radius_m = null,
      search_radius_m = null,
      area_radius_m = null,
      location_radius_m = null,
    } = req.body || {};

    if (!type || !category || !title || !occurred_at) {
      return res.status(400).json({
        error: "type, category, title og occurred_at er påkrevd",
      });
    }

    const insertPayload = {
      user_id: user.id,
      type,
      category,
      subcategory_key: subcategory_key || null,
      subcategory_custom: subcategory_custom || null,
      title,
      description,
      color,
      brand,
      occurred_at,
      lat: toFiniteNumberOrNull(lat),
      lng: toFiniteNumberOrNull(lng),
      reward_ore: Math.max(0, toIntegerOrNull(reward_ore) ?? 0),
      location_label: location_label || null,
      radius_m: toIntegerOrNull(radius_m),
      search_radius_m: toIntegerOrNull(search_radius_m),
      area_radius_m: toIntegerOrNull(area_radius_m),
      location_radius_m: toIntegerOrNull(location_radius_m),
    };

    const { data, error } = await supaAdmin
      .from("reports")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    let candidates = [];
    try {
      await supaAdmin.rpc("refresh_matches_for_report", {
        p_report_id: data.id,
      });

      const matchColumn = data.type === "LOST" ? "lost_id" : "found_id";
      const { data: matchRows, error: matchErr } = await supaAdmin
        .from("matches")
        .select("id, score, status, reasons, lost_id, found_id")
        .eq(matchColumn, data.id)
        .order("score", { ascending: false });

      if (matchErr) {
        console.warn("[reports] fetch candidates failed", matchErr.message);
      } else {
        candidates = matchRows || [];
      }
    } catch (rpcErr) {
      console.warn("[reports] refresh_matches_for_report failed", rpcErr?.message ?? rpcErr);
    }

    return res.json({ report: data, candidates });
  } catch (e) {
    return res.status(500).json({
      error: e?.message ?? "Server error",
    });
  }
});

/**
 * GET /reports/mine
 * Hent brukerens egne rapporter.
 * Må ligge før /:id for å unngå route-kollisjon.
 */
router.get("/mine", requireUser, async (req, res) => {
  try {
    const user = req.user;

    const { data, error } = await supaAdmin
      .from("reports")
      .select(
        "id, type, category, subcategory_key, title, created_at, occurred_at, color, brand, lat, lng, location_label, radius_m, search_radius_m, area_radius_m, location_radius_m"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ reports: data || [] });
  } catch (e) {
    return res.status(500).json({
      error: e?.message ?? "Server error",
    });
  }
});

/**
 * DELETE /reports/:id
 * Slett rapport (eier-sjekk) + best-effort cleanup av Storage-objekter.
 */
router.delete("/:id", requireUser, async (req, res) => {
  try {
    const user = req.user;
    const reportId = req.params.id;

    const { data: report, error: rErr } = await supaAdmin
      .from("reports")
      .select("id")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (rErr) return res.status(400).json({ error: rErr.message });
    if (!report) return res.status(404).json({ error: "Report not found" });

    const { data: imgs, error: iErr } = await supaAdmin
      .from("report_images")
      .select("path")
      .eq("report_id", reportId);

    if (iErr) return res.status(400).json({ error: iErr.message });

    const paths = (imgs || []).map((x) => x.path).filter(Boolean);

    const { error: dErr } = await supaAdmin
      .from("reports")
      .delete()
      .eq("id", reportId)
      .eq("user_id", user.id);

    if (dErr) return res.status(400).json({ error: dErr.message });

    const byBucket = new Map();
    for (const p of paths) {
      const [bucket, ...rest] = String(p).split("/");
      const objectPath = rest.join("/");
      if (!bucket || !objectPath) continue;
      if (!byBucket.has(bucket)) byBucket.set(bucket, []);
      byBucket.get(bucket).push(objectPath);
    }

    const cleanupResults = [];
    for (const [bucket, objectPaths] of byBucket.entries()) {
      try {
        const { error: sErr } = await supaAdmin.storage
          .from(bucket)
          .remove(objectPaths);
        if (sErr) cleanupResults.push({ bucket, ok: false, error: sErr.message });
        else cleanupResults.push({ bucket, ok: true, count: objectPaths.length });
      } catch (e) {
        cleanupResults.push({ bucket, ok: false, error: String(e) });
      }
    }

    return res.json({ ok: true, deleted: reportId, storageCleanup: cleanupResults });
  } catch (e) {
    return res.status(500).json({
      error: e?.message ?? "Server error",
    });
  }
});

/**
 * GET /reports/:id
 * Hent én rapport + bilder (kun hvis brukeren eier den)
 */
router.get("/:id", requireUser, async (req, res) => {
  try {
    const user = req.user;
    const reportId = req.params.id;

    const { data: report, error: rErr } = await supaAdmin
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (rErr || !report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const { data: images, error: iErr } = await supaAdmin
      .from("report_images")
      .select("id, path, sort_order")
      .eq("report_id", reportId)
      .order("sort_order", { ascending: true });

    if (iErr) {
      return res.status(400).json({ error: iErr.message });
    }

    return res.json({ report, images: images || [] });
  } catch (e) {
    return res.status(500).json({
      error: e?.message ?? "Server error",
    });
  }
});

module.exports = router;
