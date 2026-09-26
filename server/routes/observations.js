"use strict";
const express = require("express");
const router = express.Router();
const { supaAdmin } = require("../supabaseClient");
const { requireUser } = require("../mw/auth");

function cleanText(value, maxLength) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : null;
}
function validPoint(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}
async function getCampaign(campaignId) {
  const { data, error } = await supaAdmin
    .from("geo_alert_campaigns")
    .select("id,user_id,report_id,status,ends_at,reports(id,user_id,type,status,deleted_at,title)")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}
async function userReceivedCampaign(campaignId, userId) {
  const { data, error } = await supaAdmin
    .from("geo_alert_recipients")
    .select("campaign_id")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

router.post("/", requireUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const campaignId = String(req.body?.campaignId || "").trim();
    const observationType = String(req.body?.observationType || "").trim().toUpperCase();
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    const observedAt = new Date(req.body?.observedAt || Date.now());
    const clientRequestId = String(req.body?.clientRequestId || "").trim();
    if (!campaignId || !clientRequestId) return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
    if (!["SEEN", "FOUND"].includes(observationType)) return res.status(400).json({ error: "INVALID_OBSERVATION_TYPE" });
    if (!validPoint(latitude, longitude)) return res.status(400).json({ error: "INVALID_LOCATION" });
    if (!Number.isFinite(observedAt.getTime())) return res.status(400).json({ error: "INVALID_OBSERVED_AT" });

    const campaign = await getCampaign(campaignId);
    if (!campaign) return res.status(404).json({ error: "AREA_ALERT_NOT_FOUND" });
    const report = campaign.reports;
    if (!report || report.deleted_at || String(report.type).toUpperCase() !== "LOST") return res.status(409).json({ error: "REPORT_NOT_AVAILABLE" });
    if (String(campaign.status).toUpperCase() !== "ACTIVE" || (campaign.ends_at && new Date(campaign.ends_at) <= new Date())) return res.status(409).json({ error: "AREA_ALERT_NOT_ACTIVE" });
    if (report.user_id === userId) return res.status(409).json({ error: "OWNER_CANNOT_OBSERVE_OWN_REPORT" });
    if (!(await userReceivedCampaign(campaignId, userId))) return res.status(403).json({ error: "AREA_ALERT_ACCESS_DENIED" });

    const row = {
      campaign_id: campaignId,
      report_id: campaign.report_id,
      observer_user_id: userId,
      report_owner_user_id: report.user_id,
      observation_type: observationType,
      location: `SRID=4326;POINT(${longitude} ${latitude})`,
      observed_at: observedAt.toISOString(),
      comment: cleanText(req.body?.comment, 1000),
      movement_direction: observationType === "SEEN" ? cleanText(req.body?.movementDirection, 120) : null,
      has_item: observationType === "FOUND" ? Boolean(req.body?.hasItem) : false,
      client_request_id: clientRequestId,
      updated_at: new Date().toISOString(),
    };
    const { data: observation, error: observationError } = await supaAdmin
      .from("area_alert_observations")
      .upsert(row, { onConflict: "observer_user_id,client_request_id" })
      .select("id,campaign_id,report_id,observation_type,observed_at,comment,movement_direction,has_item,status,created_at")
      .single();
    if (observationError) throw observationError;

    const isFound = observationType === "FOUND";
    const title = isFound ? "Mulig funn meldt" : "Ny observasjon meldt";
    const body = isFound
      ? `${report.title || "Gjenstanden"} kan være funnet. Åpne observasjonen for detaljer.`
      : `${report.title || "Gjenstanden"} kan være sett. Åpne observasjonen for detaljer.`;
    const { error: notificationError } = await supaAdmin
      .from("notifications")
      .upsert({
        user_id: report.user_id,
        type: "AREA_ALERT_OBSERVATION",
        entity_type: "observation",
        entity_id: observation.id,
        title,
        body,
        notification_key: `AREA_ALERT_OBSERVATION:${observation.id}`,
      }, { onConflict: "notification_key" });
    if (notificationError) throw notificationError;

    return res.json({ ok: true, observation });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "OBSERVATION_CREATE_FAILED" });
  }
});

router.get("/:id", requireUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id || "").trim();
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
    const { data, error } = await supaAdmin
      .from("area_alert_observations")
      .select("id,campaign_id,report_id,observer_user_id,report_owner_user_id,observation_type,observed_at,comment,movement_direction,has_item,status,created_at,location,reports(id,title,location_label,category,subcategory_key,color,brand)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data || (data.observer_user_id !== userId && data.report_owner_user_id !== userId)) return res.status(404).json({ error: "OBSERVATION_NOT_FOUND" });
    const { data: pointRows, error: pointError } = await supaAdmin.rpc("observation_point", { p_observation_id: id });
    if (pointError) throw pointError;
    const point = Array.isArray(pointRows) ? pointRows[0] : pointRows;
    return res.json({ ok: true, observation: { ...data, latitude: point?.latitude, longitude: point?.longitude } });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "OBSERVATION_LOAD_FAILED" });
  }
});
module.exports = router;
