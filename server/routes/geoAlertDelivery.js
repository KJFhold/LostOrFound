"use strict";
const express = require("express");
const router = express.Router();
const { supaAdmin } = require("../supabaseClient");
const { requireUser } = require("../mw/auth");

const testUsers = () => new Set(String(process.env.GEO_ALERT_TEST_USER_IDS || "").split(",").map(x => x.trim()).filter(Boolean));
const testEnabled = () => String(process.env.GEO_ALERT_TEST_MODE || "").toLowerCase() === "true";

async function ownedCampaign(campaignId, userId) {
  const { data, error } = await supaAdmin.from("geo_alert_campaigns")
    .select("id,user_id,report_id,status,starts_at,ends_at")
    .eq("id", campaignId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

router.get("/:campaignId/estimate", requireUser, async (req, res) => {
  try {
    const campaign = await ownedCampaign(String(req.params.campaignId), req.user.id);
    if (!campaign) return res.status(404).json({ error: "CAMPAIGN_NOT_FOUND" });
    const { data, error } = await supaAdmin.rpc("refresh_geo_alert_estimate", { p_campaign_id: campaign.id });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return res.json({ ok: true, campaignId: campaign.id, eligibleUsers: row?.eligible_users || 0, eligibleInstallations: row?.eligible_installations || 0 });
  } catch (e) { return res.status(500).json({ error: e?.message || "ESTIMATE_FAILED" }); }
});

router.post("/:campaignId/test-dispatch", requireUser, async (req, res) => {
  try {
    if (!testEnabled() || !testUsers().has(req.user.id)) return res.status(403).json({ error: "GEO_ALERT_TEST_NOT_ALLOWED" });
    const campaign = await ownedCampaign(String(req.params.campaignId), req.user.id);
    if (!campaign) return res.status(404).json({ error: "CAMPAIGN_NOT_FOUND" });
    const { data: dispatchable, error: dErr } = await supaAdmin.rpc("geo_alert_campaign_is_dispatchable", { p_campaign_id: campaign.id });
    if (dErr) throw dErr;
    if (!dispatchable) return res.status(409).json({ error: "CAMPAIGN_NOT_DISPATCHABLE" });

    const { data: candidates, error } = await supaAdmin.rpc("geo_alert_eligible_installations", { p_campaign_id: campaign.id });
    if (error) throw error;
    const notificationKey = `GEO_ALERT:${campaign.id}`;
    const accepted = [];
    for (const candidate of candidates || []) {
      const { data: recipient, error: insertErr } = await supaAdmin.from("geo_alert_recipients").upsert({
        campaign_id: campaign.id,
        user_id: candidate.recipient_user_id,
        installation_id: candidate.installation_id,
        expo_push_token: candidate.expo_push_token,
        watch_area_id: candidate.watch_area_id,
        category_key: candidate.category_key,
        status: "QUEUED",
        updated_at: new Date().toISOString(),
      }, { onConflict: "campaign_id,installation_id", ignoreDuplicates: true }).select("id").maybeSingle();
      if (insertErr) throw insertErr;
      if (recipient) accepted.push({ ...candidate, recipientRowId: recipient.id });
    }

    if (!accepted.length) return res.json({ ok: true, sent: 0, skippedAsDuplicate: (candidates || []).length });

    const messages = accepted.map(x => ({
      to: x.expo_push_token,
      sound: "default",
      title: x.language === "en" ? "Lost item in your area" : "Mistet gjenstand i området ditt",
      body: x.language === "en" ? `${x.report_title || "An item"} was reported lost near an area you follow.` : `${x.report_title || "En gjenstand"} er meldt mistet nær et område du følger.`,
      data: { type: "GEO_ALERT", targetKind: "report", targetId: x.report_id, section: "active", campaignId: campaign.id, notificationKey },
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Accept-Encoding": "gzip, deflate", "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ error: "EXPO_PUSH_SEND_FAILED", details: body });
    const tickets = Array.isArray(body?.data) ? body.data : [body?.data].filter(Boolean);

    for (let i = 0; i < accepted.length; i++) {
      const x = accepted[i]; const ticket = tickets[i] || {};
      const status = ticket.status === "ok" ? "TICKET_OK" : "TICKET_ERROR";
      await supaAdmin.from("geo_alert_recipients").update({ status, updated_at: new Date().toISOString() }).eq("id", x.recipientRowId);
      await supaAdmin.from("push_delivery_log").insert({
        user_id: x.recipient_user_id,
        installation_id: x.installation_id,
        expo_push_token: x.expo_push_token,
        notification_type: "GEO_ALERT",
        notification_key: notificationKey,
        campaign_id: campaign.id,
        expo_ticket_id: ticket.id || null,
        status,
        error_code: ticket?.details?.error || null,
        error_message: ticket?.message || null,
        payload: messages[i],
        updated_at: new Date().toISOString(),
      });
    }
    return res.json({ ok: true, eligible: (candidates || []).length, sent: accepted.length, skippedAsDuplicate: (candidates || []).length - accepted.length, tickets });
  } catch (e) { return res.status(500).json({ error: e?.message || "GEO_ALERT_TEST_DISPATCH_FAILED" }); }
});

router.post("/receipts/check", requireUser, async (req, res) => {
  try {
    if (!testEnabled() || !testUsers().has(req.user.id)) return res.status(403).json({ error: "GEO_ALERT_TEST_NOT_ALLOWED" });
    const { data: logs, error } = await supaAdmin.from("push_delivery_log")
      .select("id,expo_ticket_id,expo_push_token,campaign_id")
      .eq("status", "TICKET_OK").is("receipt_checked_at", null).not("expo_ticket_id", "is", null).limit(300);
    if (error) throw error;
    if (!logs?.length) return res.json({ ok: true, checked: 0 });
    const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ ids: logs.map(x => x.expo_ticket_id) }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ error: "EXPO_RECEIPT_FAILED", details: body });
    let disabled = 0;
    for (const log of logs) {
      const receipt = body?.data?.[log.expo_ticket_id];
      if (!receipt) continue;
      const errorCode = receipt?.details?.error || null;
      const delivered = receipt.status === "ok";
      await supaAdmin.from("push_delivery_log").update({
        receipt_status: delivered ? "DELIVERED" : "ERROR",
        receipt_checked_at: new Date().toISOString(),
        status: delivered ? "DELIVERED" : "RECEIPT_ERROR",
        error_code: errorCode,
        error_message: receipt?.message || null,
        updated_at: new Date().toISOString(),
      }).eq("id", log.id);
      if (errorCode === "DeviceNotRegistered") {
        disabled++;
        await supaAdmin.from("push_installations").update({ active:false, disabled_at:new Date().toISOString(), disabled_reason:"DEVICE_NOT_REGISTERED", updated_at:new Date().toISOString() }).eq("expo_push_token", log.expo_push_token);
      }
      if (log.campaign_id) await supaAdmin.from("geo_alert_recipients").update({ status: delivered ? "DELIVERED" : "RECEIPT_ERROR", updated_at:new Date().toISOString() }).eq("campaign_id", log.campaign_id).eq("expo_push_token", log.expo_push_token);
    }
    return res.json({ ok:true, checked:logs.length, disabledTokens:disabled });
  } catch (e) { return res.status(500).json({ error:e?.message || "RECEIPT_CHECK_FAILED" }); }
});

module.exports = router;
