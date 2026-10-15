"use strict";

const fs = require("fs");
const path = require("path");

const routePath = path.join(process.cwd(), "server", "routes", "reportCommerce.js");
if (!fs.existsSync(routePath)) throw new Error("REPORT_COMMERCE_ROUTE_NOT_FOUND");

let source = fs.readFileSync(routePath, "utf8");
const startMarker = "const { data: createdCampaign, error: campaignError } = await supaAdmin";
const endMarker = "order.created_campaign_id = createdCampaign.id;";
const start = source.indexOf(startMarker);
const endStart = source.indexOf(endMarker, start);

if (start < 0 || endStart < 0) {
  throw new Error("GEO_ALERT_CAMPAIGN_CREATION_BLOCK_NOT_FOUND");
}

const end = endStart + endMarker.length;
const originalBlock = source.slice(start, end);
if (!originalBlock.includes('.from("geo_alert_campaigns")')) {
  throw new Error("EXPECTED_GEO_ALERT_CAMPAIGN_INSERT_NOT_FOUND");
}

const replacement = `const { data: createdCampaign, error: campaignError } = await supaAdmin
        .from("geo_alert_campaigns")
        .insert({
          user_id: userId,
          report_id: order.report_id,
          order_id: order.id,
          status: "ACTIVE",
          geometry_type: "CIRCLE",
          geometry: campaignPoint,
          radius_m: Number(g.radiusM || 1500),
          area_sq_km: Number(g.areaSqKm || 0.01),
          population_density_band: String(
            g.populationDensityBand || "LOW",
          ).toUpperCase(),
          estimated_eligible_users: Number(g.estimatedEligibleUsers || 0),
          duration_hours: GEO_ALERT_DURATION_HOURS,
          reminder_count: GEO_ALERT_REMINDER_COUNT,
          price_tier: order.product_code,
          price_snapshot: order.price_snapshot || {},
          starts_at: now.toISOString(),
          ends_at: periodEnd.toISOString(),
          activated_at: now.toISOString(),
        })
        .select("id")
        .single();

      if (campaignError) {
        if (String(campaignError.code || "") === "23505") {
          const { data: existingCampaign, error: existingCampaignError } =
            await supaAdmin
              .from("geo_alert_campaigns")
              .select("id,status,report_id")
              .eq("report_id", order.report_id)
              .maybeSingle();

          if (existingCampaignError || !existingCampaign?.id) {
            console.error("[geo-alert][existing-campaign-load-failed]", {
              orderId: order.id,
              reportId: order.report_id,
              userId,
              errorCode: existingCampaignError?.code || campaignError.code,
              errorMessage: existingCampaignError?.message || campaignError.message,
            });
            return res.status(400).json({ error: "GEO_ALERT_CAMPAIGN_REUSE_FAILED" });
          }

          const { data: reactivatedCampaign, error: reactivationError } =
            await supaAdmin
              .from("geo_alert_campaigns")
              .update({
                order_id: order.id,
                status: "ACTIVE",
                geometry_type: "CIRCLE",
                geometry: campaignPoint,
                radius_m: Number(g.radiusM || 1500),
                area_sq_km: Number(g.areaSqKm || 0.01),
                population_density_band: String(
                  g.populationDensityBand || "LOW",
                ).toUpperCase(),
                estimated_eligible_users: Number(g.estimatedEligibleUsers || 0),
                duration_hours: GEO_ALERT_DURATION_HOURS,
                reminder_count: GEO_ALERT_REMINDER_COUNT,
                price_tier: order.product_code,
                price_snapshot: order.price_snapshot || {},
                starts_at: now.toISOString(),
                ends_at: periodEnd.toISOString(),
                activated_at: now.toISOString(),
                updated_at: now.toISOString(),
              })
              .eq("id", existingCampaign.id)
              .eq("report_id", order.report_id)
              .select("id,status,report_id")
              .single();

          if (reactivationError || !reactivatedCampaign?.id) {
            console.error("[geo-alert][existing-campaign-reactivation-failed]", {
              orderId: order.id,
              reportId: order.report_id,
              userId,
              campaignId: existingCampaign.id,
              errorCode: reactivationError?.code || null,
              errorMessage: reactivationError?.message || "Existing campaign could not be reactivated",
              errorDetails: reactivationError?.details || null,
              errorHint: reactivationError?.hint || null,
            });
            return res.status(400).json({ error: "GEO_ALERT_CAMPAIGN_REACTIVATION_FAILED" });
          }

          order.created_campaign_id = reactivatedCampaign.id;
          console.info("[geo-alert][existing-campaign-reused]", {
            orderId: order.id,
            reportId: order.report_id,
            userId,
            campaignId: reactivatedCampaign.id,
            previousStatus: existingCampaign.status,
            currentStatus: reactivatedCampaign.status,
          });
        } else {
          console.error("[geo-alert][campaign-create-failed]", {
            orderId: order.id,
            reportId: order.report_id,
            userId,
            productCode: order.product_code,
            errorCode: campaignError.code || null,
            errorMessage: campaignError.message || String(campaignError),
            errorDetails: campaignError.details || null,
            errorHint: campaignError.hint || null,
          });
          return res.status(400).json({ error: "GEO_ALERT_CAMPAIGN_CREATE_FAILED" });
        }
      } else {
        order.created_campaign_id = createdCampaign.id;
      }`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(routePath, source, "utf8");

const written = fs.readFileSync(routePath, "utf8");
const verification = [
  'String(campaignError.code || "") === "23505"',
  "[geo-alert][existing-campaign-reused]",
  "order.created_campaign_id = reactivatedCampaign.id",
];
for (const marker of verification) {
  if (!written.includes(marker)) throw new Error(`POST_WRITE_VERIFICATION_FAILED: ${marker}`);
}
console.log("OK: Applied and verified T1.8E.5D v2.");
