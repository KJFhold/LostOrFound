// server/routes/reportImages.js
"use strict";

const { Router } = require("express");
const { supaAdmin } = require("../supabaseClient");
const { requireUser } = require("../mw/auth");

const router = Router();

// POST /reports/:id/images
router.post("/:id/images", requireUser, async (req, res) => {
  try {
    const user = req.user;
    const reportId = req.params.id;
    const { path, sort_order = 0 } = req.body || {};

    if (!path || typeof path !== "string") {
      return res.status(400).json({ error: "path required" });
    }

    // Sikkerhet: sjekk at rapporten eies av bruker
    const { data: report, error: rErr } = await supaAdmin
      .from("reports")
      .select("id")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (rErr || !report) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const { data, error } = await supaAdmin
  .from("report_images")
  .insert({
    report_id: reportId,
    path,
    sort_order,
    created_by: user.id, // ✅ SETTES SERVER-SIDE
  })
  .select()
  .single();
``

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ image: data });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

module.exports = router;