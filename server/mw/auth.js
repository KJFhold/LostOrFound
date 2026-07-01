// C:\RN\RepairLostOrFound\server\mw\auth.js
"use strict";

const { supaAdmin } = require("../supabaseClient");

async function requireUser(req, res, next) {
  try {
    const auth = req.header("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) return res.status(401).json({ error: "Missing bearer token" });

    const { data, error } = await supaAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "Invalid token" });

    req.user = data.user;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { requireUser };