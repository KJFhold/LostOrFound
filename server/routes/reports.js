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

const MATCH_REFRESH_CONFIG = {
  candidateLimit: Number.parseInt(process.env.MATCH_CANDIDATE_LIMIT || "50", 10),
  maxDistanceM: Number.parseInt(process.env.MATCH_MAX_DISTANCE_M || "3000", 10),
  maxAgeDays: Number.parseInt(process.env.MATCH_MAX_AGE_DAYS || "30", 10),
  minScore: Number.parseInt(process.env.MATCH_MIN_SCORE || "65", 10),
  timeBufferHours: Number.parseInt(process.env.MATCH_TIME_BUFFER_HOURS || "48", 10),
};

function safeInt(value, fallback, min, max) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function matchRefreshParams(reportId) {
  return {
    p_report_id: reportId,
    p_candidate_limit: safeInt(MATCH_REFRESH_CONFIG.candidateLimit, 50, 1, 500),
    p_max_distance_m: safeInt(MATCH_REFRESH_CONFIG.maxDistanceM, 3000, 50, 100000),
    p_max_age_days: safeInt(MATCH_REFRESH_CONFIG.maxAgeDays, 30, 1, 3650),
    p_min_score: safeInt(MATCH_REFRESH_CONFIG.minScore, 65, 0, 100),
    p_time_buffer_hours: safeInt(MATCH_REFRESH_CONFIG.timeBufferHours, 48, 0, 24 * 30),
  };
}

function toFiniteNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIntegerOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

async function safeDelete(queryBuilder, label, results) {
  try {
    const { error } = await queryBuilder;
    if (error) results.push({ step: label, ok: false, error: error.message });
    else results.push({ step: label, ok: true });
  } catch (e) {
    results.push({ step: label, ok: false, error: String(e?.message ?? e) });
  }
}

async function cleanupMatchesForReport(reportId) {
  const results = [];
  const { data: matches, error: mErr } = await supaAdmin
    .from("matches")
    .select("id")
    .or(`lost_id.eq.${reportId},found_id.eq.${reportId}`);

  if (mErr) throw mErr;

  const matchIds = (matches || []).map((m) => m.id).filter(Boolean);
  if (matchIds.length > 0) {
    await safeDelete(
      supaAdmin.from("notifications").delete().in("entity_id", matchIds),
      "notifications:matches_or_chat",
      results
    );
    await safeDelete(
      supaAdmin.from("payments").delete().in("match_id", matchIds),
      "payments",
      results
    );
    await safeDelete(
      supaAdmin.from("messages").delete().in("conversation_id", matchIds),
      "messages",
      results
    );
    await safeDelete(
      supaAdmin.from("conversations").delete().in("id", matchIds),
      "conversations",
      results
    );
    await safeDelete(
      supaAdmin.from("matches").delete().in("id", matchIds),
      "matches",
      results
    );
  }
  return { matchIds, results };
}

function normalizeReportPatch(body) {
  const input = body || {};
  const patch = {};

  if (typeof input.category === "string") patch.category = input.category.trim().toUpperCase();
  if ("subcategory_key" in input) patch.subcategory_key = input.subcategory_key ? String(input.subcategory_key).trim().toUpperCase() : null;
  if ("subcategory_custom" in input) patch.subcategory_custom = input.subcategory_custom || null;
  if (typeof input.title === "string") patch.title = input.title.trim();
  if ("description" in input) patch.description = input.description || null;
  if ("color" in input) patch.color = input.color || null;
  if ("brand" in input) patch.brand = input.brand || null;
  if ("occurred_at" in input) patch.occurred_at = input.occurred_at;
  if ("lat" in input) patch.lat = toFiniteNumberOrNull(input.lat);
  if ("lng" in input) patch.lng = toFiniteNumberOrNull(input.lng);
  if ("reward_ore" in input) patch.reward_ore = Math.max(0, toIntegerOrNull(input.reward_ore) ?? 0);
  if ("location_label" in input) patch.location_label = input.location_label || null;
  if ("radius_m" in input) patch.radius_m = toIntegerOrNull(input.radius_m);
  if ("search_radius_m" in input) patch.search_radius_m = toIntegerOrNull(input.search_radius_m);
  if ("area_radius_m" in input) patch.area_radius_m = toIntegerOrNull(input.area_radius_m);
  if ("location_radius_m, critical_edit_count, last_critical_edit_at, edit_locked_until" in input) patch.location_radius_m = toIntegerOrNull(input.location_radius_m);

  // Never allow these to be changed by client PATCH.
  delete patch.id;
  delete patch.user_id;
  delete patch.type;
  delete patch.created_at;

  return patch;
}

function changed(a, b) {
  const av = a == null ? null : String(a);
  const bv = b == null ? null : String(b);
  return av !== bv;
}

function detectCriticalChanges(existing, patch) {
  const criticalFields = ["category", "subcategory_key", "subcategory_custom", "occurred_at", "lat", "lng", "radius_m", "search_radius_m", "area_radius_m", "location_radius_m, critical_edit_count, last_critical_edit_at, edit_locked_until"];
  const changedFields = [];
  const criticalChangedFields = [];

  for (const [key, value] of Object.entries(patch)) {
    if (changed(existing[key], value)) changedFields.push(key);
    if (criticalFields.includes(key) && changed(existing[key], value)) criticalChangedFields.push(key);
  }

  return {
    changedFields,
    criticalChangedFields,
    isCritical: criticalChangedFields.length > 0,
  };
}

function minutesSince(iso) {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return (Date.now() - t) / 60000;
}

function publicEditState(report) {
  return {
    critical_edit_count: Number(report?.critical_edit_count || 0),
    last_critical_edit_at: report?.last_critical_edit_at || null,
    edit_locked_until: report?.edit_locked_until || null,
  };
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

    if (error) return res.status(400).json({ error: error.message });

    let candidates = [];
    try {
      await supaAdmin.rpc("refresh_matches_for_report", matchRefreshParams(data.id));

      const matchColumn = data.type === "LOST" ? "lost_id" : "found_id";
      const { data: matchRows, error: matchErr } = await supaAdmin
        .from("matches")
        .select("id, score, status, reasons, lost_id, found_id")
        .eq(matchColumn, data.id)
        .order("score", { ascending: false });

      if (matchErr) console.warn("[reports] fetch candidates failed", matchErr.message);
      else candidates = matchRows || [];
    } catch (rpcErr) {
      console.warn("[reports] refresh_matches_for_report failed", rpcErr?.message ?? rpcErr);
    }

    return res.json({ report: data, candidates });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/**
 * GET /reports/mine
 */
router.get("/mine", requireUser, async (req, res) => {
  try {
    const user = req.user;

    const { data, error } = await supaAdmin
      .from("reports")
      .select(
        "id, type, category, subcategory_key, title, created_at, occurred_at, color, brand, lat, lng, location_label, radius_m, search_radius_m, area_radius_m, location_radius_m, critical_edit_count, last_critical_edit_at, edit_locked_until"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ reports: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});


/**
 * PATCH /reports/:id
 * Rediger rapport med misbruksvern.
 * - LOST krever ekte konto (ikke guest, håndteres av auth/session på backend via eier-sjekk)
 * - Full redigering første 15 minutter
 * - Etter 15 minutter: maks 3 kritiske endringer og 60 min cooldown mellom kritiske endringer
 * - Kritiske endringer regenererer matcher
 */
router.patch("/:id", requireUser, async (req, res) => {
  try {
    const user = req.user;
    const reportId = req.params.id;

    const { data: existing, error: rErr } = await supaAdmin
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (rErr) return res.status(400).json({ error: rErr.message });
    if (!existing) return res.status(404).json({ error: "Report not found" });

    // Do not allow changing report type. LOST remains LOST, FOUND remains FOUND.
    const patch = normalizeReportPatch(req.body || {});
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "No editable fields provided" });
    }

    // Require required core fields to stay valid after patch.
    const next = { ...existing, ...patch };
    if (!next.category || !next.title || !next.occurred_at) {
      return res.status(400).json({ error: "category, title and occurred_at are required" });
    }

    const editInfo = detectCriticalChanges(existing, patch);
    const isCritical = editInfo.isCritical;
    const inGracePeriod = minutesSince(existing.created_at) <= 15;
    const currentCriticalCount = Number(existing.critical_edit_count || 0);
    const lockedUntilRaw = existing.edit_locked_until || null;
    const lockedUntil = lockedUntilRaw ? Date.parse(lockedUntilRaw) : NaN;

    if (isCritical && !inGracePeriod) {
      if (Number.isFinite(lockedUntil) && lockedUntil > Date.now()) {
        return res.status(429).json({
          error: "CRITICAL_EDIT_COOLDOWN",
          message: "Du har nylig endret gjenstand, tidspunkt eller område. Prøv igjen senere.",
          edit_locked_until: existing.edit_locked_until,
          edit_state: publicEditState(existing),
        });
      }

      if (currentCriticalCount >= 3) {
        return res.status(429).json({
          error: "CRITICAL_EDIT_LIMIT_REACHED",
          message: "Denne rapporten har nådd grensen for større endringer. Du kan fortsatt oppdatere tekst, farge, merke og finnerlønn.",
          edit_state: publicEditState(existing),
        });
      }
    }

    const nowIso = new Date().toISOString();
    const updatePayload = { ...patch };
    if (isCritical && !inGracePeriod) {
      updatePayload.critical_edit_count = currentCriticalCount + 1;
      updatePayload.last_critical_edit_at = nowIso;
      updatePayload.edit_locked_until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }

    const { data: updated, error: uErr } = await supaAdmin
      .from("reports")
      .update(updatePayload)
      .eq("id", reportId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (uErr) return res.status(400).json({ error: uErr.message });

    // Best-effort edit log. Do not fail edit if log table is missing in early dev, but SQL should be run.
    try {
      await supaAdmin.from("report_edits").insert({
        report_id: reportId,
        user_id: user.id,
        changed_fields: editInfo.changedFields,
        critical_fields: editInfo.criticalChangedFields,
        is_critical: isCritical,
        before: existing,
        after: updated,
      });
    } catch (logErr) {
      console.warn("[reports] report_edits insert failed", logErr?.message ?? logErr);
    }

    let candidates = [];
    let cleanup = null;
    if (isCritical) {
      cleanup = await cleanupMatchesForReport(reportId);
      try {
        await supaAdmin.rpc("refresh_matches_for_report", matchRefreshParams(reportId));
        const matchColumn = updated.type === "LOST" ? "lost_id" : "found_id";
        const { data: matchRows, error: matchErr } = await supaAdmin
          .from("matches")
          .select("id, score, status, reasons, lost_id, found_id")
          .eq(matchColumn, reportId)
          .order("score", { ascending: false });

        if (matchErr) console.warn("[reports] fetch refreshed candidates failed", matchErr.message);
        else candidates = matchRows || [];
      } catch (rpcErr) {
        console.warn("[reports] refresh_matches_for_report after edit failed", rpcErr?.message ?? rpcErr);
      }
    }

    return res.json({
      ok: true,
      report: updated,
      edit: {
        is_critical: isCritical,
        changed_fields: editInfo.changedFields,
        critical_fields: editInfo.criticalChangedFields,
        in_grace_period: inGracePeriod,
        edit_state: publicEditState(updated),
      },
      cleanup,
      candidates,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/**
 * DELETE /reports/:id
 * Slett rapport + best-effort cleanup av bilder, matcher, varsler og samtaledata.
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

    const { data: matches, error: mErr } = await supaAdmin
      .from("matches")
      .select("id")
      .or(`lost_id.eq.${reportId},found_id.eq.${reportId}`);

    if (mErr) return res.status(400).json({ error: mErr.message });

    const matchIds = (matches || []).map((m) => m.id).filter(Boolean);
    const cleanupResults = [];

    // Delete notifications pointing directly to this report.
    await safeDelete(
      supaAdmin.from("notifications").delete().eq("entity_type", "report").eq("entity_id", reportId),
      "notifications:report",
      cleanupResults
    );

    // Delete notifications and related rows pointing to matches/conversations for this report.
    if (matchIds.length > 0) {
      await safeDelete(
        supaAdmin.from("notifications").delete().in("entity_id", matchIds),
        "notifications:matches_or_chat",
        cleanupResults
      );
      await safeDelete(
        supaAdmin.from("payments").delete().in("match_id", matchIds),
        "payments",
        cleanupResults
      );
      await safeDelete(
        supaAdmin.from("messages").delete().in("conversation_id", matchIds),
        "messages",
        cleanupResults
      );
      await safeDelete(
        supaAdmin.from("conversations").delete().in("id", matchIds),
        "conversations",
        cleanupResults
      );
      await safeDelete(
        supaAdmin.from("matches").delete().in("id", matchIds),
        "matches",
        cleanupResults
      );
    }

    const paths = (imgs || []).map((x) => x.path).filter(Boolean);

    await safeDelete(
      supaAdmin.from("report_images").delete().eq("report_id", reportId),
      "report_images",
      cleanupResults
    );

    const { error: dErr } = await supaAdmin
      .from("reports")
      .delete()
      .eq("id", reportId)
      .eq("user_id", user.id);

    if (dErr) return res.status(400).json({ error: dErr.message, cleanupResults });

    const byBucket = new Map();
    for (const p of paths) {
      const [bucket, ...rest] = String(p).split("/");
      const objectPath = rest.join("/");
      if (!bucket || !objectPath) continue;
      if (!byBucket.has(bucket)) byBucket.set(bucket, []);
      byBucket.get(bucket).push(objectPath);
    }

    const storageCleanup = [];
    for (const [bucket, objectPaths] of byBucket.entries()) {
      try {
        const { error: sErr } = await supaAdmin.storage.from(bucket).remove(objectPaths);
        if (sErr) storageCleanup.push({ bucket, ok: false, error: sErr.message });
        else storageCleanup.push({ bucket, ok: true, count: objectPaths.length });
      } catch (e) {
        storageCleanup.push({ bucket, ok: false, error: String(e?.message ?? e) });
      }
    }

    return res.json({
      ok: true,
      deleted: reportId,
      matchCleanupCount: matchIds.length,
      cleanupResults,
      storageCleanup,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/**
 * GET /reports/:id
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

    if (rErr || !report) return res.status(404).json({ error: "Report not found" });

    const { data: images, error: iErr } = await supaAdmin
      .from("report_images")
      .select("id, path, sort_order")
      .eq("report_id", reportId)
      .order("sort_order", { ascending: true });

    if (iErr) return res.status(400).json({ error: iErr.message });
    return res.json({ report, images: images || [] });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

module.exports = router;
