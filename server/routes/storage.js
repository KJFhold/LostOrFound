// C:\RN\RepairLostOrFound\server\routes\storage.js
"use strict";

const { Router } = require("express");
const { randomUUID } = require("crypto");
const { supaAdmin } = require("../supabaseClient");
const { requireUser } = require("../mw/auth");

const router = Router();
const BUCKET = process.env.BUCKET_REPORT_IMAGES || "report-images";

// POST /storage/signed-upload
// body: { reportId: string(uuid), ext?: "jpg" | "png" ... }
router.post("/signed-upload", requireUser, async (req, res) => {
  try {
    const { reportId, ext = "jpg" } = req.body || {};
    if (!reportId || typeof reportId !== "string") {
      return res.status(400).json({ error: "reportId (uuid) required" });
    }

    // Sjekk at report finnes
    const { data: exists, error: qErr } = await supaAdmin
      .from("reports")
      .select("id")
      .eq("id", reportId)
      .maybeSingle();

    if (qErr) return res.status(400).json({ error: qErr.message });
    if (!exists) return res.status(404).json({ error: "Report not found" });

    const safeExt = String(ext).replace(".", "");
    const fileName = `${randomUUID()}.${safeExt}`;
    const objectPath = `reports/${reportId}/${fileName}`;
    const dbPath = `${BUCKET}/${objectPath}`;

    const { data, error } = await supaAdmin.storage.from(BUCKET).createSignedUploadUrl(objectPath);
    if (error) return res.status(400).json({ error: error.message });

    return res.json({ path: dbPath, signedUrl: data.signedUrl });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

// GET /storage/signed-download?path=bucket/object/path.jpg
router.get("/signed-download", requireUser, async (req, res) => {
  try {
    const p = String(req.query.path || "");
    if (!p.includes("/")) return res.status(400).json({ error: "path required" });

    const [bucket, ...rest] = p.split("/");
    const objectPath = rest.join("/");

    const { data, error } = await supaAdmin.storage.from(bucket).createSignedUrl(objectPath, 60 * 15);
    if (error) return res.status(400).json({ error: error.message });

    return res.json({ url: data.signedUrl });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});



// POST /storage/signed-download-batch
// body: { paths: string[], expiresInSec?: number }
// paths must be in format: "bucket/object/path.jpg" (same as /signed-download?path=...)
router.post("/signed-download-batch", requireUser, async (req, res) => {
  try {
    const { paths, expiresInSec } = req.body || {};

    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ error: "paths[] required" });
    }

    const exp = Number(expiresInSec ?? 60 * 15);
    const ttl = Number.isFinite(exp) ? Math.max(60, Math.min(60 * 60, exp)) : 60 * 15; // 1 min - 1 hour

    // Dedupe + limit
    const uniq = Array.from(
      new Set(paths.map((p) => String(p || "").trim()).filter(Boolean))
    );

    const MAX = Number(process.env.SIGNED_URL_BATCH_MAX || 60);
    if (uniq.length > MAX) {
      return res.status(400).json({ error: `Too many paths (max ${MAX})` });
    }

    const urls = {};
    const errors = {};

    await Promise.all(
      uniq.map(async (p) => {
        try {
          if (!p.includes("/")) {
            errors[p] = "Invalid path";
            return;
          }
          const [bucket, ...rest] = p.split("/");
          const objectPath = rest.join("/");
          if (!bucket || !objectPath) {
            errors[p] = "Invalid path";
            return;
          }

          const { data, error } = await supaAdmin.storage
            .from(bucket)
            .createSignedUrl(objectPath, ttl);

          if (error) {
            errors[p] = error.message;
            return;
          }
          if (data?.signedUrl) urls[p] = data.signedUrl;
        } catch (e) {
          errors[p] = e?.message ?? "Sign error";
        }
      })
    );

    return res.json({ urls, errors, ttl });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});
module.exports = router;
