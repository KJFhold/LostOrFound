// server/routes/notifications.js
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

async function userOwnsMatch(matchId, userId) {
  const { data, error } = await supaAdmin
    .from("matches")
    .select("id, lost:lost_id ( user_id ), found:found_id ( user_id )")
    .eq("id", matchId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const owns = data?.lost?.user_id === userId || data?.found?.user_id === userId;
  return owns ? { ok: true, kind: "match", id: matchId } : null;
}

async function userOwnsReport(reportId, userId) {
  const { data, error } = await supaAdmin
    .from("reports")
    .select("id")
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ok: true, kind: "report", id: reportId };
}

async function resolveNotificationTarget(notification, userId) {
  const entityType = String(notification?.entity_type || "").toLowerCase();
  const entityId = String(notification?.entity_id || "");
  const type = String(notification?.type || "").toUpperCase();

  if (!entityId) {
    return { ok: false, reason: "TARGET_NOT_FOUND", kind: entityType || "unknown", id: entityId || null };
  }

  // Messages/chats in this app use match/conversation id as deep link target to /chat/:id.
  if (type === "NEW_MESSAGE" || entityType === "chat" || entityType === "match") {
    const matchTarget = await userOwnsMatch(entityId, userId);
    if (!matchTarget) {
      return { ok: false, reason: "TARGET_NOT_FOUND", kind: type === "NEW_MESSAGE" ? "chat" : "match", id: entityId };
    }
    return type === "NEW_MESSAGE"
      ? { ok: true, kind: "chat", id: entityId }
      : { ok: true, kind: "match", id: entityId };
  }

  if (entityType === "report") {
    const reportTarget = await userOwnsReport(entityId, userId);
    if (!reportTarget) {
      return { ok: false, reason: "TARGET_NOT_FOUND", kind: "report", id: entityId };
    }
    return { ok: true, kind: "report", id: entityId };
  }

  // Fallback: treat unknown entity types as missing rather than navigating blindly.
  return { ok: false, reason: "UNSUPPORTED_TARGET", kind: entityType || "unknown", id: entityId };
}

// GET /notifications?limit=50
router.get("/", requireUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50)));
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { data, error } = await supaAdmin
      .from("notifications")
      .select("id, user_id, type, entity_type, entity_id, title, body, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return res.status(400).json({ error: error.message });

    const notifications = await Promise.all(
      (data || []).map(async (n) => {
        try {
          const target = await resolveNotificationTarget(n, userId);
          return {
            ...n,
            target_status: target.ok ? "ok" : "missing",
            target_kind: target.kind,
          };
        } catch (e) {
          return {
            ...n,
            target_status: "missing",
            target_kind: String(n?.entity_type || "unknown"),
          };
        }
      })
    );

    return res.json({ notifications });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

// GET /notifications/:id/resolve
router.get("/:id/resolve", requireUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id || "");
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!id) return res.status(400).json({ error: "id required" });

    const { data, error } = await supaAdmin
      .from("notifications")
      .select("id, user_id, type, entity_type, entity_id, title, body, created_at, read_at")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Not found" });

    const target = await resolveNotificationTarget(data, userId);
    if (!target.ok) {
      return res.json({
        ok: false,
        reason: target.reason,
        target_kind: target.kind,
        target_id: target.id,
      });
    }

    return res.json({
      ok: true,
      target_kind: target.kind,
      target_id: target.id,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

// GET /notifications/unread-count
router.get("/unread-count", requireUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { count, error } = await supaAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ count: count || 0 });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

// POST /notifications/:id/read
router.post("/:id/read", requireUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id || "");
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!id) return res.status(400).json({ error: "id required" });

    const { data, error } = await supaAdmin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id, read_at")
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, id: data.id, read_at: data.read_at });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

// POST /notifications/read-all
router.post("/read-all", requireUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { error } = await supaAdmin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

module.exports = router;
