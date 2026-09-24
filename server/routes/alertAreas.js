"use strict";
const express = require("express");
const router = express.Router();
const { supaAdmin } = require("../supabaseClient");
const { requireUser } = require("../mw/auth");

const RADII = new Set([250, 500, 1000, 3000, 5000, 10000]);
const cleanCategories = (value) => Array.isArray(value)
  ? [...new Set(value.map(x => String(x || "").trim().toUpperCase()).filter(Boolean))].slice(0, 30)
  : [];

router.get("/", requireUser, async (req, res) => {
  try {
    const { data, error } = await supaAdmin.rpc("get_user_watch_areas", { p_user_id: req.user.id });
    if (error) throw error;
    return res.json({ areas: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "WATCH_AREAS_LOAD_FAILED" });
  }
});

router.post("/", requireUser, async (req, res) => {
  try {
    const countResult = await supaAdmin.from("notification_watch_areas").select("id", { count: "exact", head: true }).eq("user_id", req.user.id);
    if (countResult.error) throw countResult.error;
    if ((countResult.count || 0) >= 3) return res.status(409).json({ error: "WATCH_AREA_LIMIT_REACHED" });
    const name = String(req.body?.name || "").trim().slice(0, 80);
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    const radiusM = Number(req.body?.radiusM);
    if (!name) return res.status(400).json({ error: "NAME_REQUIRED" });
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return res.status(400).json({ error: "INVALID_COORDINATES" });
    if (!RADII.has(radiusM)) return res.status(400).json({ error: "INVALID_RADIUS" });
    const categories = cleanCategories(req.body?.categoryKeys);
    const allCategories = req.body?.allCategories !== false;
    const { data, error } = await supaAdmin.rpc("create_user_watch_area", {
      p_user_id: req.user.id, p_name: name, p_lat: latitude, p_lng: longitude, p_radius_m: radiusM,
      p_category_keys: categories, p_all_categories: allCategories, p_push_enabled: req.body?.pushEnabled !== false,
    });
    if (error) throw error;
    return res.status(201).json({ area: Array.isArray(data) ? data[0] : data });
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("WATCH_AREA_LIMIT_REACHED")) return res.status(409).json({ error: "WATCH_AREA_LIMIT_REACHED" });
    return res.status(500).json({ error: msg || "WATCH_AREA_CREATE_FAILED" });
  }
});

router.patch("/:id", requireUser, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const patch = {};
    if (req.body?.name != null) patch.name = String(req.body.name).trim().slice(0, 80);
    if (req.body?.radiusM != null) { const r = Number(req.body.radiusM); if (!RADII.has(r)) return res.status(400).json({ error: "INVALID_RADIUS" }); patch.radius_m = r; }
    if (req.body?.categoryKeys != null) patch.category_keys = cleanCategories(req.body.categoryKeys);
    if (req.body?.allCategories != null) patch.all_categories = !!req.body.allCategories;
    if (req.body?.pushEnabled != null) patch.push_enabled = !!req.body.pushEnabled;
    if (req.body?.active != null) patch.active = !!req.body.active;
    patch.updated_at = new Date().toISOString();
    const { data, error } = await supaAdmin.from("notification_watch_areas").update(patch).eq("id", id).eq("user_id", req.user.id).select("id,name,radius_m,category_keys,all_categories,push_enabled,active,created_at,updated_at").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json({ area: data });
  } catch (e) { return res.status(500).json({ error: e?.message || "WATCH_AREA_UPDATE_FAILED" }); }
});

router.delete("/:id", requireUser, async (req, res) => {
  try {
    const { data, error } = await supaAdmin.from("notification_watch_areas").delete().eq("id", String(req.params.id || "")).eq("user_id", req.user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json({ ok: true });
  } catch (e) { return res.status(500).json({ error: e?.message || "WATCH_AREA_DELETE_FAILED" }); }
});

module.exports = router;
